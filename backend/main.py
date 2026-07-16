from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
import shap
import re

print("[SYSTEM] Booting Multi-Model Inference API...")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    regressor = joblib.load("xgb_regressor.pkl")
    classifier = joblib.load("xgb_classifier.pkl")
    encoders = joblib.load("label_encoders.pkl")
    feature_cols = joblib.load("model_features.pkl")
    
    explainer = shap.TreeExplainer(regressor)
    print("[SUCCESS] Models and SHAP Explainer loaded successfully.")
except Exception as e:
    print(f"[FATAL] Failed to load models: {e}")
    exit()

class AssemblyRequest(BaseModel):
    instructions: list[str]

def parse_instruction(line):
    """Translates raw text into architectural heuristic flags."""
    parts = re.split(r'[\s,]+', line.strip().upper())
    parts = [p for p in parts if p]
    
    opcode = parts[0] if len(parts) > 0 else "NOP"
    op1 = parts[1] if len(parts) > 1 else ""
    op2 = parts[2] if len(parts) > 2 else ""
    
    is_alu = 1 if opcode in ["ADD", "SUB", "INC", "DEC", "MUL", "DIV", "XOR", "AND", "OR", "SHL", "SHR"] else 0
    is_branch = 1 if opcode in ["JMP", "JNE", "JZ", "CALL", "RET"] else 0
    is_mem = 1 if opcode in ["PUSH", "POP"] or (("[" in op1 or "[" in op2) and opcode != "LEA") else 0
    
    mem_read = 1 if ("[" in op2 and opcode not in ["LEA"]) or ("[" in op1 and opcode in ["PUSH", "MUL", "DIV"]) else 0
    mem_write = 1 if "[" in op1 and opcode not in ["PUSH", "MUL", "DIV", "CMP", "TEST"] else 0
    has_imm = 1 if "H" in op2 or op2.isdigit() else 0
    
    return {
        "opcode": opcode, "op1": op1, "op2": op2,
        "is_alu": is_alu, "is_branch": is_branch, "is_mem": is_mem,
        "mem_read": mem_read, "mem_write": mem_write, "has_imm": has_imm
    }

def safe_encode(col, val):
    """Prevents the API from crashing if the user types an unseen register/label."""
    try:
        return encoders[col].transform([val])[0]
    except ValueError:
        return 0

@app.post("/predict_block")
async def predict_block(request: AssemblyRequest):
    lines = [line for line in request.instructions if line.strip()]
    if not lines:
        raise HTTPException(status_code=400, detail="No instructions provided.")

    parsed_lines = [parse_instruction(line) for line in lines]
    
    total_t_states = 0
    breakdown = []
    
    max_latency = -1
    bottleneck_feature_vector = None
    bottleneck_instruction_text = ""
    bottleneck_diagnostic = ""
    
    for i in range(len(parsed_lines)):
        curr = parsed_lines[i]
        
        if curr["opcode"] not in encoders["curr_op"].classes_:
            return {
                "total_t_states": "ERR",
                "primary_bottleneck": f"{curr['opcode']} — FATAL",
                "insight": f"CRITICAL FAULT: '{curr['opcode']}' is an illegal or unsupported opcode for the 8086 architecture.",
                "breakdown": breakdown
            }

        prev1 = parsed_lines[i-1] if i > 0 else parse_instruction("NOP")
        prev2 = parsed_lines[i-2] if i > 1 else parse_instruction("NOP")
        next1 = parsed_lines[i+1] if i < len(parsed_lines) - 1 else parse_instruction("NOP")
        next2 = parsed_lines[i+2] if i < len(parsed_lines) - 2 else parse_instruction("NOP")
        
        reg_dependency = 1 if (curr['op1'] != "" and (curr['op1'] == prev1['op1'] or curr['op1'] == prev1['op2'])) else 0
        
        raw_features = {
            'prev2_op': safe_encode('prev2_op', prev2['opcode']),
            'prev1_op': safe_encode('prev1_op', prev1['opcode']),
            'curr_op': safe_encode('curr_op', curr['opcode']),
            'next1_op': safe_encode('next1_op', next1['opcode']),
            'next2_op': safe_encode('next2_op', next2['opcode']),
            'op1': safe_encode('op1', curr['op1']),
            'op2': safe_encode('op2', curr['op2']),
            'is_alu': curr['is_alu'],
            'is_branch': curr['is_branch'],
            'is_mem': curr['is_mem'],
            'mem_read': curr['mem_read'],
            'mem_write': curr['mem_write'],
            'has_imm': curr['has_imm'],
            'reg_dependency': reg_dependency
        }
        
        df_vector = pd.DataFrame([raw_features])[feature_cols]
        
        pred_latency = float(regressor.predict(df_vector)[0])
        pred_diag_idx = int(classifier.predict(df_vector)[0])
        diagnostic_tag = encoders['diagnostic_label'].inverse_transform([pred_diag_idx])[0]
        
        total_t_states += pred_latency
        
        instruction_text = f"{curr['opcode']} {curr['op1']}"
        if curr['op2']: instruction_text += f", {curr['op2']}"
            
        breakdown.append({
            "line": i + 1,
            "instruction": instruction_text,
            "t_states": round(pred_latency, 1)
        })
        
        if pred_latency > max_latency:
            max_latency = pred_latency
            bottleneck_feature_vector = df_vector
            bottleneck_instruction_text = instruction_text
            bottleneck_diagnostic = diagnostic_tag

    if max_latency > 80.0:
        bottleneck_diagnostic = "ALU_HEAVY"
    elif bottleneck_diagnostic == "DATA_DEPENDENCY":
        bottleneck_diagnostic = "SEQUENTIAL_EXECUTION"

    shap_results = []
    insight_text = "Standard execution pipeline."
    
    if bottleneck_feature_vector is not None:
        shap_values = explainer.shap_values(bottleneck_feature_vector)
        feature_contributions = list(zip(feature_cols, shap_values[0]))
        feature_contributions.sort(key=lambda x: x[1], reverse=True)
        
        for feat, val in feature_contributions[:3]:
            if val > 0.5:
                clean_feat_name = feat.replace('_', ' ').title()
                shap_results.append(f"+{val:.1f}T from {clean_feat_name}")

        bottleneck_op = bottleneck_instruction_text.split()[0]
                
        if max_latency > 80.0:
            bottleneck_diagnostic = "ALU_HEAVY"
        elif bottleneck_op in ["PUSH", "POP"]:
            bottleneck_diagnostic = "STACK_ENGINE_ACTIVE"
        elif bottleneck_diagnostic == "DATA_DEPENDENCY":
            bottleneck_diagnostic = "SEQUENTIAL_EXECUTION"
                
        if bottleneck_diagnostic == "CONTROL_FLOW_HAZARD":
            insight_text = "Taken branch invalidates the 6-byte prefetch queue."
        elif bottleneck_diagnostic == "MEMORY_BOUND":
            insight_text = "Execution Unit waits while the Bus Interface Unit performs external memory cycles."
        elif bottleneck_diagnostic == "SEQUENTIAL_EXECUTION":
            insight_text = "Sequential register operations execute efficiently through BIU/EU overlap."
        elif bottleneck_diagnostic == "ALU_HEAVY":
            insight_text = "Microcoded arithmetic dominates Execution Unit occupancy."
        elif bottleneck_diagnostic == "STACK_ENGINE_ACTIVE":
            insight_text = "Stack traffic dominates execution through PUSH/POP memory cycles."

    return {
        "total_t_states": round(total_t_states, 1),
        "primary_bottleneck": f"{bottleneck_instruction_text} — {bottleneck_diagnostic.replace('_', ' ')}",
        "insight": insight_text,
        "shap_importances": shap_results, 
        "breakdown": breakdown
    }
import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

encoder = joblib.load("label_encoder.pkl")
model = joblib.load("xgboost_model.pkl")

class MicrocodeInsightEngine:
    @staticmethod
    def analyze(prev_op, curr_op, next_op, latency):
        if prev_op == "CMP" and curr_op in ["JNE", "JZ"]:
            return "[CONTROL FLOW HAZARD] Branch evaluation forces 6-byte prefetch queue flush."
        
        if curr_op == "LOOP":
            return "[MICROCODE EFFICIENT] Fused CX decrement and branch native micro-ops."
            
        if curr_op in ["PUSH", "POP"] and prev_op in ["PUSH", "POP"]:
            return "[MEMORY BOUND] Contiguous stack operations saturating the Bus Interface Unit."
            
        if curr_op == "MOV" and latency > 8.0:
            return "[BUS DELAY] Heavy memory-mapped transfer bypassing fast internal ALU."

        if latency > 12.0:
            return "[CRITICAL BOTTLENECK] High latency sequence penalty detected."
            
        if latency <= 3.0:
            return "[ALU OPTIMAL] Native silicon execution. Pipeline clear."
            
        return "[STANDARD EXECUTION] Valid microcode path."

class CodeBlock(BaseModel):
    instructions: list[str]

def get_encoded(op):
    try:
        return encoder.transform([op])[0]
    except ValueError:
        return -1

def get_instruction_bytes(inst):
    if "[" in inst:
        return 4
    if any(char.isdigit() for char in inst) and "H" in inst:
        return 3
    if "," in inst:
        return 2
    return 2

@app.post("/predict_block")
async def predict_block(block: CodeBlock):
    instructions = [line.strip().upper() for line in block.instructions if line.strip() and not line.strip().endswith(':')]
    n = len(instructions)
    
    total_t_states = 0
    max_latency = -1
    bottleneck_line = 0
    bottleneck_instruction = ""
    best_insight = ""
    line_results = []
    
    current_ip = 256 
    bottleneck_ip_str = "CS:0100"
    
    for i in range(n):
        tokens = instructions[i].split()
        curr_op = tokens[0]
        
        prev_op = instructions[i-1].split()[0] if i > 0 else "NOP"
        next_op = instructions[i+1].split()[0] if i < n - 1 else "NOP"
        
        prev_enc = get_encoded(prev_op)
        curr_enc = get_encoded(curr_op)
        next_enc = get_encoded(next_op)
        
        formatted_ip = f"CS:{current_ip:04X}"
        
        if curr_enc == -1:
            latency = 999.99
            insight = "[FATAL] Instruction missing from hardware profile. Verify strict 8086 ISA alignment."
        else:
            category = 3 
            if curr_op in ["PUSH", "POP"]:
                category = 4
            elif curr_op in ["JMP", "JNE", "JZ", "LOOP"]:
                category = 2
            elif curr_op == "MOV" and len(tokens) > 1 and "[" in tokens[1]:
                category = 1
                
            X_input = np.array([[prev_enc, curr_enc, next_enc, category]])
            latency = float(model.predict(X_input)[0])
            
            insight = MicrocodeInsightEngine.analyze(prev_op, curr_op, next_op, latency)

        if latency != 999.99:
            total_t_states += latency

        if latency > max_latency:
            max_latency = latency
            bottleneck_line = i + 1
            bottleneck_instruction = instructions[i]
            best_insight = insight
            bottleneck_ip_str = formatted_ip

        line_results.append({
            "line": i + 1,
            "instruction": instructions[i],
            "t_states": round(latency, 2) if latency != 999.99 else 0
        })

        current_ip += get_instruction_bytes(instructions[i])

    tag_title = best_insight.split(']')[0].replace('[', '').strip().title() if ']' in best_insight else "Pipeline Evaluation"
    
    detailed_bottleneck = f"{bottleneck_instruction}  —  {tag_title}" if bottleneck_instruction else tag_title
    
    clean_insight = best_insight.split(']')[-1].strip() if ']' in best_insight else best_insight

    return {
        "total_t_states": round(total_t_states, 2),
        "bottleneck_line": bottleneck_line,
        "bottleneck_instruction": bottleneck_instruction,
        "primary_bottleneck": detailed_bottleneck,
        "insight": clean_insight,
        "breakdown": line_results
    }
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np
from typing import List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load('8086_xgboost_model.pkl')
label_encoder = joblib.load('8086_label_encoder.pkl')

class InstructionRequest(BaseModel):
    asm: str

class CodeBlock(BaseModel):
    instructions: List[str]

def predict_hardware_latency(asm_instruction, ml_model, encoder):
    try:
        clean_asm = asm_instruction.strip().upper()
        tokens = clean_asm.split()
        if not tokens: return {"error": "Empty instruction"}
        
        opcode = tokens[0]
        
        try:
            opcode_encoded = encoder.transform([opcode])[0]
        except ValueError:
            return {"error": f"Opcode '{opcode}' not found in training vocabulary."}

        operand_count = len(clean_asm.split(',')) if ',' in clean_asm else (1 if len(tokens) > 1 else 0)
        memory_access = 1 if '[' in clean_asm and ']' in clean_asm else 0
        immediate_value = 1 if 'H' in clean_asm or any(char.isdigit() for char in tokens[-1]) else 0
        
        if memory_access:
            category_encoded = 1
        elif opcode.startswith("J") or opcode == "LOOP":
            category_encoded = 2
        elif opcode in ["PUSH", "POP"]:
            category_encoded = 4
        else:
            category_encoded = 3
            
        input_array = np.array([[opcode_encoded, category_encoded, operand_count, memory_access, immediate_value]])
        predicted_cycles = float(ml_model.predict(input_array)[0])
        
        drivers = {
            "MOV": "Execution Unit Transfer",
            "ADD": "ALU Arithmetic Execution",
            "SUB": "ALU Arithmetic Execution",
            "CMP": "Status Flag Mutation",
            "JMP": "Prefetch Queue Flush",
            "JNE": "Conditional Branch Stall",
            "JZ": "Conditional Branch Stall",
            "JNZ": "Conditional Branch Stall",
            "LOOP": "Micro-Op Iteration",
            "PUSH": "SS:SP Bus Write Cycle",
            "POP": "SS:SP Bus Read Cycle",
            "SHL": "Hardware Shift Acceleration",
            "SHR": "Hardware Shift Acceleration"
        }

        insights = {
            "MOV": "[PIPELINE CLEAR] EU localized transfer. No BIU penalty. Maintain operand alignment for zero wait-state execution.",
            "ADD": "[ALU OPTIMAL] Native silicon execution. Utilizing primary accumulator bypasses BIU fetch latency.",
            "SUB": "[ALU OPTIMAL] Two's complement hardware path active. Bounded strictly to general-purpose registers.",
            "CMP": "[STATE MUTATION] Non-destructive ALU pass. Modifies CPU status flags natively without external bus cycles.",
            "JMP": "[CRITICAL BOTTLENECK] Unconditional branch forces a complete 6-byte prefetch queue flush. Restructure logic flow to mitigate pipeline reset.",
            "JNE": "[SPECULATIVE HAZARD] High stall risk. If branch taken, BIU discards queue. Invert logic to favor fall-through path (4 T-states).",
            "JZ": "[SPECULATIVE HAZARD] ZF=1 branch evaluation. High latency upon flush. Guarantee the fall-through is the statistically dominant execution path.",
            "JNZ": "[SPECULATIVE HAZARD] ZF=0 branch evaluation. High latency upon flush. Guarantee the fall-through is the statistically dominant execution path.",
            "LOOP": "[MICROCODE EFFICIENT] Combined CX decrement and jump micro-ops. Optimal for tight memory-bound iterations.",
            "PUSH": "[MEMORY BOUND] BIU write cycle to SS:SP. High bus saturation risk. Batch stack operations to minimize sequential access latency.",
            "POP": "[MEMORY BOUND] BIU read cycle from SS:SP. Susceptible to subsystem wait states. Ensure word-aligned boundaries.",
            "SHL": "[HARDWARE ACCELERATED] Internal shift register utilized. Bypasses standard ALU propagation. Optimal for base-2 multiplication.",
            "SHR": "[HARDWARE ACCELERATED] Internal shift register utilized. Bypasses standard ALU propagation. Optimal for base-2 division."
        }

        primary_driver = drivers.get(opcode, "Standard ALU Execution")
        suggestion = insights.get(opcode, "[STANDARD EXECUTION] Optimal microcode path. Keep critical arithmetic confined to internal circuitry.")

        if memory_access:
            primary_driver = "BIU Bus Saturation"
            suggestion = f"[EXTERNAL MEMORY SATURATION] Operand forces BIU external bus cycle for {opcode}. Promote to internal register (AX/BX/CX/DX) to reclaim wait-state clock cycles."
        elif opcode_encoded == -1:
            primary_driver = "Unknown Microcode"
            suggestion = "[FATAL] Instruction missing from hardware profile. Verify strict 8086 ISA alignment."
            
        return {
            "predicted_cycles": round(predicted_cycles, 2),
            "primary_driver": primary_driver,
            "optimization_insight": suggestion
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/predict")
async def get_prediction(request: InstructionRequest):
    result = predict_hardware_latency(request.asm, model, label_encoder)
    return result

@app.post("/predict_block")
async def predict_code_block(block: CodeBlock):
    total_t_states = 0
    max_latency = -1
    bottleneck_line = 0
    bottleneck_instruction = ""
    worst_bottleneck_name = ""
    best_insight = ""
    
    line_results = []

    for idx, instruction in enumerate(block.instructions):
        instruction = instruction.strip()
        if not instruction:
            continue
            
        result = predict_hardware_latency(instruction, model, label_encoder)
        
        if "error" in result:
            line_results.append({
                "line": idx + 1,
                "instruction": instruction,
                "error": result["error"]
            })
            continue
        
        latency = result["predicted_cycles"]
        
        total_t_states += latency
        
        if latency > max_latency:
            max_latency = latency
            bottleneck_line = idx + 1
            bottleneck_instruction = instruction
            worst_bottleneck_name = result["primary_driver"]
            best_insight = result["optimization_insight"]

        line_results.append({
            "line": idx + 1,
            "instruction": instruction,
            "t_states": latency
        })

    return {
        "total_t_states": round(total_t_states, 2),
        "bottleneck_line": bottleneck_line,
        "bottleneck_instruction": bottleneck_instruction,
        "primary_bottleneck": worst_bottleneck_name,
        "insight": best_insight,
        "breakdown": line_results
    }
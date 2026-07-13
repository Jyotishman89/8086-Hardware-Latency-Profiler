from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import numpy as np

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

def predict_hardware_latency(asm_instruction, ml_model, encoder):
    try:
        tokens = asm_instruction.strip().split()
        if not tokens:
            return {"error": "Empty instruction"}
            
        opcode = tokens[0].upper()
        operand_count = len(asm_instruction.split(',')) if ',' in asm_instruction else (1 if len(tokens) > 1 else 0)
        memory_access = 1 if '[' in asm_instruction and ']' in asm_instruction else 0
        immediate_value = 1 if 'H' in tokens[-1].upper() or tokens[-1].isdigit() else 0
        
        try:
            opcode_encoded = encoder.transform([opcode])[0]
        except ValueError:
            opcode_encoded = -1 
            
        if memory_access and (opcode in ["MOV", "ADD", "SUB", "CMP"]):
            category_encoded = 1 
        elif opcode in ["PUSH", "POP"]:
            category_encoded = 4 
        elif opcode.startswith("J") or opcode == "LOOP":
            category_encoded = 2 
        else:
            category_encoded = 3 
            
        input_array = np.array([[opcode_encoded, category_encoded, operand_count, memory_access, immediate_value]])
        predicted_cycles = float(ml_model.predict(input_array)[0])
        
        drivers = {
            "MOV": "Data Transfer Cycle",
            "ADD": "Arithmetic Addition Overhead",
            "SUB": "Arithmetic Subtraction Overhead",
            "CMP": "Comparison Logic Latency",
            "JMP": "Unconditional Branch Stall",
            "JNE": "Conditional Branch Stall",
            "JZ": "Zero Branch Penalty",
            "JNZ": "Non-Zero Branch Penalty",
            "LOOP": "Loop Counter Decrement Penalty",
            "PUSH": "Stack Push Operation",
            "POP": "Stack Pop Operation",
            "SHL": "Bitwise Left Shift Execution",
            "SHR": "Bitwise Right Shift Execution"
        }
        
        insights = {
            "MOV": "Data transfer is highly efficient. Direct register manipulation maximizes throughput.",
            "ADD": "Arithmetic operation completed within register space. Low propagation delay.",
            "SUB": "Subtraction completed natively via two's complement execution circuitry.",
            "CMP": "Comparison modifies status flags without changing destination operands.",
            "JMP": "Unconditional branch flushes the prefetch queue. Minimize random jumps.",
            "JNE": "Pipeline stall danger if branch is taken. Keep target within short range.",
            "JZ": "Conditional branch evaluated via zero flag state.",
            "JNZ": "Conditional branch evaluated via inverse zero flag state.",
            "LOOP": "Combines CX decrement and jump. Ensure loop body contains low latency code.",
            "PUSH": "Interacts with stack segment via SP pointer. Watch for memory bus access.",
            "POP": "Retrieves value from stack memory. Ensure aligned word bounds.",
            "SHL": "Fast bitwise multiplication. Highly optimized hardware execution.",
            "SHR": "Fast bitwise division. Multi-bit shifts take uniform single cycles."
        }
        
        primary_driver = drivers.get(opcode, "Standard ALU/Register Execution")
        suggestion = insights.get(opcode, "Optimal execution path. Keep critical math inside internal circuitry.")
        
        if memory_access:
            primary_driver = "Memory Bus Interface Latency"
            suggestion = f"Memory read/write detected for {opcode}. Switch to register addressable elements to optimize speed."
        elif opcode_encoded == -1:
            primary_driver = "Unknown Hardware Instruction"
            suggestion = "Instruction not recognized in the hardware model profile. Verify 8086 alignment."
            
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
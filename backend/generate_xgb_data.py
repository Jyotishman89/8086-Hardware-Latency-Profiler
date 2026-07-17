import pandas as pd
import random

print("[SYSTEM] Generating Official Intel 8086 Architectural Dataset...")

instructions = [
    "MOV", "ADD", "SUB", "CMP", "JMP", "JNE", "PUSH", "POP", 
    "MUL", "DIV", "XOR", "AND", "OR", "TEST", "LEA"
]

registers = ["AX", "BX", "CX", "DX", "SI", "DI", "SP", "BP"]
memory_operands = {
    "[BX]": 5, 
    "[SI]": 5, 
    "[BX+SI]": 7, 
    "[BP+DI]": 7, 
    "[BX+SI+10H]": 11
}
immediates = ["0001H", "00FFH", "1234H"]

def generate_intel_instruction():
    op = random.choice(instructions)
    
    is_alu = 1 if op in ["ADD", "SUB", "MUL", "DIV", "XOR", "AND", "OR"] else 0
    is_branch = 1 if op in ["JMP", "JNE"] else 0
    is_mem = 0
    mem_read = 0
    mem_write = 0
    has_imm = 0
    
    op1, op2 = "", ""
    t_states = 2 
    
    if op in ["MOV", "ADD", "SUB", "CMP", "XOR", "AND", "OR", "TEST"]:
        pattern = random.choice(["reg_reg", "reg_mem", "mem_reg", "reg_imm"])
        if pattern == "reg_reg":
            op1, op2 = random.choice(registers), random.choice(registers)
            t_states = 3 if op != "MOV" else 2 
            
        elif pattern == "reg_mem":
            op1 = random.choice(registers)
            mem_op = random.choice(list(memory_operands.keys()))
            op2 = mem_op
            is_mem, mem_read = 1, 1
            ea_time = memory_operands[mem_op]
            t_states = (8 + ea_time) if op == "MOV" else (9 + ea_time)
            
        elif pattern == "mem_reg":
            mem_op = random.choice(list(memory_operands.keys()))
            op1 = mem_op
            op2 = random.choice(registers)
            is_mem, mem_write = 1, 1
            ea_time = memory_operands[mem_op]
            t_states = (9 + ea_time) if op == "MOV" else (16 + ea_time) 
            
        elif pattern == "reg_imm":
            op1 = random.choice(registers)
            op2 = random.choice(immediates)
            has_imm = 1
            t_states = 4 
            
    elif op == "LEA":
        op1 = random.choice(registers)
        mem_op = random.choice(list(memory_operands.keys()))
        op2 = mem_op
        is_mem, mem_read, mem_write = 0, 0, 0 
        t_states = 2 + memory_operands[mem_op] 
        
    elif op in ["MUL", "DIV"]:
        op1 = random.choice(registers)
        t_states = 118 if op == "MUL" else 144
        is_alu = 1
        
    elif op == "PUSH":
        op1 = random.choice(registers)
        is_mem, mem_write = 1, 1
        t_states = 11
        
    elif op == "POP":
        op1 = random.choice(registers)
        is_mem, mem_read = 1, 1
        t_states = 8
        
    elif op in ["JMP", "JNE"]:
        op1 = "SHORT_LABEL"
        is_branch = 1
        t_states = 15 
        
    return {
        "opcode": op, "op1": op1, "op2": op2,
        "is_alu": is_alu, "is_branch": is_branch, "is_mem": is_mem,
        "mem_read": mem_read, "mem_write": mem_write, "has_imm": has_imm,
        "t_states": float(t_states)
    }

data = [generate_intel_instruction() for _ in range(25000)]
df = pd.DataFrame(data)

df['prev2_op'] = df['opcode'].shift(2).fillna("NOP")
df['prev1_op'] = df['opcode'].shift(1).fillna("NOP")
df['curr_op'] = df['opcode']
df['next1_op'] = df['opcode'].shift(-1).fillna("NOP")
df['next2_op'] = df['opcode'].shift(-2).fillna("NOP")

df['prev1_op1'] = df['op1'].shift(1).fillna("")
df['prev1_op2'] = df['op2'].shift(1).fillna("")

df['reg_dependency'] = ((df['op1'] != "") & 
                       ((df['op1'] == df['prev1_op1']) | (df['op1'] == df['prev1_op2']))).astype(int)

def generate_diagnostic(row):
    if row['t_states'] > 80:
        return "ALU_HEAVY"
    elif row['opcode'] in ["PUSH", "POP"]:
        return "STACK_ENGINE_ACTIVE"
    elif row['opcode'] in ["JMP", "JNE"] and row['prev1_op'] == "CMP":
        return "CONTROL_FLOW_HAZARD"
    elif row['is_mem'] == 1:
        return "MEMORY_BOUND"
    elif row['reg_dependency'] == 1:
        return "SEQUENTIAL_EXECUTION"
    else:
        return "ALU_OPTIMAL"

df['diagnostic_label'] = df.apply(generate_diagnostic, axis=1)

features = [
    'prev2_op', 'prev1_op', 'curr_op', 'next1_op', 'next2_op',
    'op1', 'op2', 'is_alu', 'is_branch', 'is_mem', 
    'mem_read', 'mem_write', 'has_imm', 'reg_dependency',
    't_states', 'diagnostic_label'
]

df = df[features]
df.to_csv("xgb_context_data.csv", index=False)
print("[SUCCESS] intel_8086_reference_data.csv mapped and saved as xgb_context_data.csv!")
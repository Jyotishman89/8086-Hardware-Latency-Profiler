import pandas as pd
import numpy as np
import random

instructions = [
    "MOV", "ADD", "SUB", "CMP", "JMP", "JNE", "JZ", "PUSH", "POP", "SHL", "SHR",
    "INC", "DEC", "MUL", "DIV", "XOR", "AND", "OR", "TEST", "CALL", "RET", "INT", "LEA", "NOP"
]

registers = ["AX", "BX", "CX", "DX", "SI", "DI", "SP", "BP"]
memory_operands = ["[BX]", "[SI]", "[DI]", "[BP]"]
immediates = ["0001H", "0002H", "00FFH", "1234H"]

def generate_random_instruction():
    op = random.choice(instructions)
    
    is_alu = 1 if op in ["ADD", "SUB", "INC", "DEC", "MUL", "DIV", "XOR", "AND", "OR", "SHL", "SHR"] else 0
    is_branch = 1 if op in ["JMP", "JNE", "JZ", "CALL", "RET"] else 0
    is_mem = 1 if op in ["PUSH", "POP", "LEA"] else 0
    
    op1 = ""
    op2 = ""
    mem_read = 0
    mem_write = 0
    has_imm = 0
    
    if op in ["MOV", "ADD", "SUB", "CMP", "XOR", "AND", "OR", "TEST", "LEA"]:
        pattern = random.choice(["reg_reg", "reg_mem", "mem_reg", "reg_imm"])
        if pattern == "reg_reg":
            op1 = random.choice(registers)
            op2 = random.choice(registers)
        elif pattern == "reg_mem":
            op1 = random.choice(registers)
            op2 = random.choice(memory_operands)
            mem_read = 1
            is_mem = 1
        elif pattern == "mem_reg":
            op1 = random.choice(memory_operands)
            op2 = random.choice(registers)
            mem_write = 1
            is_mem = 1
        elif pattern == "reg_imm":
            op1 = random.choice(registers)
            op2 = random.choice(immediates)
            has_imm = 1
    elif op in ["INC", "DEC", "MUL", "DIV", "PUSH", "POP"]:
        op1 = random.choice(registers + memory_operands)
        if "[" in op1 and op in ["PUSH", "MUL", "DIV"]:
            mem_read = 1
            is_mem = 1
        elif "[" in op1 and op in ["POP", "INC", "DEC"]:
            mem_write = 1
            is_mem = 1
    elif op in ["JMP", "JNE", "JZ", "CALL"]:
        op1 = random.choice(["SHORT_LABEL", "FAR_LABEL"])
    elif op == "INT":
        op1 = "21H"
        
    return {
        "opcode": op,
        "op1": op1,
        "op2": op2,
        "is_alu": is_alu,
        "is_branch": is_branch,
        "is_mem": is_mem,
        "mem_read": mem_read,
        "mem_write": mem_write,
        "has_imm": has_imm
    }

data = []
for _ in range(25000):
    data.append(generate_random_instruction())

df = pd.DataFrame(data)

df['prev2_op'] = df['opcode'].shift(2).fillna("NOP")
df['prev1_op'] = df['opcode'].shift(1).fillna("NOP")
df['curr_op'] = df['opcode']
df['next1_op'] = df['opcode'].shift(-1).fillna("NOP")
df['next2_op'] = df['opcode'].shift(-2).fillna("NOP")

df['prev1_op1'] = df['op1'].shift(1).fillna("")
df['prev1_op2'] = df['op2'].shift(1).fillna("")

df['reg_dependency'] = ((df['op1'] != "") & ((df['op1'] == df['prev1_op1']) | (df['op1'] == df['prev1_op2']))).astype(int)

def calculate_t_states(row):
    base = 2.0
    if row['is_mem'] == 1:
        base += 4.0
    if row['mem_write'] == 1:
        base += 2.0
    if row['reg_dependency'] == 1:
        base += 2.0
    if row['is_branch'] == 1 and row['prev1_op'] == "CMP":
        base += 16.0
    if row['opcode'] in ["MUL", "DIV"]:
        base += 118.0
    return base

df['t_states'] = df.apply(calculate_t_states, axis=1)

def generate_diagnostic(row):
    if row['opcode'] in ["JMP", "JNE", "JZ"] and row['prev1_op'] == "CMP":
        return "CONTROL_FLOW_HAZARD"
    elif row['mem_write'] == 1 or row['mem_read'] == 1:
        return "MEMORY_BOUND"
    elif row['reg_dependency'] == 1:
        return "DATA_DEPENDENCY"
    elif row['opcode'] in ["MUL", "DIV"]:
        return "ALU_HEAVY"
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
import pandas as pd
import random

opcodes = ["MOV", "ADD", "SUB", "CMP", "JMP", "JNE", "JZ", "LOOP", "PUSH", "POP", "SHL"]
categories = {"MOV": 3, "ADD": 3, "SUB": 3, "CMP": 3, "JMP": 2, "JNE": 2, "JZ": 2, "LOOP": 2, "PUSH": 4, "POP": 4, "SHL": 3}
data = []

for _ in range(15000):
    seq_len = random.randint(3, 8)
    seq = [random.choice(opcodes) for _ in range(seq_len)]
    
    for i in range(len(seq)):
        prev_op = seq[i-1] if i > 0 else "NOP"
        curr_op = seq[i]
        next_op = seq[i+1] if i < len(seq) - 1 else "NOP"
        
        base_cycles = 2.0 if categories[curr_op] == 3 else 10.0
        
        hazard_penalty = 0.0
        if curr_op in ["JMP", "JNE", "JZ"] and prev_op == "CMP":
            hazard_penalty = 6.0
        elif curr_op in ["PUSH", "POP"] and prev_op in ["PUSH", "POP"]:
            hazard_penalty = 3.0 
            
        total_cycles = base_cycles + hazard_penalty
        
        data.append([prev_op, curr_op, next_op, categories[curr_op], total_cycles])

df = pd.DataFrame(data, columns=["Prev_Op", "Curr_Op", "Next_Op", "Category", "T_States"])
df.to_csv("xgb_context_data.csv", index=False)
# 8086 Hardware Latency Profiler 

An end-to-end machine learning developer tool designed to predict hardware execution latency and simulate architectural bottlenecks for 8086 assembly instructions. 

This project bridges low-level computer architecture with modern AI pipelines, providing real-time execution metrics, multi-line hotspot analysis, and dynamic silicon-level optimization heuristics through a React-based diagnostic terminal.

## Overview
Traditional profilers count static clock cycles. This engine utilizes an XGBoost regressor trained on 2,000 simulated physical boundary instruction sets to dynamically evaluate memory bus saturation, Execution Unit (EU) efficiency, and prefetch queue hazards in real-time. The model achieves a **95.31% R² score** with a Mean Absolute Error (MAE) of **1.02 cycles**.

## Key Features

* **Multi-Line Hotspot Analysis:** Paste entire sub-routines. The batch-processing API (`/predict_block`) dynamically scans the code block, aggregates total clock cycles, and isolates the exact line number causing the primary pipeline bottleneck.
* **Telemetry Diagnostics:** Replaces basic coding advice with color-coded, hardware-level directives via a custom React RegEx parser:
  * 🟢 **[ALU OPTIMAL]** - Identifies highly efficient internal register arithmetic.
  * 🟡 **[EXTERNAL MEMORY SATURATION]** - Flags heavy Bus Interface Unit (BIU) wait-states.
  * 🔴 **[SPECULATIVE HAZARD]** - Warns of severe prefetch queue flushes caused by branching.
* **Non-Blocking Inference:** A decoupled full-stack architecture separating the heavy XGBoost heuristics from the high-speed Vite/Tailwind frontend.

## System Architecture

The application is structured as a decoupled full-stack machine learning pipeline:

* **Machine Learning Engine (XGBoost):** Trained on 2,000 simulated physical boundary instruction sets. Predicts clock cycle latency with a 95.31% R² score and a Mean Absolute Error (MAE) of 1.02 cycles.
* **Backend Inference API (FastAPI/Python):** A high-speed, localized REST API that parses raw assembly text, applies one-hot categorical encoding, and serves SHAP-driven execution heuristics via native JSON payloads.
* **Frontend Dashboard (React/Vite/Tailwind):** A dark-mode, terminal-inspired UI that visualizes latency bottlenecks (e.g., Memory Bus vs. ALU execution) and translates numerical ML outputs into actionable developer insights.

## Feature Engineering & Heuristics
**Basic Block Hotspot Analysis**\
The profiler accepts multi-line code blocks, dynamically scanning the array to tally total clock cycles and isolate the exact line number causing the primary pipeline bottleneck.

Raw assembly strings are dynamically parsed into dimensional feature vectors in **O(1)** constant time:
* `Opcode_Encoded`: Base algorithmic categorization.
* `Category_Encoded`: Boundary mapping (Memory, Control Flow, ALU, Stack).
* `Operand_Count`: Execution complexity scaling.
* `Memory_Access`: Binary flag for physical RAM interaction.
* `Immediate_Value`: Binary flag for hardware bus loading.

## Interactive Hotspot Testing

Following code snippets are given as examples for reference:

1. **The Optimal ALU Path (Green Telemetry)**\
Keeps arithmetic confined to internal circuitry and utilizes hardware acceleration.

```
MOV AX, 0005H
MOV BX, 000AH
ADD AX, BX
SHL AX, 1
```
2. **BIU Memory Saturation (Amber Telemetry)**\
Forces the system to rely heavily on the stack, triggering bus wait-states.

```
PUSH AX
PUSH BX
MOV CX, [DI]
POP BX
POP AX
```

3. **The Pipeline Hazard (Red Telemetry)**\
Simulates conditional states and branches, forcing the CPU to flush its 6-byte instruction prefetch queue.

```
CMP CX, 0000H
JZ END_ROUTINE
SUB CX, 1
JMP START_LOOP
```

## Limitations
This application operates under the following constraints:

1. **Simulated Environment**: Predictions are based on a simulated instruction dataset; performance on physical vintage 8086 hardware may vary due to undocumented hardware quirks, silicon degradation, or thermal constraints.

2. **Instruction Scope**: Currently focuses on standard integer instruction sets. Complex, non-standard, or obscure legacy interrupts are not within the model's training distribution.

3. **Static Block Aggregation**: While the application fully supports multi-line batch processing and flags localized bottlenecks, it aggregates static execution costs and heuristic branch penalties. It does not act as a full cycle-accurate CPU emulator (e.g., it does not dynamically track historical cache lines or advanced state-dependent hardware bugs).

4. **Hardware Variation**: The "Memory Bus Latency" driver assumes standard bus speeds. It does not account for modern memory controller overhead if the code is emulated on a host machine rather than native silicon.

5. **Heuristic Telemetry Tagging**: The diagnostic tags (e.g., **[SPECULATIVE HAZARD]**) are currently driven by a static, rule-based architectural mapping in the backend rather than dynamically inferred by the XGBoost regressor. Furthermore, the React UI relies on strict RegEx string matching; any deviation in the backend telemetry syntax will cause the parser to default to neutral styling.

## Local Development Setup

### 1. Clone the repository 
```bash
git clone https://github.com/Jyotishman89/8086-Hardware-Latency-Profiler.git
cd 8086-Hardware-Latency-Profiler
```

### 2. Boot the Inference Server
```bash
cd backend
pip install fastapi uvicorn pydantic joblib xgboost pandas numpy
uvicorn main:app --reload
```

### 3. Boot the UI Dashboard
```bash
cd frontend
npm install
npm run dev
```
# 8086 Hardware Latency Profiler 

A performance estimation tool that uses Machine Learning to predict assembly instruction timing based on architectural features. This project bridges the gap between raw assembly syntax and hardware performance expectations by providing block-level heuristic analysis.

## Overview

The 8086 Hardware Latency Profiler is a performance estimation tool that uses Machine Learning to predict instruction timing based on architectural features. While cycle-accurate CPU emulators attempt to replicate every micro-state of a processor, this tool provides a high-level heuristic analysis. By mapping assembly instructions to engineered feature vectors, it identifies architectural bottlenecks (such as high-latency memory bus cycles or branch penalties) to help developers optimize their code at the algorithmic level.The model achieves a **95.31% R² score** with a Mean Absolute Error (MAE) of **1.02 cycles**.

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

Raw assembly strings are dynamically parsed into compact numerical feature vectors:

* `Opcode_Encoded`: Base algorithmic categorization.
* `Category_Encoded`: Boundary mapping (Memory, Control Flow, ALU, Stack).
* `Operand_Count`: Execution complexity scaling.
* `Memory_Access`: Binary flag for physical RAM interaction.
* `Immediate_Value`: Binary flag for hardware bus loading.

## Interactive Hotspot Testing

Following code snippets are given as reference examples for testing the tool:

1. **The Optimal ALU Path (Green Telemetry)**\
Keeps arithmetic confined to internal circuitry and keeps computation within CPU registers and minimizes memory access.

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

1. **Heuristic-Based Analysis**: This tool is not a cycle-accurate emulator; it does not track historical register states or cache-line modifications across the entire execution flow. Instead, it performs block-level latency estimation.

2. **​Architectural Feature Mapping**: Predictions are derived from a machine learning model trained on instruction-level timing data. While it captures the typical latency penalty of branch hazards and memory accesses, it does not account for environment-specific hardware quirks, thermal throttling, or real-time interrupt handling.

3. **​Static Estimation**: The profiler estimates latency based on the static execution cost of an instruction block. It does not account for the dynamic state of a physical CPU's instruction prefetch queue during multi-cycle execution.

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
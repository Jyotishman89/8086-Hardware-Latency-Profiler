# 8086 Hardware Latency Profiler

A performance estimation tool that uses Machine Learning and deterministic heuristics to predict assembly instruction timing based on contextual architectural features.

This project bridges low-level computer architecture with modern AI pipelines, providing real-time execution metrics, contextual hotspot analysis, and deterministic optimization directives through a retro terminal-inspired diagnostic interface built with React.

## Overview

While cycle-accurate CPU emulators attempt to replicate every micro-state of a processor, this tool provides a high-level **heuristic performance estimation**. Utilizing an XGBoost regressor trained on over 82,500 contextual instruction samples derived from 15,000 simulated execution sequences, the engine evaluates multi-line assembly blocks as a contextual sliding window. By combining sequence-based machine learning with a deterministic Shadow Decoder (`MicrocodeInsightEngine`), it estimates potential architectural bottlenecks—such as memory bus saturation or control flow hazards—to help developers optimize code at the algorithmic level. The model achieves a **95.31% R² score** with a Mean Absolute Error (MAE) of **1.02 cycles**.

## System Architecture

The application is structured as a decoupled full-stack machine learning pipeline:

* **Machine Learning Engine (XGBoost V3)**: 
A context-aware regressor trained on sequential instruction data. It utilizes a 4-dimensional "Sliding Window" feature vector to predict execution latency caused by dependent sequences.
* **High-Speed Inference API (FastAPI / Python)**: 
A localized REST API that executes ML predictions in `O(n)` time. It dynamically sanitizes raw assembly text, handles categorical label encoding, and flags unsupported instructions with a [FATAL] diagnostic.
* **Deterministic Shadow Decoder**: 
The `MicrocodeInsightEngine` applies deterministic architectural heuristics to complement the ML model's latency estimates with interpretable telemetry diagnostics.
* **Frontend Dashboard (React / Vite / Tailwind)**:
A stateless presentation layer that parses telemetry payloads and renders terminal-style diagnostics, color-coded telemetry indicators, instruction traces, and pipeline status visualizations in real time.

## Feature Engineering: The Sliding Window

Traditional profilers analyze code in isolation. This engine parses raw assembly strings into a dimensional feature vector that grants the model contextual awareness of neighboring instructions:
* `Prev_Enc`: Label encoding of the preceding instruction.
* `Curr_Enc`: Label encoding of the target instruction.
* `Next_Enc`: Label encoding of the subsequent instruction.
* `Category`: Boundary mapping (Memory, Control Flow, ALU, Stack).

## Interactive Pipeline Diagnostics

The batch-processing API dynamically scans code blocks and isolates the exact line number causing the primary pipeline bottleneck.

1. **The Optimal ALU Path (🟢 ALU OPTIMAL)**: Identifies highly efficient internal register arithmetic, avoiding memory bus delays.
```
MOV AX, 0005H
MOV BX, 000AH
ADD AX, BX
SHL AX, 1
```

2. **BIU Memory Saturation (🟠 MEMORY BOUND)**: Evaluates contiguous memory-mapped transfers and flags heavy Bus Interface Unit (BIU) wait-states.
```
PUSH AX
PUSH BX
MOV CX, [DI]
POP BX
POP AX
```

3. **The Control Flow Hazard (🔴 CONTROL FLOW HAZARD)**: The sliding window identifies branch-heavy instruction patterns associated with instruction prefetch penalties and control flow disruption.
```
MOV AX, 0001H
CMP CX, 0000H
JNE START_LOOP
ADD AX, 0002H
```

4. **Hardware Profile Violation (🔴 FATAL)**:
Detects unsupported instructions, invalid opcodes, or instructions absent from the model's training distribution and rejects them from the latency estimation pipeline.
```
MOV AX, 0001H
ADD AX, BX
CPUID
PUSH AX
```

## Limitations & Constraints

To accurately frame the tool's capabilities for engineering environments, it operates under the following constraints:

1. **Heuristic-Based Analysis**: This tool performs block-level latency estimation. It is not a cycle-accurate emulator and does not dynamically track historical cache-line modifications, register states, or real-time interrupt handling.

2. **Synthetic Training Distribution**:
Predictions are derived from synthetic instruction timing data and deterministic architectural heuristics rather than measurements collected from physical 8086 hardware.

3. **Contextual Feature Mapping**: While the model captures the latency penalty of standard branch hazards and memory accesses within its sliding window, it does not account for out-of-window dependencies or hardware-specific timing variations of physical implementations.

4. **Instruction Scope**: Focused strictly on standard 8086 integer instruction sets. Modern AVX commands, obscure legacy interrupts, or non-aligned ISA instructions are dynamically caught and flagged with a [FATAL] diagnostic and excluded from latency estimation.

## Local Development Setup
1. Clone the repository

```bash
git clone https://github.com/Jyotishman89/8086-Hardware-Latency-Profiler.git
cd 8086-Hardware-Latency-Profiler
```

2. Boot the Inference Server

```bash
cd backend
pip install fastapi uvicorn pydantic pandas scikit-learn xgboost joblib
uvicorn main:app --reload
```

3. Boot the UI Dashboard

```bash
cd frontend
npm install
npm run dev
```
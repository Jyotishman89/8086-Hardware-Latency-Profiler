# 8086 Hardware Latency Profiler

A performance estimation tool that uses Machine Learning and deterministic heuristics to predict assembly instruction timing based on contextual architectural features.

This project bridges low-level computer architecture with modern AI pipelines, providing real-time execution metrics, contextual hotspot analysis and dominant bottleneck instruction isolation, deterministic optimization directives and bottleneck classification through a retro terminal-inspired diagnostic interface built with React.

## Overview

While cycle-accurate CPU emulators attempt to replicate every micro-state of a processor, this tool provides high-level architectural latency estimation. Utilizing a dual-model XGBoost inference pipeline trained on around 25,000 contextual instruction samples generated from synthetic 8086 execution patterns, the engine evaluates multi-line assembly blocks as a contextual sliding window. By combining a dual-model machine learning pipeline with deterministic architectural heuristics (`MicrocodeInsightEngine`), the system estimates execution latency and classifies dominant architectural bottlenecks such as memory pressure, microcoded arithmetic occupancy, and control flow hazards.

## System Architecture

The application is structured as a decoupled full-stack machine learning pipeline:

* **Dual-Model Machine Learning Engine (XGBoost V4)**: A context-aware inference pipeline consisting of an `XGBRegressor` for latency estimation and an `XGBClassifier` for architectural bottleneck classification. Both models operate on a shared 14-dimensional contextual feature vector derived from neighboring instructions and operand-level execution characteristics.
* **High-Speed Inference API (FastAPI / Python)**: 
A localized REST API that executes ML predictions in `O(n)` time. It dynamically sanitizes raw assembly text, handles categorical label encoding, and flags unsupported instructions with a [FATAL] diagnostic.
* **Deterministic Shadow Decoder**: The `MicrocodeInsightEngine` complements ML predictions with architecture-aware telemetry explanations, visualization routing, and optimization directives.
* **Frontend Dashboard (React / Vite / Tailwind)**:
A stateless presentation layer that parses telemetry payloads and renders terminal-style diagnostics, color-coded telemetry indicators, instruction traces, and architecture-inspired pipeline visualizations in real time.

## Feature Engineering: The Sliding Window

Traditional profilers analyze code in isolation. This engine parses raw assembly strings into a dimensional feature vector that grants the model contextual awareness of neighboring instructions:

* Contextual opcode window (`Prev2`, `Prev1`, `Curr`, `Next1`, `Next2`)
* Operand encoding (`Op1`, `Op2`)
* Memory activity flags (`is_mem`, `mem_read`, `mem_write`)
* Architectural execution flags (`is_branch`, `is_alu`, `has_imm`)
* Register dependency detection (`reg_dependency`)

## Interactive Pipeline Diagnostics

The batch-processing API dynamically scans code blocks and isolates the exact line causing the primary pipeline bottleneck.

1. **Standard Execution (🟢 STANDARD EXECUTION)**: Identifies sequential register-oriented instruction streams that execute efficiently through normal BIU/EU overlap without significant memory pressure or control flow disruption.
```
MOV AX, 0005H
MOV BX, 000AH
ADD AX, BX
SHL AX, 1
```

2. **BIU Memory Saturation (🟠 MEMORY BOUND)**: Evaluates memory-oriented instruction streams and identifies workloads dominated by external memory bus transactions.
```
PUSH AX
PUSH BX
MOV CX, [DI]
POP BX
POP AX
```

3. **The Control Flow Hazard (🔴 CONTROL FLOW HAZARD)**: The sliding window identifies branch-heavy instruction patterns associated with 8086 prefetch queue invalidation and instruction fetch penalties.
```
MOV AX, 0001H
CMP CX, 0000H
JNE START_LOOP
ADD AX, 0002H
```

4. **Hardware Profile Violation (🔴 FATAL)**: Detects unsupported instructions, invalid opcodes, or instructions absent from the model's training distribution and rejects them from the latency estimation pipeline.
```
MOV AX, 0001H
ADD AX, BX
CPUID
PUSH AX
```

## Limitations & Constraints

To accurately frame the tool's capabilities for engineering environments, it operates under the following constraints:

1. **Heuristic-Based Analysis**: This tool performs block-level latency estimation. It is not a cycle-accurate emulator and does not dynamically track register values, memory contents, interrupt handling, or exact microarchitectural state transitions.

2. **Synthetic Training Distribution**: Predictions are derived from synthetic instruction timing data and deterministic architectural heuristics rather than measurements collected from physical 8086 hardware.
   
3. **Contextual Feature Mapping**: While the model captures the latency impact of branch hazards, memory accesses, and microcoded arithmetic within its sliding window, it does not account for out-of-window dependencies or implementation-specific timing variations across different 8086-compatible systems.

4. **Instruction Scope**: Focused strictly on standard 8086 integer instruction sets. Modern AVX instructions, unsupported opcodes, or instructions outside the supported ISA are dynamically caught and flagged with a [FATAL] diagnostic and excluded from latency estimation.
   
## Local Development Setup

1. Clone the repository
```
git clone https://github.com/Jyotishman89/8086-Hardware-Latency-Profiler.git
cd 8086-Hardware-Latency-Profiler
```

2. Boot the Inference Server
```
cd backend
pip install fastapi uvicorn pydantic pandas scikit-learn xgboost joblib
uvicorn main:app --reload
```

3. Boot the UI Dashboard
```
cd frontend
npm install
npm run dev
```

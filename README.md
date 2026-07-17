# 8086 Hardware Latency Profiler

A performance estimation tool that uses Machine Learning and deterministic heuristics to predict assembly instruction timing based on contextual architectural features.

This project bridges low-level computer architecture with modern AI pipelines, providing real-time execution metrics, contextual hotspot analysis and dominant bottleneck instruction isolation, deterministic optimization directives and bottleneck classification through a retro terminal-inspired diagnostic interface built with React.

## Overview

Traditional cycle-accurate emulators attempt to reproduce every internal state transition of a processor. This project instead performs architecture-aware latency estimation by combining machine learning inference with deterministic hardware heuristics.

The profiler evaluates multi-line 8086 assembly blocks as contextual execution windows rather than isolated instructions. A dual-model XGBoost inference pipeline predicts total execution latency and isolates the dominant architectural bottleneck responsible for throughput degradation.

The inference pipeline is augmented by a deterministic post-inference reasoning layer, internally referred to as the `MicrocodeInsightEngine`, which transforms raw machine learning predictions into architecture-inspired telemetry. This layer normalizes bottleneck classifications, generates optimization directives, attributes dominant latency contributors through SHAP-based feature analysis, and routes hardware-specific visualizations and execution narratives to the frontend dashboard.

By combining statistical inference with deterministic architectural heuristics, the system produces interpretable diagnostics that resemble traditional hardware profiling tools while preserving the flexibility and generalization capabilities of machine learning models.

The result is a retro terminal-style diagnostic system that explains *why* a workload is slow rather than merely predicting how long it will take.

## System Architecture

The application is structured as a decoupled full-stack machine learning pipeline:

### Dual-Model Machine Learning Engine (XGBoost V4)

A context-aware inference pipeline consisting of:

- `XGBRegressor` for total latency estimation.
- `XGBClassifier` for dominant bottleneck classification.

Both models operate on a shared contextual execution representation derived from neighboring instructions and operand-level architectural characteristics.

### High-Speed Inference API (FastAPI / Python)

A localized REST inference server responsible for:

- Assembly parsing and sanitization
- Sliding-window feature extraction
- Model inference execution
- Unsupported opcode validation
- Fatal diagnostic generation

Inference executes in linear time relative to instruction count.

### Deterministic Post-Inference Reasoning Layer (`MicrocodeInsightEngine`)

The `MicrocodeInsightEngine` acts as an architecture-aware interpretation layer that operates after model inference. Rather than participating directly in latency prediction, it converts numerical model outputs into human-readable hardware diagnostics inspired by the internal behavior of the 8086 processor.

Responsibilities include:

- Bottleneck normalization and classification refinement
- Optimization directive generation
- SHAP-based feature telemetry extraction
- Hardware visualization routing
- Instruction pipeline trace generation
- Architectural explanation and narrative synthesis

This reasoning layer bridges the gap between statistical model predictions and low-level architectural intuition, enabling the profiler to present execution characteristics in a form familiar to systems programmers and computer architecture engineers.

### Frontend Dashboard (React + Vite + Tailwind)

A retro terminal-inspired telemetry interface that renders:

- Execution latency estimates
- Dominant bottleneck instruction isolation
- Instruction pipeline traces
- Hardware execution diagrams
- Optimization directives
- Feature contribution telemetry

All visualizations are generated dynamically from backend telemetry payloads.

## Feature Engineering: Contextual Sliding Window

Unlike traditional profilers that analyze instructions in isolation, this engine evaluates instructions as contextual execution sequences.

The inference pipeline extracts a contextual feature vector containing:

### Instruction Context
- Previous instruction (-2)
- Previous instruction (-1)
- Current instruction
- Next instruction (+1)
- Next instruction (+2)

### Operand Features
- Operand 1 encoding
- Operand 2 encoding

### Architectural Flags
- Memory operand access
- Memory read
- Memory write
- Branch instruction
- Microcoded arithmetic operation
- Immediate operand usage
- Register dependency detection

This contextual representation allows the model to approximate architectural interactions such as:

- Memory bus contention
- Stack traffic
- Prefetch invalidation
- Microcoded execution occupancy
- Dependency chains

## Interactive Pipeline Diagnostics

The batch-processing API dynamically scans code blocks and isolates the exact line causing the primary pipeline bottleneck.

1.🟢 ALU OPTIMAL: Lightweight register-oriented instruction streams execute entirely within the Execution Unit without meaningful contention from memory access, stack traffic, branch penalties, or microcoded operations.
```
MOV AX,0001H
MOV BX,0002H
MOV CX,0003H
MOV DX,0004H
```

2. 🟢 SEQUENTIAL EXECUTION: Sequential register-oriented instruction streams benefit from the 8086 Bus Interface Unit and Execution Unit overlap mechanism, allowing efficient utilization of the processor prefetch queue.
```
MOV AX,0001H
MOV BX,0002H
ADD AX,BX
SUB AX,0001H
```

3. **🟠 MEMORY BOUND**: Memory operands saturate the external bus and stall effective execution throughput while the BIU services memory transactions.
```
MOV AX, [BX+SI+10H]
MOV DX, [BP+DI+20H]
ADD AX, DX
```

4. **🔵 STACK ENGINE ACTIVE**: Stack traffic dominates execution through repeated PUSH and POP memory cycles.
```
PUSH AX
PUSH BX
POP CX
POP DX
```

5. **🔴 CONTROL FLOW HAZARD**: The sliding window identifies branch-heavy instruction patterns associated with 8086 prefetch queue invalidation and instruction fetch penalties.
```
CMP AX, BX
JNE LOOP_START
MOV CX, DX
ADD AX, CX
```

6. **🟠 MICROCODED EXECUTION**: Complex arithmetic instructions occupy the execution unit for extended periods through internal microcode sequencing.
```
MUL BX
DIV CX
```

7. **🔴 FATAL**: Unsupported instructions or instructions absent from the training distribution are dynamically rejected. Supported instructions currently include MOV, ADD, SUB, MUL, DIV, CMP, PUSH, POP, LEA, and common conditional branch instructions used during training. Shift/rotate instructions are currently outside the supported inference distribution and are treated as unsupported opcodes.
   
```
MOV AX, 0001H
ADD AX, BX
CPUID
PUSH AX
```

*Shift/rotate instructions are currently outside the supported inference distribution and are treated as unsupported opcodes.*\
*`INC` and `DEC` are currently unsupported by the training distribution and are treated as invalid opcodes until included in future model revisions.*


## Limitations & Constraints

To accurately frame the tool's capabilities for engineering environments, it operates under the following constraints:

1. **Heuristic-Based Analysis**: This tool performs block-level latency estimation. It is not a cycle-accurate emulator and does not dynamically track register values, memory contents, interrupt handling, or exact microarchitectural state transitions.

2. **Synthetic Training Distribution**: Predictions are derived from synthetic execution traces generated from documented 8086 timing characteristics and contextual instruction patterns rather than measurements collected from physical silicon.
   
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

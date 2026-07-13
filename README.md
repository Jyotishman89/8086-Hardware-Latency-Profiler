# 8086 Hardware Latency Profiler 

An end-to-end machine learning developer tool designed to predict hardware execution latency and simulate architectural bottlenecks for 8086 assembly instructions. 

This project bridges low-level computer architecture with modern AI pipelines, providing real-time execution metrics and dynamic optimization heuristics through a React-based interface.

## System Architecture

The application is structured as a decoupled full-stack machine learning pipeline:

* **Machine Learning Engine (XGBoost):** Trained on 2,000 simulated physical boundary instruction sets. Predicts clock cycle latency with a 95.31% R² score and a Mean Absolute Error (MAE) of 1.02 cycles.
* **Backend Inference API (FastAPI/Python):** A high-speed, localized REST API that parses raw assembly text, applies one-hot categorical encoding, and serves SHAP-driven execution heuristics via native JSON payloads.
* **Frontend Dashboard (React/Vite/Tailwind):** A dark-mode, terminal-inspired UI that visualizes latency bottlenecks (e.g., Memory Bus vs. ALU execution) and translates numerical ML outputs into actionable developer insights.

## Feature Engineering & Heuristics

Raw assembly strings are dynamically parsed into dimensional feature vectors in **O(1)** constant time:
* `Opcode_Encoded`: Base algorithmic categorization.
* `Category_Encoded`: Boundary mapping (Memory, Control Flow, ALU, Stack).
* `Operand_Count`: Execution complexity scaling.
* `Memory_Access`: Binary flag for physical RAM interaction.
* `Immediate_Value`: Binary flag for hardware bus loading.

## Limitations
This application operates under the following constraints:

1. **Simulated Environment**: Predictions are based on a simulated instruction dataset; performance on physical vintage 8086 hardware may vary due to undocumented hardware quirks or thermal throttling.

2. **Instruction Scope**: Currently focuses on standard integer instruction sets. Complex, non-standard, or obscure legacy interrupts are not within the model's training distribution.

3. **Static Pipeline Assumption**: The model predicts cycle latency for individual instructions but does not currently simulate multi-stage pipeline hazards or complex out-of-order execution scenarios common in modern processors.

4. **Hardware Variation**: The "Memory Bus Latency" driver assumes standard bus speeds. It does not account for modern memory controller overhead if the code is emulated on a host machine.

## Local Development Setup

Clone the repository and ignite the dual-server environment:

### 1. Boot the Inference Server
```bash
cd backend
pip install fastapi uvicorn pydantic joblib xgboost pandas numpy
uvicorn main:app --reload
```

### 2. Boot the UI Dashboard
```bash
cd frontend
npm install
npm run dev
```
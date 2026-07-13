# 8086 Hardware Latency Profiler 

An end-to-end machine learning developer tool designed to predict hardware execution latency and simulate architectural bottlenecks for 8086 assembly instructions. 

This project bridges low-level computer architecture with modern AI pipelines, providing real-time execution metrics and dynamic optimization heuristics through a React-based interface.

## System Architecture

The application is structured as a decoupled full-stack machine learning pipeline:

* **Machine Learning Engine (XGBoost):** Trained on 2,000 simulated physical boundary instruction sets. Predicts clock cycle latency with a 95.31% $R^2$ score and a Mean Absolute Error (MAE) of 1.02 cycles.
* **Backend Inference API (FastAPI/Python):** A high-speed, localized REST API that parses raw assembly text, applies one-hot categorical encoding, and serves SHAP-driven execution heuristics via native JSON payloads.
* **Frontend Dashboard (React/Vite/Tailwind):** A dark-mode, terminal-inspired UI that visualizes latency bottlenecks (e.g., Memory Bus vs. ALU execution) and translates numerical ML outputs into actionable developer insights.

## Feature Engineering & Heuristics

Raw assembly strings are dynamically parsed into dimensional feature vectors in $O(1)$ constant time:
* `Opcode_Encoded`: Base algorithmic categorization.
* `Category_Encoded`: Boundary mapping (Memory, Control Flow, ALU, Stack).
* `Operand_Count`: Execution complexity scaling.
* `Memory_Access`: Binary flag for physical RAM interaction.
* `Immediate_Value`: Binary flag for hardware bus loading.

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
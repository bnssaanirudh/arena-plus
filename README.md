# ArenaPulse ✦ Autonomous Logistics Intelligence

ArenaPulse is an autonomous multi-agent logistics intelligence platform designed for large-scale events, such as the FIFA World Cup 2026. The platform continuously monitors crowd telemetry, predicts crowd surges, autonomously allocates resources, and coordinates nearby vendors.

## 🚀 Project Status: Phase 1 & 2 Complete

We are following a strict phased development approach. **Currently, the Architecture, Skeleton, and Frontend UI phases are complete.**

### ✅ Completed Work (Phases 1 & 2)
1. **System Architecture Generation**: The blueprint for the multi-agent system, telemetry ingestion, and predictive ML models has been defined.
2. **Project Skeleton Generation**: The `frontend` (React + Vite + Tailwind v4) and `backend` (FastAPI + Python Agents) directories have been scaffolded.
3. **Frontend Implementation (BaseStructures Theme)**:
   - Built a high-end, brutalist/elegant marketing Landing Page heavily inspired by `basestructures.com`.
   - Implemented smooth `framer-motion` scroll-reveal animations (`FadeInUp`).
   - Integrated premium typography (`Outfit` from Google Fonts).
   - Created dynamic internal pages: `Capabilities`, `Operations`, `Contact`, and the `Dashboard` control room.
   - Set up React Router for seamless single-page navigation.
4. **Mock Backend Simulator**: Created a temporary simulated data stream to populate the dashboard with realistic-looking live telemetry and agent activities.

---

## 🚧 Upcoming Work (Phase 3 & Beyond)

The following core functionalities are pending and require heavy backend and machine learning implementation.

### 1. Predictive ML Models (The Core Engine)
- **Model Training**: Train XGBoost and Random Forest models using historical stadium crowd density data to predict surges 45 minutes in advance.
- **VisionEngine Integration**: Hook into (simulated or real) optical sensors to generate live heatmaps and multi-directional flow vectors.

### 2. Multi-Agent System (LLM Orchestration)
- **Perception Agent**: Upgrade from the mocked heuristic fallback to actually analyzing streaming vector data using Gemini/OpenAI.
- **Planning & Execution Agents**: Build the logic for agents to autonomously dispatch vendors, re-route security, and issue commands to human staff.
- **Agent Communication**: Implement a robust pub/sub model for inter-agent communication and state management.

### 3. Data Infrastructure
- **ElasticSearch Vector Database**: Deploy and integrate ElasticSearch to store historical telemetry and agent execution logs.
- **Real-time Pipeline**: Implement Kafka or Redis Streams for high-throughput, low-latency ingestion of turnstile, POS, and sensor data.

### 4. Testing & Deployment
- Write comprehensive unit tests for ML model accuracy and agent decision boundaries (`pytest`).
- Implement end-to-end integration testing for the WebSocket telemetry feeds.
- Containerize the application (Docker) and prepare CI/CD pipelines for production deployment.

## 🛠️ How to Run Locally

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend (Simulator Mode)
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

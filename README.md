# ArenaPulse ✦ Autonomous Logistics Intelligence

ArenaPulse is an autonomous multi-agent logistics intelligence platform for large-scale events (e.g. FIFA World Cup 2026). A simulator generates crowd telemetry, a multi-agent pipeline assesses surge risk and decides interventions, and a live dashboard streams the whole pipeline over WebSocket.

> **Status note (2026-06):** This README previously described the project as "Phase 1 & 2 — frontend + mock simulator only." That was stale. The backend ML pipeline, the 5-stage agent state machine, the MCP tools, and the Elasticsearch ingestion are **all implemented**. See [`AUDIT.md`](AUDIT.md) for known bugs and [`TASKS.md`](TASKS.md) for the live work list.

## What's implemented

**Backend (`backend/`, FastAPI)**
- **Simulator** (`simulator/engine.py`) — every `SIMULATION_INTERVAL_SECONDS` (default 5s) generates a random telemetry event, publishes it to pub/sub, and runs it through the agent pipeline.
- **Agent pipeline** (`agents/manager.py`) — a state machine: **Perception → Planning → Inventory → Validation → Execution**, publishing each stage to its own channel.
  - Perception: ML prediction (`ml/predictor.py`) + optional Gemini LLM, with a heuristic fallback.
  - Planning: maps risk → action (`MONITOR`, `DISPATCH_RESOURCES`, `REROUTE_CROWD`, `ALERT_SECURITY`, `EVACUATE_ZONE`).
  - Inventory / Validation / Execution: allocate vendor resources, validate, then execute (respects `DRY_RUN`).
- **Pub/sub** (`infra/pubsub.py` over `infra/mock_redis.py`) — in-memory async fake Redis; no real Redis required.
- **WebSocket** (`routers/websockets.py`) — `/api/v1/ws/dashboard` multiplexes raw telemetry + all agent channels to the browser.
- **ML** (`ml/`) — synthetic data generation + XGBoost/RandomForest training; trained model in top-level `models/`.
- **Elasticsearch** (`elastic/`) — index setup + ingestion, **best-effort** (app runs fine with ES down).
- **MCP tools** (`mcp/`) — ES-backed helpers (nearest vendor, overloaded zones, inventory) exposed over REST.
- **Observability** (`observability/tracer.py`) — Arize Phoenix + OpenTelemetry.

**Frontend (`frontend/`, React 19 + Vite 8 + Tailwind v4 + TypeScript)**
- Marketing pages (Landing/Capabilities/Operations/Contact) + a live **Dashboard** control room (Leaflet map, live feed, recharts analytics, agent activity panel) wired to the WebSocket via a Zustand store.

### Graceful degradation
The system is designed to run with **nothing external configured** — no Redis (mock is always used), no Elasticsearch, no Gemini key, and even no trained model (heuristic fallback). Preserve this property when adding features.

> ⚠️ **Known issues** (see `AUDIT.md`): the trained model currently predicts on an all-zero feature vector because live event keys don't match the model's training features (C1), and the resource-dispatch path is dead when ES is down because vendors live in-memory but are looked up in ES (C2). Fixes are tracked in `TASKS.md`.

## 🛠️ Run locally

### Frontend
```bash
cd frontend
npm install
npm run dev      # Vite dev server
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload     # http://localhost:8000
```

### Tests
```bash
cd backend
pytest                                   # all
pytest tests/test_agents.py::TestPlanningAgent::test_reroute_for_congestion   # one test
```

### ML model (optional — heuristic fallback works without it)
```bash
cd backend
python -m app.ml.generate_synthetic_data   # -> data/synthetic/training_features.csv
python -m app.ml.train_model               # -> models/surge_predictor.joblib (+ reports)
```

## Layout
```
backend/app/    simulator, agents, infra (pubsub/mock_redis), ml, elastic, mcp, routers, observability
frontend/src/   pages/, components/, store/
models/         trained surge_predictor.joblib + reports
data/           synthetic training data
```
See [`CLAUDE.md`](CLAUDE.md) for architecture details and the code-review-graph workflow.

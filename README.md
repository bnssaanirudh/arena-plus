# ArenaPulse ✦ Autonomous World Cup Crowd & Commerce Coordinator

ArenaPulse is an **autonomous multi-agent system** for large-scale events (FIFA World Cup 2026). It doesn't answer questions — it **takes action**: a live stream of crowd telemetry triggers an agent that reasons about surge risk, checks vendor supply, verifies feasibility, and autonomously dispatches resources and hyper-local flash deals — all streamed to a live dashboard.

> Built for the **Google Cloud "Building Agents for Real-World Challenges"** hackathon — Gemini 3 brain · Google Cloud Agent Builder (ADK) · **Elastic** partner MCP track · Arize observability.
>
> 📋 Build status, phases, and the manual setup steps live in **[`HACKATHON_PLAN.md`](HACKATHON_PLAN.md)**. The product vision is in **[`project_idea.md`](project_idea.md)**.

## The agent mission (multi-step, non-linear)

```
[Crowd surge detected]
   → Perceive    risk (ML pre-filter + Gemini 3 reasoning)
   → Plan        the intervention (Gemini decides action + resources)
   → Source      nearest low-stock vendors (Elastic MCP)
   → Verify      supply-chain feasibility (RAG); self-correct if not viable
   → Execute     ┌─ dispatch B2B restock orders
                 └─ generate & push hyper-local flash deals to fans
```

The human stays in control: high-impact actions (evacuation, large dispatch) route through an approval gate.

## Architecture

**Backend (`backend/`, FastAPI + Python)**
- **Simulator** (`simulator/engine.py`) — emits a telemetry event every few seconds and runs it through the agent.
- **Agent pipeline** (`agents/`) — Perception → Planning → Inventory → Validation → Execution, each stage published to a pub/sub channel.
  - **Gemini 3** (`llm/gemini.py`) is the reasoning brain (planning decisions). A deterministic heuristic is the fallback.
  - **Elastic MCP** is the agent's data superpower (vendor/inventory/geo search + RAG).
- **Pub/sub** (`infra/`) — in-memory async mock Redis; no real Redis needed.
- **WebSocket** (`routers/websockets.py`) — `/api/v1/ws/dashboard` multiplexes telemetry + all agent stages to the browser.
- **Observability** (`observability/tracer.py`) — Arize Phoenix + OpenTelemetry traces of the agent's reasoning.

**Frontend (`frontend/`, React 19 + Vite + Tailwind v4 + TypeScript)**
- Live **Dashboard**: Leaflet stadium map, telemetry feed, analytics, and an agent-activity panel — wired to the WebSocket via Zustand.

### Graceful degradation (design principle — preserve it)
Runs with **nothing external configured**: mock Redis always; Elastic, Gemini, and the trained ML model are all optional with built-in fallbacks. Credentials simply upgrade the system from "fallback" to "full".

## Run locally

```bash
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:5173

# Backend
cd backend && python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                           # optional: add Gemini / Elastic creds
uvicorn app.main:app --reload                  # http://localhost:8000

# Tests
cd backend && pytest
```

## Layout
```
backend/app/    simulator, agents, llm (gemini), infra (pubsub/mock_redis), ml, elastic, mcp, routers, observability
frontend/src/   pages/, components/, store/
models/         trained surge_predictor.joblib
```

See [`CLAUDE.md`](CLAUDE.md) for architecture details. Licensed under [MIT](LICENSE).

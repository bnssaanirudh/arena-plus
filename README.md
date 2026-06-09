# ArenaPulse ✦ Autonomous World Cup Crowd & Commerce Coordinator

ArenaPulse is an **autonomous multi-agent system** for large-scale events (FIFA World Cup 2026). It doesn't answer questions — it **takes action**: a live stream of crowd telemetry triggers an agent that reasons about surge risk, checks vendor supply, verifies feasibility, and autonomously dispatches resources and hyper-local flash deals — all streamed to a live dashboard.

> Built for the **Google Cloud "Building Agents for Real-World Challenges"** hackathon — Gemini 3 brain · Google Cloud Agent Builder (ADK) · **Elastic** partner MCP track · Arize observability.
>
> 📋 Build status, phases, and the manual setup steps live in **[`HACKATHON_PLAN.md`](HACKATHON_PLAN.md)**. The product vision is in **[`project_idea.md`](project_idea.md)**.

## Agent architecture

```
  Live crowd telemetry (5 s tick)
           │
     ┌─────▼──────────┐
     │   Simulator    │  density · crowd count · zone · lat/lon
     └─────┬──────────┘
           │ pub/sub (in-memory async)
           ▼
  ╔════════════════════╗
  ║  ① Perception      ║  ML pre-filter → Gemini 3 multi-factor reasoning
  ║                    ║  → risk_level : LOW / MEDIUM / HIGH / CRITICAL
  ╚════════╤═══════════╝
           │
  ╔════════▼═══════════╗         ┌──────────────────────────────┐
  ║  ② Planning        ║────────▶│  ADK LlmAgent (google-adk)   │
  ║                    ║◀────────│  model: Gemini 3             │
  ╚════════╤═══════════╝         │  tool:  find_nearby_vendors  │◀─ Elastic MCP
           │                     └──────────────────────────────┘
           │  action · resources · target zone
           ▼
  ╔════════════════════╗
  ║  ③ Inventory       ║  allocate nearest in-stock vendors (geo-search)
  ╚════════╤═══════════╝
           │
  ╔════════▼═══════════╗
  ║  ④ Validation      ║  resource-sufficiency check → VALID / INVALID
  ╚════════╤═══════════╝
           │
  ╔════════▼═══════════╗  feasible?
  ║  ⑤ Verification    ║──── NO ──▶ inject correction → re-run ②③④
  ║   (RAG loop)       ║            max 2 self-correction replans
  ╚════════╤═══════════╝
           │ YES
    high-impact?
           │ YES
     ┌─────▼────────────┐
     │  ⑥ Human Gate    │  POST /api/v1/approvals/{event_id}
     │  Approve/Reject  │  ApprovalQueue panel (live dashboard)
     └─────┬────────────┘
           │ approved (or auto if low-impact)
           ▼
  ╔════════════════════╗
  ║  ⑦ Execution       ║  dispatch resources · B2B restock orders (PO-xxxx)
  ╚════════╤═══════════╝
           │
  ╔════════▼═══════════╗
  ║  ⑧ Marketing       ║  Gemini drafts hyper-local flash deal
  ║                    ║  zone · item · vendor · 30-min window
  ╚════════╤═══════════╝
           │ WebSocket  /api/v1/ws/dashboard
           ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Live Dashboard  (React 19 · Vite · Tailwind v4 · Zustand)  │
  │  Leaflet map · AgentPanel · ApprovalQueue                   │
  │  CampaignsPanel (flash deals) · RestockPanel (restock POs)  │
  └─────────────────────────────────────────────────────────────┘
```

| Hackathon pillar | Where it lives |
|---|---|
| **Gemini 3** (google-genai) | Perception (risk reasoning), Planning (decision), Marketing (flash deal copy) |
| **Google ADK** (google-adk) | `adk_agent.py` — real `LlmAgent` that autonomously calls the Elastic tool |
| **Elastic MCP** (partner track) | `find_nearby_vendors` FunctionTool; RAG constraint retrieval in Verification |
| **Arize Phoenix** | OpenTelemetry traces of every Gemini + MCP call |

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

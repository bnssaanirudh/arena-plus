# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ArenaPulse** is an autonomous multi-agent logistics platform for large-scale events (e.g. FIFA World Cup 2026). A simulator generates crowd telemetry, a multi-agent pipeline assesses surge risk and decides interventions, and a live dashboard streams the whole pipeline over WebSocket. It is a monorepo: `frontend/` (React + Vite) and `backend/` (FastAPI + Python agents).

> **This project targets the Google Cloud "Building Agents" hackathon (Elastic partner track).** Brain = **Gemini 3** (`google-genai`); orchestration = **Google Cloud Agent Builder / ADK**; superpower = **Elastic MCP server**; observability = **Arize**. The live build plan, phases, and **manual setup tasks** are in [`HACKATHON_PLAN.md`](HACKATHON_PLAN.md). Product vision in [`project_idea.md`](project_idea.md).

## Commands

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview
```

### Backend (`backend/`)
```bash
python -m venv venv
source venv/bin/activate          # (README says venv/Scripts/activate — that's Windows-only)
pip install -r requirements.txt
uvicorn app.main:app --reload     # serves on http://localhost:8000
```

### Tests (`backend/`)
```bash
pytest                                   # all tests
pytest tests/test_agents.py              # one file
pytest tests/test_agents.py::test_name   # one test
```
Tests use `pytest-asyncio`. Test files manipulate `sys.path` to import `app` directly, so run pytest from the `backend/` directory.

### ML model
```bash
python -m app.ml.generate_synthetic_data   # writes data/synthetic/training_features.csv
python -m app.ml.train_model               # writes models/surge_predictor.joblib (+ reports)
```
Run from `backend/`. The trained model lands in the top-level `models/` dir (not `backend/models/`); `predictor.py` resolves it via `parents[3]/models`.

## Architecture

### Backend data flow (the core loop)
1. **`simulator/engine.py`** (`SimulatorEngine`) — on startup (`SIMULATION_ACTIVE=True`), loops every `SIMULATION_INTERVAL_SECONDS` (default 5s). Each tick generates a random telemetry event, publishes it to the `arena:telemetry:raw` channel, and fires `agent_manager.process_event(event)` as a background task.
2. **`agents/manager.py`** (`AgentManager`) — state machine: **Perception → Planning → Inventory → Validation → Verification (RAG loop) → [approval gate] → Execution → Marketing**. Publishes each stage to its pub/sub channel. Short-circuits on `MONITOR`. The verification step can self-correct (re-run Planning+Inventory+Validation) up to `MAX_REPLANS=2` times when the plan is infeasible. When `APPROVAL_REQUIRED` and plan is high-impact, pauses at `PENDING_APPROVAL`; `_finalize()` is shared by auto and post-approval paths.
3. **`infra/pubsub.py`** (`pubsub`) — thin JSON+timestamp layer over **`infra/mock_redis.py`** (an in-memory async fake Redis). Channel names live in the `Channels` class. Raw telemetry events are kept in a 100-event in-memory ring buffer (`_telemetry_history`) served by `GET /api/v1/events/history`.
4. **`routers/websockets.py`** — `/api/v1/ws/dashboard` subscribes to the raw telemetry channel + all agent channels, multiplexes them into one stream, and pushes formatted messages to the browser.

So: **the simulator drives everything; pub/sub is the backbone; the WebSocket is the only thing the dashboard needs.**

### The Gemini brain (`backend/app/llm/gemini.py`)
Unified async client over the **`google-genai`** SDK. Supports two auth modes via config: **Vertex AI** (`GOOGLE_GENAI_USE_VERTEXAI=true` + project/location — the hackathon path) and **AI Studio** (`GEMINI_API_KEY`). `is_available()` gates every call; `generate_text()` / `generate_json(schema=…)` return `None` on any failure so callers fall back. (Legacy `google-generativeai` SDK has been removed.)

### The ADK agent (`backend/app/agents/adk_agent.py`)
The Google Cloud **Agent Builder** requirement, satisfied via the **ADK** (`google-adk`). Defines a real `LlmAgent` (`arenapulse_coordinator`) with Gemini 3 as the model and `find_nearby_vendors` (the **Elastic** geo-search) registered as a `FunctionTool` — so Gemini autonomously calls the partner MCP tool while reasoning. This is where all three hackathon pillars converge. Import-guarded and **optional**: `adk_available()` is True only when `USE_ADK` + `google-adk` installed + Gemini configured. `plan_via_adk()` returns a normalized plan or `None`. `PlanningAgent.plan()` tries paths in order — **ADK → direct Gemini JSON → heuristic** — and tags `plan["planner"]` with `adk`/`gemini`/`heuristic`. Nothing runs at import time, so boot stays zero-dep.

### Agents (`backend/app/agents/`)
Each agent is a class with one async method, chained by the manager:
- **`perception.py`** — two-stage risk assessment: (1) **ML pre-filter** via `ml/predictor.py` `surge_predictor` produces a fast triage signal (always heuristic at runtime — trained model needs 53 archival features, live events only have 4), (2) **Gemini primary reasoning** — `generate_json(schema=_RISK_SCHEMA)` produces the authoritative `{risk_level, probability, reasoning}`. Gemini result is the final answer; ML/heuristic is fallback when Gemini not configured. Output includes `pre_filter` key for transparency.
- **`planning.py`** — decision core. `plan()` tries **ADK first** (`adk_agent.plan_via_adk`), then direct Gemini JSON (`_gemini_plan` with structured schema), then deterministic heuristic. `plan["planner"]` tags which path ran (`adk`/`gemini`/`heuristic`). Actions: `MONITOR`, `DISPATCH_RESOURCES`, `REROUTE_CROWD`, `ALERT_SECURITY`, `EVACUATE_ZONE`.
- **`inventory.py`**, **`validation.py`**, **`execution.py`** — allocate resources, validate, then execute. `ValidationAgent` returns `INVALID` (with reason) on resource shortfall; execution is skipped. Execution respects `DRY_RUN`. On dispatch emits structured **B2B restock orders** (`restock_orders`: PO-xxxx, vendor, item, qty, supplier) recorded via MCP. After dispatch, `schedule_supplier_acks()` is fired as a background `asyncio.create_task` — after a random 8–20 s delay it publishes `AGENT_RESTOCK_ACK` → `restock_ack` WS message → frontend `acknowledgeRestockOrders()` updates order status badges from "ordered" → "✓ acked".
- **`verification.py`** (`VerificationAgent`) — RAG feasibility check (project_idea Step 3). Retrieves supply-chain constraints from `_CONSTRAINTS` (8 entries: road closures, depot capacity, lead times) by zone+action keyword match. Gemini checks feasibility; heuristic flags HIGH-severity blockers. If infeasible, returns `correction` instruction for self-correction. **To upgrade to Elastic**: replace `_retrieve_constraints()` body with an ES BM25/kNN call — interface unchanged.
- **`marketing.py`** (`MarketingAgent`) — commerce half (project_idea Action A). After any intervention, Gemini drafts a hyper-local flash deal (zone + item-by-event-type + nearest vendor + 30-min window); published to `AGENT_MARKETING`. Heuristic fallback.

### Graceful degradation (important)
The system runs with **nothing external configured**:
- **Elasticsearch** — `check_connection()` is best-effort; if ES is down, index setup/ingestion are skipped. MCP tools (`mcp/tools.py`) automatically fall back to the in-memory `VENDORS_DB` for vendor queries (haversine geo-filter) and in-memory cache for inventory updates. The full dispatch pipeline works without ES.
- **Gemini** — if neither Vertex AI nor an AI Studio key is configured, `planning.py` uses its heuristic and `perception.py` falls back to the ML/heuristic pre-filter result directly.
- **ML model** — `SurgePredictor` falls back to heuristic if `models/surge_predictor.joblib` missing, or if live feature coverage < 20%.
- **Redis** — no real Redis; `mock_redis.py` always used.

When adding features, preserve this zero-external-deps property — credentials should *upgrade* behavior, never be *required* to boot.

### Config (`backend/app/config.py`)
Pydantic `Settings` singleton (`settings`), env-var driven (case-sensitive). Key flags: `SIMULATION_ACTIVE`, `SIMULATION_INTERVAL_SECONDS`, `DRY_RUN`, `CORS_ORIGINS`, `ML_MODEL_PATH`. Gemini: `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GEMINI_MODEL` (default `gemini-3-pro-preview`), `GEMINI_API_KEY`. Agent: `USE_ADK` (default true — route planning through the ADK agent when available), `APPROVAL_REQUIRED` (default false), `APPROVAL_RESOURCE_THRESHOLD` (default 5000). See `backend/.env.example`.

### REST routers (`backend/app/routers/`, prefix `/api/v1`)
- `events` — `GET /history` (last 100 events, newest-first, `?limit=`), **`POST /trigger`** (inject single event + run pipeline), **`POST /demo`** (fire scripted 5-event surge cascade — background task, streams over WS)
- `vendors` — `GET /` returns in-memory vendor list
- `zones` — `GET /` returns zone names
- `approvals` — `GET /` lists pipelines held for human approval; **`POST /{event_id}`** `{approved: bool}` resumes (execute) or cancels (reject) a held pipeline
- `websockets` — `/ws/dashboard` multiplex WS. Every `agent_action` now carries `event_id` + `stage` (pipeline stage name) for the EventTimeline. Rich typed messages: `flash_deal`, `restock_orders`, `approval_needed`, `approval_resolved`, `verification`, `restock_ack` — consumed by the frontend panels.
- `mcp` — current home-grown tools (nearest vendor, overloaded zones, inventory) over ES with in-memory haversine fallback. **Being migrated to the official Elastic MCP server** as the agent's tool layer (HACKATHON_PLAN 1.4).

### Observability
`observability/tracer.py` `setup_phoenix()` — uses `arize-phoenix-otel` (lightweight OTLP, no OTel version conflict with google-adk). No-ops cleanly (INFO log only) when `PHOENIX_COLLECTOR_ENDPOINT` is not set. Set it to `http://localhost:6006/v1/traces` (local Phoenix server) or Arize AX cloud endpoint (M6) to enable tracing. `opentelemetry-sdk` is pinned `<1.42` to stay compatible with `google-adk 2.x`.

### Frontend (`frontend/src/`)
- React 19 + Vite 8 + Tailwind v4 (via `@tailwindcss/vite`, no config file) + TypeScript. Routing via `react-router-dom`. State via **Zustand** (`store/useStore.ts`) — types: `TelemetryEvent`, `AgentAction` (includes `event_id?`, `stage?`), `FlashDeal`, `RestockBatch`, `RestockOrder` (includes `ack_at?`), `RestockAck`, `PendingApproval`; all `addX` actions deduplicate by key; `acknowledgeRestockOrders(event_id, acks[])` updates order status in-place. Charts via `recharts`, maps via `react-leaflet` (`@types/leaflet` installed). animation via `framer-motion`.
- `pages/Dashboard.tsx` — live control room. WebSocket opened once via `useEffect([], [])` — **critical**: WS message handler reads store via `useStore.getState()` (not closure capture) to avoid stale references and prevent React 19 Strict Mode from spawning duplicate connections. `destroyed` + `ws !== currentWs` guards prevent stale `onclose` from reconnecting after component remounts. Handles: `telemetry`, `agent_action`, `flash_deal`, `restock_orders`, `approval_needed`, `approval_resolved`, `restock_ack`.
- Backend base URL read from `VITE_API_BASE` env var (default `http://localhost:8000`). Set in `frontend/.env`. WS URL derived by replacing `http` → `ws`.
- **`DemoControls`** — "Run Demo" fires `POST /api/v1/events/demo` (scripted 5-event cascade with live status label); "Trigger Surge" fires a single `crowd_surge`.
- **`EventTimeline`** — full-width panel (row 2, `h-[380px]`) between the analytics grid and the bottom panels. Groups all `agent_action` messages by `event_id` into horizontally-scrollable event cards, each showing all 8 pipeline stages in order with stage-colored dots and live completion badge ("N/7" → "done").
- **`CampaignsPanel`** — streams flash deals from `flash_deal` WS messages (headline, discount%, zone, vendor, drafted_by).
- **`RestockPanel`** — streams B2B restock order batches; each order shows a live status badge: pulsing "ordered" → solid "✓ acked" when `restock_ack` arrives (8–20 s after dispatch).
- **`ApprovalQueue`** — shows `PENDING_APPROVAL` actions with live Approve/Reject buttons wired to `POST /api/v1/approvals/{event_id}`; auto-clears on `approval_resolved`.
- Dashboard layout: row 1 = Analytics (`h-[500px]/h-[650px]`, col-8) + AgentPanel (col-4); row 2 = EventTimeline (`h-[380px]`, full-width); row 3 = ApprovalQueue + CampaignsPanel + RestockPanel (each `h-[400px]`, col-4). All fixed heights — no unbounded growth.

### Demo scenario (`backend/app/simulator/demo.py`)
`run_demo_scenario()`: 5-event scripted cascade (~50s total): normal_flow → congestion → crowd_surge (South Gate — road closure triggers RAG self-correction) → security_alert → recovery. Each event has SoFi Stadium lat/lon. All random events from `simulator/events.py` also now include lat/lon so the ADK vendor-search tool always has coordinates.

## Known issues / tech debt
- **Live ADK + Elastic verification pending** — ADK and Elastic MCP paths are wired but untested with real creds; blocked on M3 (Gemini model id) and M4/M5 (Elastic endpoint).
- **RAG corpus is in-memory** — `verification.py` `_CONSTRAINTS` is a hardcoded list. Swap `_retrieve_constraints()` to an Elastic call when ES creds land.
- **OTel version pin** — `opentelemetry-sdk<1.42` required by `google-adk 2.x`; `arize-phoenix-otel` (lightweight) used instead of the full `arize-phoenix` server package to avoid the conflict. Full Phoenix UI traces require M6 (Arize AX creds) + setting `PHOENIX_COLLECTOR_ENDPOINT`.

## Knowledge graph (code-review-graph MCP)

This repo is indexed by the `code-review-graph` MCP server. Prefer its tools over Grep/Glob/Read for exploration, impact analysis, and review (`semantic_search_nodes`, `query_graph`, `get_impact_radius`, `detect_changes`, `get_review_context`). The graph auto-updates on file changes. Fall back to file tools only when the graph doesn't cover what you need.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

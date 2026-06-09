# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**ArenaPulse** is an autonomous multi-agent logistics intelligence platform for large-scale events (e.g. FIFA World Cup 2026). A simulator generates crowd telemetry, a multi-agent pipeline assesses surge risk and decides interventions, and a live dashboard streams the whole pipeline over WebSocket. It is a monorepo: `frontend/` (React + Vite) and `backend/` (FastAPI + Python agents).

> README and `context.md` are up to date as of 2026-06-09. See [`AUDIT.md`](AUDIT.md) for the bug inventory and [`TASKS.md`](TASKS.md) for the live work list.

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
2. **`agents/manager.py`** (`AgentManager`) — a fixed state machine: **Perception → Planning → Inventory → Validation → Execution**. It publishes the intermediate result of each stage to a dedicated pub/sub channel. The pipeline short-circuits and returns early if Planning decides `MONITOR`.
3. **`infra/pubsub.py`** (`pubsub`) — thin JSON+timestamp layer over **`infra/mock_redis.py`** (an in-memory async fake Redis). Channel names live in the `Channels` class. Raw telemetry events are kept in a 100-event in-memory ring buffer (`_telemetry_history`) served by `GET /api/v1/events/history`.
4. **`routers/websockets.py`** — `/api/v1/ws/dashboard` subscribes to the raw telemetry channel + all agent channels, multiplexes them into one stream, and pushes formatted messages to the browser.

So: **the simulator drives everything; pub/sub is the backbone; the WebSocket is the only thing the dashboard needs.**

### Agents (`backend/app/agents/`)
Each agent is a class with one async method, chained by the manager:
- **`perception.py`** — two-stage risk assessment: (1) ML via `ml/predictor.py` `surge_predictor`, (2) optional Gemini LLM. Falls back to heuristic if neither available. The predictor maps live telemetry fields to model feature space via `_TELEMETRY_FEATURE_MAP`; if coverage < 20% it falls back to the heuristic automatically.
- **`planning.py`** — maps risk level + event type to an action (`MONITOR`, `DISPATCH_RESOURCES`, `REROUTE_CROWD`, `ALERT_SECURITY`, `EVACUATE_ZONE`) and resource quantities.
- **`inventory.py`**, **`validation.py`**, **`execution.py`** — allocate resources, validate the plan, then execute. `ValidationAgent` returns `INVALID` (with reason) when a resource shortfall is detected; execution is skipped in that case. Execution respects the `DRY_RUN` flag (logs instead of mutating state).

### Graceful degradation (important)
The system runs with **nothing external configured**:
- **Elasticsearch** — `check_connection()` is best-effort; if ES is down, index setup/ingestion are skipped. MCP tools (`mcp/tools.py`) automatically fall back to the in-memory `VENDORS_DB` for vendor queries (haversine geo-filter) and in-memory cache for inventory updates. The full dispatch pipeline works without ES.
- **Gemini** (`GEMINI_API_KEY` env var) — perception falls back to ML model / heuristic if unset.
- **ML model** — `SurgePredictor` falls back to heuristic if `models/surge_predictor.joblib` missing. Even when loaded, uses heuristic if live feature coverage < 20%.
- **Redis** — no real Redis; `mock_redis.py` always used.

When adding features, preserve this zero-external-deps property.

### Config (`backend/app/config.py`)
Pydantic `Settings` singleton (`settings`). Key flags: `SIMULATION_ACTIVE`, `SIMULATION_INTERVAL_SECONDS`, `DRY_RUN`, `GEMINI_API_KEY`/`GEMINI_MODEL`, `ML_MODEL_PATH`, `CORS_ORIGINS`. Env vars are case-sensitive.

### REST routers (`backend/app/routers/`, prefix `/api/v1`)
- `events` — `GET /history` (last 100 events from in-memory ring buffer, newest-first, `?limit=`), **`POST /trigger`** (inject event + run pipeline)
- `vendors` — `GET /` returns in-memory vendor list
- `zones` — `GET /` returns zone names
- `websockets` — `/ws/dashboard` multiplex WS
- `mcp` — ES-backed tools (nearest vendor, overloaded zones, inventory) with in-memory fallback

### Observability
`observability/tracer.py` `setup_phoenix()` wires Arize Phoenix + OpenTelemetry at startup.

### Frontend (`frontend/src/`)
- React 19 + Vite 8 + Tailwind v4 (via `@tailwindcss/vite`, no config file) + TypeScript. Routing via `react-router-dom`. State via **Zustand** (`store/useStore.ts`). Charts via `recharts`, maps via `react-leaflet`, animation via `framer-motion`.
- `pages/Dashboard.tsx` — live control room. Opens WebSocket with exponential-backoff reconnect (1s→30s); shows Live/Reconnecting/Offline badge. Feeds Zustand store.
- Backend base URL read from `VITE_API_BASE` env var (default `http://localhost:8000`). Set in `frontend/.env`. WS URL derived by replacing `http` → `ws`.
- **`DemoControls`** "Trigger Surge" button calls `POST /api/v1/events/trigger` to manually inject a `crowd_surge` event through the full pipeline.

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

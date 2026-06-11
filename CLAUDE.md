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
Tests use `pytest-asyncio` (**57 tests**). Test files manipulate `sys.path` to import `app` directly, so run pytest from the `backend/` directory. `test_execution.py` covers the B2B restock-order builder + the supplier-ack loop (the 8–20 s sleep is monkeypatched out so it runs instantly). **`tests/conftest.py` blanks `GEMINI_API_KEY` / disables ADK + plan eval before `app` imports** — tests assert the deterministic heuristic paths, and a live key would make them quota-dependent and flaky (this actually happened; do not remove the conftest overrides).

### ML model
```bash
python -m app.ml.generate_synthetic_data   # writes data/synthetic/training_features.csv
python -m app.ml.train_model               # writes models/surge_predictor.joblib (+ reports)
```
Run from `backend/`. The trained model lands in the top-level `models/` dir (not `backend/models/`); `predictor.py` resolves it via `parents[3]/models`.

## Architecture

### Backend data flow (the core loop)
1. **`simulator/engine.py`** (`SimulatorEngine`) — on startup (`SIMULATION_ACTIVE=True`), loops every `SIMULATION_INTERVAL_SECONDS` (default 5s). Each tick generates a random telemetry event, publishes it to the `arena:telemetry:raw` channel, and fires `agent_manager.process_event(event)` as a background task. **`SIMULATION_ACTIVE` is set to `false` in `backend/.env`** — the auto-simulator is disabled to preserve Gemini API quota (each pipeline run = ~4 Gemini calls; 5 RPM limit on the free tier is exhausted in seconds otherwise). Use manual triggers (`POST /api/v1/events/trigger`) or the scripted demo cascade (`POST /api/v1/events/demo`) instead.
2. **`agents/manager.py`** (`AgentManager`) — state machine: **Perception → Planning → Inventory → Validation → Verification (RAG loop) → [approval gate] → Execution → Marketing**. Publishes each stage to its pub/sub channel. Short-circuits on `MONITOR`. The verification step can self-correct (re-run Planning+Inventory+Validation) up to `MAX_REPLANS=2` times when the plan is infeasible. When `APPROVAL_REQUIRED` and plan is high-impact, pauses at `PENDING_APPROVAL`; `_finalize()` is shared by auto and post-approval paths.
3. **`infra/pubsub.py`** (`pubsub`) — thin JSON+timestamp layer over **`infra/mock_redis.py`** (an in-memory async fake Redis). Channel names live in the `Channels` class. Raw telemetry events are kept in a 100-event in-memory ring buffer (`_telemetry_history`) served by `GET /api/v1/events/history`.
4. **`routers/websockets.py`** — `/api/v1/ws/dashboard` subscribes to the raw telemetry channel + all agent channels, multiplexes them into one stream, and pushes formatted messages to the browser.

So: **the simulator drives everything; pub/sub is the backbone; the WebSocket is the only thing the dashboard needs.**

### The Gemini brain (`backend/app/llm/gemini.py`)
Unified async client over the **`google-genai`** SDK. Supports two auth modes via config: **Vertex AI** (`GOOGLE_GENAI_USE_VERTEXAI=true` + project/location — the hackathon path) and **AI Studio** (`GEMINI_API_KEY`). `is_available()` gates every call; `generate_text()` / `generate_json(schema=…)` return `None` on any failure so callers fall back. `embed_texts()` / `embed_text()` wrap the embedding model (`GEMINI_EMBED_MODEL`, default `gemini-embedding-001`, truncated to `EMBED_DIMS=768` to match the ES `dense_vector` mapping) — used for constraint ingestion + hybrid RAG queries; also return `None` on failure. (Legacy `google-generativeai` SDK has been removed.)

### The ADK agent (`backend/app/agents/adk_agent.py`)
The Google Cloud **Agent Builder** requirement, satisfied via the **ADK** (`google-adk`). Defines a real `LlmAgent` (`arenapulse_coordinator`) with Gemini 3 as the model. Tools: (1) **official Elastic `MCPToolset`** (`SseServerParams` → `ELASTIC_MCP_URL`) registered first when configured — Gemini calls `elasticsearch_search` natively via the official Elastic MCP server; (2) **`find_nearby_vendors` `FunctionTool`** — local Elastic client wrapper, fallback when MCP server not set. This is where all three hackathon pillars converge. Import-guarded and **optional**: `adk_available()` is True only when `USE_ADK` + `google-adk` installed + Gemini configured. `plan_via_adk()` returns a normalized plan or `None`. `PlanningAgent.plan()` tries paths in order — **ADK → direct Gemini JSON → heuristic** — and tags `plan["planner"]` with `adk`/`gemini`/`heuristic`. Nothing runs at import time, so boot stays zero-dep.

### Agents (`backend/app/agents/`)
Each agent is a class with one async method, chained by the manager:
- **`perception.py`** — two-stage risk assessment: (1) **ML pre-filter** via `ml/predictor.py` `surge_predictor` produces a fast triage signal (always heuristic at runtime — trained model needs 53 archival features, live events only have 4), (2) **Gemini primary reasoning** — `generate_json(schema=_RISK_SCHEMA)` produces the authoritative `{risk_level, probability, reasoning}`. Gemini result is the final answer; ML/heuristic is fallback when Gemini not configured. Output includes `pre_filter` key for transparency.
- **`planning.py`** — decision core. `plan()` tries **ADK first** (`adk_agent.plan_via_adk`), then direct Gemini JSON (`_gemini_plan` with structured schema), then deterministic heuristic. `plan["planner"]` tags which path ran (`adk`/`gemini`/`heuristic`). Actions: `MONITOR`, `DISPATCH_RESOURCES`, `REROUTE_CROWD`, `ALERT_SECURITY`, `EVACUATE_ZONE`. **Decision memory**: `recall_past_decisions(zone)` queries the `agent_decisions` ES index for recent PlanningAgent decisions in the zone and injects them into both LLM prompts (via `event_data["_past_decisions"]`); the manager records every planning decision back to that index (`_record_planning_decision`, fire-and-forget) — a self-improving loop on Elastic. Both prompts also honor `event_data["_constraint_correction"]` (self-correction context — was previously injected by the manager but never reached the prompt; fixed).
- **`inventory.py`**, **`validation.py`**, **`execution.py`** — allocate resources, validate, then execute. `ValidationAgent` returns `INVALID` (with reason) on resource shortfall; execution is skipped. Execution respects `DRY_RUN`. On dispatch emits structured **B2B restock orders** (`restock_orders`: PO-xxxx, vendor, item, qty, supplier) recorded via MCP, plus an **`impact` estimate** (`_estimate_impact`: response-time saved vs 18-min manual baseline, units dispatched, revenue protected at $4 water / $9 food) → `impact` WS message → dashboard `ImpactStrip` cumulative stat cards. After dispatch, `schedule_supplier_acks()` is fired as a background `asyncio.create_task` — after a random 8–20 s delay it publishes `AGENT_RESTOCK_ACK` → `restock_ack` WS message → frontend `acknowledgeRestockOrders()` updates order status badges from "ordered" → "✓ acked".
- **`verification.py`** (`VerificationAgent`) — RAG feasibility check (project_idea Step 3). `_retrieve_constraints()` runs a **hybrid BM25 + kNN query** against the `supply_constraints` ES index: BM25 `should` clauses (zone boosted, description, HIGH severity) plus a `knn` clause over Gemini embeddings of the query (`gemini.embed_text`). Falls back to BM25-only when embedding fails, and to the in-memory `_CONSTRAINTS` list (8 entries: road closures, depot capacity, lead times) when ES is down. Hits exclude the `embedding` field. Gemini checks feasibility; heuristic flags HIGH-severity blockers. If infeasible, returns `correction` instruction for self-correction. On replan the manager publishes the **rejected plan** alongside the corrected one → `counterfactual` WS message → dashboard side-by-side panel.
- **`marketing.py`** (`MarketingAgent`) — commerce half (project_idea Action A). After any intervention, Gemini drafts a hyper-local flash deal (zone + item-by-event-type + nearest vendor + 30-min window); published to `AGENT_MARKETING`. Heuristic fallback.

### Graceful degradation (important)
The system runs with **nothing external configured**:
- **Elasticsearch** — `check_connection()` is best-effort; if ES is down, index setup/ingestion are skipped. MCP tools (`mcp/tools.py`) automatically fall back to the in-memory `VENDORS_DB` for vendor queries (haversine geo-filter) and in-memory cache for inventory updates. The full dispatch pipeline works without ES.
- **Gemini** — if neither Vertex AI nor an AI Studio key is configured, `planning.py` uses its heuristic and `perception.py` falls back to the ML/heuristic pre-filter result directly.
- **ML model** — `SurgePredictor` falls back to heuristic if `models/surge_predictor.joblib` missing, or if live feature coverage < 20%.
- **Redis** — no real Redis; `mock_redis.py` always used.

When adding features, preserve this zero-external-deps property — credentials should *upgrade* behavior, never be *required* to boot.

### Config (`backend/app/config.py`)
Pydantic-v2 `Settings` singleton (`settings`), env-var driven, configured via `model_config = SettingsConfigDict(case_sensitive=True, extra="ignore")`. Key flags: `SIMULATION_ACTIVE` (**set to `false` in `.env`** — see simulator note above), `SIMULATION_INTERVAL_SECONDS`, `DRY_RUN`, `CORS_ORIGINS`, `ML_MODEL_PATH`, `STRICT_RAG` (default true — RAG self-correction triggers on infeasible plans), `PLAN_EVAL_ENABLED` (default true — LLM-judge per pipeline), `GEMINI_EMBED_MODEL` + `EMBED_DIMS` (semantic RAG embeddings). Gemini: `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GEMINI_MODEL` (**currently `gemini-3-flash-preview`** — the correct AI Studio API ID; `gemini-3-flash` 404s on AI Studio), `GEMINI_API_KEY`. Agent: `USE_ADK` (default true — route planning through the ADK agent when available), `APPROVAL_REQUIRED` (default false), `APPROVAL_RESOURCE_THRESHOLD` (default 5000). See `backend/.env.example`. `STRICT_RAG` and `APPROVAL_REQUIRED` can be toggled at runtime via `POST /api/v1/status/settings`.

**Gemini model IDs on AI Studio** (confirmed working with the project key): `gemini-3-flash-preview` (5 RPM / 20 RPD — primary, satisfies hackathon "Gemini 3" requirement), `gemini-3.1-flash-lite` (15 RPM / 500 RPD — dev fallback if quota runs out), `gemini-3.5-flash` (5 RPM / 20 RPD). The `google-genai` SDK expects the short form without the `models/` prefix.

### REST routers (`backend/app/routers/`, prefix `/api/v1`)
- `events` — `GET /history` (last 100 events, newest-first, `?limit=`), **`POST /trigger`** (inject single event + run pipeline), **`POST /demo`** (fire scripted 5-event surge cascade — background task, streams over WS), **`POST /demo/multi`** (3 concurrent zone surges staggered 1.5 s — parallel pipelines compete for the same vendor stock; "Multi-Surge" button in DemoControls)
- `analytics` — **`GET /summary`**: three datasets, each from a real **ES|QL** query (`crowd_events` zone aggregation, `agent_decisions` per-agent counts, `vendors` stock levels) via `es_client.esql.query`. Each dataset carries `source: esql|mock` + the verbatim query text (shown in the UI badge); any failure flips that dataset to a static mock so the page always renders.
- `vendors` — `GET /` returns in-memory vendor list
- `zones` — `GET /` returns zone names
- `approvals` — `GET /` lists pipelines held for human approval; **`POST /{event_id}`** `{approved: bool}` resumes (execute) or cancels (reject) a held pipeline
- `status` — `GET /` full system health (ES, Arize, Gemini, simulator, flags); **`POST /settings`** live-patch `APPROVAL_REQUIRED`, `STRICT_RAG`, `SIMULATION_INTERVAL_SECONDS`
- `chat` — `POST /` AI copilot endpoint; assembles live system context (ES counts, low-stock vendors, simulator state) into a Gemini `system_instruction`; heuristic fallback when Gemini unconfigured
- `websockets` — `/ws/dashboard` multiplex WS. Every `agent_action` now carries `event_id` + `stage` (pipeline stage name) for the EventTimeline. Rich typed messages: `flash_deal`, `restock_orders`, `approval_needed`, `approval_resolved`, `verification`, `restock_ack`, `counterfactual` (rejected vs corrected plan on self-correction), `impact` (per-dispatch impact estimate), `plan_eval` (LLM-judge score; pipeline stage `EVALUATED` emits only this, no agent_action row) — consumed by the frontend panels. Messages published while a client is disconnected are not replayed (no buffering by design).
- `mcp` — current home-grown tools (nearest vendor, overloaded zones, inventory) over ES with in-memory haversine fallback. **Being migrated to the official Elastic MCP server** as the agent's tool layer (HACKATHON_PLAN 1.4).

`observability/evaluator.py` `evaluate_plan()` — **LLM-judge** (HACKATHON polish): after `_finalize`, a Gemini judge scores the executed plan 1–10. The score lands (a) as `eval.score`/`eval.rationale` attributes on a `plan_eval` OTel span → visible in Arize Phoenix, and (b) as a `plan_eval` WS message → ⚖ N/10 badge on the EventTimeline card. Config-gated by `PLAN_EVAL_ENABLED` (default true; 1 extra Gemini call per pipeline; disabled in tests via conftest). Fire-and-forget — failures are logged and swallowed.

`observability/tracer.py` `setup_phoenix()` — uses `arize-phoenix-otel` (lightweight OTLP, no OTel version conflict with google-adk). No-ops cleanly (INFO log only) when `PHOENIX_COLLECTOR_ENDPOINT` is not set. Set it to the **OTLP ingest URL** from Arize AX Settings (e.g. `https://otlp.arize.com/v1`) — **not** the web-UI space URL (`app.arize.com/s/...`). `opentelemetry-sdk` pinned `<1.42` for `google-adk 2.x` compat. **Critical:** do NOT install `arize-phoenix` (full server) — it breaks `from phoenix.otel import register` on Python 3.13 via a broken `phoenix.evals.models` import chain. Use only `arize-phoenix-otel`. `openinference-instrumentation-google-genai` is installed and auto-instruments all Gemini calls once `PHOENIX_COLLECTOR_ENDPOINT` is set. **Correct endpoint format for Arize-hosted Phoenix:** `https://app.phoenix.arize.com/s/<space>/v1/traces` (space-scoped) with `Authorization: Bearer <key>` — the root `/v1/traces` and `api_key` header both return 401.

### Frontend (`frontend/src/`)
- React 19 + Vite 8 + Tailwind v4 (via `@tailwindcss/vite`) + TypeScript. Routing via `react-router-dom`. State via **Zustand** (`store/useStore.ts`) — types: `TelemetryEvent`, `AgentAction` (includes `event_id?`, `stage?`), `FlashDeal`, `RestockBatch`, `RestockOrder` (includes `ack_at?`), `RestockAck`, `PendingApproval`, `VerificationInfo`, `Counterfactual` (rejected/corrected `PlanSnapshot` pair), `ImpactStat`, `PlanEval`; all `addX` actions deduplicate by key; `acknowledgeRestockOrders(event_id, acks[])` updates order status in-place; `verifications` is an `event_id → VerificationInfo` map fed by `addVerification` (keeps the highest `replan_count` per event); `planEvals` is an `event_id → PlanEval` map; `impacts` accumulates per-event impact stats (summed by `ImpactStrip`). Charts via `recharts`, maps via `react-leaflet` (`@types/leaflet` installed), animation via `framer-motion`.
- **Vite build is chunk-split** (`vite.config.ts` `manualChunks`): `recharts`→`charts`, `leaflet`/`react-leaflet`→`map`, `framer-motion`→`motion`. `StadiumMap` is `React.lazy`-loaded behind a `Suspense` fallback so leaflet isn't in the initial bundle. Main app chunk is ~272 kB (down from a single 905 kB bundle).
- **`components/Nav.tsx`** — shared nav component used by all 11 pages. Three variants: `landing` (scroll-aware, transparent on hero → dark on scroll), `dashboard` (absolute, white text, pointer-events on interactive elements only), `default` (sticky frosted white header). Uses `useLocation` to auto-highlight the active route in orange. Exposes all 11 routes: Home, System Dashboard, The Platform, Capabilities, Case Studies, Our Process, B2B Supply Hub, Command Center, Global Analytics, System Status, Contact. **Do not add per-page nav markup** — always use `<Nav variant="..." />`.
- **Pages**: `Landing`, `Dashboard`, `Platform`, `Capabilities`, `Operations` (Case Studies), `Process`, `Contact`, `SupplyHub` (B2B), `OperatorCenter` (Command Center), `GlobalAnalytics`, `SystemStatus`. All routed in `App.tsx`. `AICopilot` is rendered globally in `App.tsx` (outside routes) so it floats on every page.
- `pages/Dashboard.tsx` — live control room. WebSocket opened once via `useEffect([], [])` — **critical**: WS message handler reads store via `useStore.getState()` (not closure capture) to avoid stale references and prevent React 19 Strict Mode from spawning duplicate connections. `destroyed` + `ws !== currentWs` guards prevent stale `onclose` from reconnecting after component remounts. Handles: `telemetry`, `agent_action`, `flash_deal`, `restock_orders`, `approval_needed`, `approval_resolved`, `restock_ack`, `verification`, `counterfactual`, `impact`, `plan_eval`.
- `pages/SystemStatus.tsx` — live health dashboard; polls `GET /api/v1/status/` on load and via "Diagnostic Check" button. Shows ES index counts, Arize Phoenix status, Gemini config, simulator state, mock Arize trace waterfall, Gemini rate-limit table.
- `pages/OperatorCenter.tsx` (`/operator`) — Command Center; loads current settings from `GET /api/v1/status/`, patches via `POST /api/v1/status/settings`. Toggles for human-in-the-loop oversight + Strict RAG; simulator tick speed dropdown; event injection panel.
- `pages/GlobalAnalytics.tsx` (`/analytics`) — **live ES|QL dashboard**: fetches `GET /api/v1/analytics/summary`; every chart shows a "Live ES|QL" / "Mock data" badge that expands (`<details>`) to the verbatim ES|QL query. Zone density chart uses **dual Y-axes** (density 0–10 left, event counts right — single axis made density bars invisible). Zone filter built from live data.
- `pages/SupplyHub.tsx` (`/supply-hub`) — fetches live vendor inventory from `GET /api/v1/vendors`; inline restock form updates local state optimistically.
- `components/AICopilot.tsx` — floating chat widget (orange circle, bottom-right). Posts to `POST /api/v1/chat/` with message + 6-turn history. Heuristic fallback reply when backend offline. Default port `8000`.
- Backend base URL read from `VITE_API_BASE` env var (default `http://localhost:8000`). Set in `frontend/.env`. WS URL derived by replacing `http` → `ws`.
- **`DemoControls`** — "Run Demo" fires `POST /api/v1/events/demo` (scripted 5-event cascade with live status label); "Trigger Surge" fires a single `crowd_surge`; "Multi-Surge" fires `POST /api/v1/events/demo/multi` (3 concurrent zone surges, md+ screens only).
- **`ImpactStrip`** — 4 stat cards above the System Operations grid: cumulative response-time saved, units auto-dispatched, revenue protected, vendor engagements. Fed by `impact` WS messages; labelled "estimated vs 18-min manual ops cycle".
- **`CounterfactualPanel`** — renders only when a self-correction happened; rejected plan (red, strikethrough) vs corrected plan (green) side by side with the blocking constraint between them. Fed by `counterfactual` WS messages (max 2 shown).
- **`AgentPanel`** — newest action's reasoning types out character-by-character (`Typewriter`, ~80 chars/s, blinking cursor) — the "agent thinking live" effect. Keys are content-based so older entries don't re-type when the list shifts.
- **`EventTimeline`** — full-width panel (row 2, `h-[380px]`) between the analytics grid and the bottom panels. Groups all `agent_action` messages by `event_id` into horizontally-scrollable event cards, each showing all 8 pipeline stages in order with stage-colored dots and live completion badge ("N/7" → "done"). Each card header also shows a **RAG verification badge** from the `verifications` store map: `⑤ feasible` (indigo) or `⑤ ↻N` (amber, N self-corrections) with a tooltip of the constraint/correction detail, plus an **LLM-judge badge** `⚖ N/10` (purple) from the `planEvals` map with the rationale as tooltip.
- **`CampaignsPanel`** — streams flash deals from `flash_deal` WS messages (headline, discount%, zone, vendor, drafted_by).
- **`RestockPanel`** — streams B2B restock order batches; each order shows a live status badge: pulsing "ordered" → solid "✓ acked" when `restock_ack` arrives (8–20 s after dispatch).
- **`ApprovalQueue`** — shows `PENDING_APPROVAL` actions with live Approve/Reject buttons wired to `POST /api/v1/approvals/{event_id}`; auto-clears on `approval_resolved`.
- Dashboard layout: ImpactStrip (stat cards, above row 1); row 1 = Analytics (`h-[500px]/h-[650px]`, col-8) + AgentPanel (col-4); row 2 = EventTimeline (`h-[380px]`, full-width); CounterfactualPanel (conditional, between rows 2 and 3); row 3 = ApprovalQueue + CampaignsPanel + RestockPanel (each `h-[400px]`, col-4). All fixed heights — no unbounded growth.
- **`frontend/capture-hero.mjs`** — one-off Playwright script that loads the dashboard, fires the demo cascade, and saves `docs/dashboard-hero.png` + `docs/dashboard-operations.png` (the README hero). Needs `npx playwright install chromium`; use `waitUntil: 'domcontentloaded'` (the WS + OSM tiles keep `load`/`networkidle` from ever firing).

### Demo scenario (`backend/app/simulator/demo.py`)
`run_demo_scenario()`: 5-event scripted cascade (~50s total): normal_flow → congestion → crowd_surge (South Gate — road closure triggers RAG self-correction) → security_alert → recovery. Each event has SoFi Stadium lat/lon. All random events from `simulator/events.py` also now include lat/lon so the ADK vendor-search tool always has coordinates.

### Deployment
- **Backend** — `backend/Dockerfile` (python:3.13-slim, installs `requirements.txt`, runs `uvicorn app.main:app` honoring Cloud Run's `$PORT`). Build from the `backend/` dir; `.dockerignore` excludes `venv/`, tests, `.env`. The ML model is intentionally *not* baked in — `SurgePredictor` falls back to the heuristic if `models/surge_predictor.joblib` is absent. Ready for `gcloud run deploy` once M9 lands.
- **Frontend** — `frontend/vercel.json` (Vite framework preset, SPA rewrite to `/index.html`). Set `VITE_API_BASE` to the deployed backend URL in the Vercel project's env vars (see `frontend/.env.example`). Ready for Vercel once M10 lands.

## Known issues / tech debt
- **Elastic MCP server (M5 done)** — Official Elastic MCP server wired into ADK via `MCPToolset` + `SseServerParams`. Set `ELASTIC_MCP_URL=http://<host>:<port>/sse` in env (Railway/local) to activate. When set, the ADK agent registers the official toolset as its first tool (Gemini can call `elasticsearch_search` natively); `find_nearby_vendors` FunctionTool stays as fallback. Docker: `docker run -p 3001:3001 -e ES_URL=... -e ES_API_KEY=... docker.elastic.co/integrations/mcp-server-elasticsearch:latest`.
- **RAG corpus on Elastic** — `verification.py` `_retrieve_constraints()` runs a **hybrid BM25+kNN** query on the `supply_constraints` ES index (BM25 text match + `knn` over Gemini `dense_vector` embeddings). Falls back to BM25-only when embedding fails, in-memory when ES is down. Constraints are ingested with embeddings on startup via `elastic/ingestion.py:ingest_constraints()`. Fully working.
- **Arize traces working** — Endpoint `https://app.phoenix.arize.com/s/akshatagrawal-work/v1/traces`, auth `Authorization: Bearer <key>`. Gemini calls auto-instrumented. Check `app.phoenix.arize.com/s/akshatagrawal-work` for the `arenapulse` project traces.
- **Gemini 503 (transient)** — Free tier `gemini-3-flash-preview` hits 503 under high demand. Swap `GEMINI_MODEL=gemini-3.1-flash-lite` in `.env` (500 RPD) if it persists.
- **OTel version pin** — `opentelemetry-sdk<1.42` required by `google-adk 2.x`; all OTel packages pinned to 1.41.1. Do NOT run `pip install --upgrade opentelemetry-*` — it will pull 1.42.x and break ADK.
- **Gemini quota** — Free tier is 5 RPM / 20 RPD for `gemini-3-flash-preview`. Auto-simulator is disabled (`SIMULATION_ACTIVE=false`) to avoid burning quota. Use manual triggers only during dev. **`.env` currently runs `gemini-3.1-flash-lite` (500 RPD)** — the 20-RPD limit was hit during dev (2026-06-10); swap back to `gemini-3-flash-preview` for judging if the "Gemini 3" label matters and quota allows. Each pipeline is now ~5-6 Gemini calls (perception, planning, verification, marketing, eval, + 1 embedding).
- **Local ports** — another project's Docker containers squat on 8000 and 5173 on this machine; `.claude/launch.json` runs the backend on **8001** and Vite on **5174**, and `frontend/.env` points `VITE_API_BASE` at 8001. Revert to 8000/5173 if those containers are stopped. `localhost:5174` resolves to IPv6 (`::1`) — `127.0.0.1` won't reach Vite.

## Knowledge graph (code-review-graph MCP)

This repo is indexed by the `code-review-graph` MCP server. Prefer its tools over Grep/Glob/Read for exploration, impact analysis, and review (`semantic_search_nodes`, `query_graph`, `get_impact_radius`, `detect_changes`, `get_review_context`). The graph auto-updates on file changes. Fall back to file tools only when the graph doesn't cover what you need.

## Graphify knowledge graph

A full structural + semantic knowledge graph of the codebase lives in `graphify-out/`:

| File | Use |
|------|-----|
| `graphify-out/graph.html` | Interactive browser visualization (open directly, no server needed) |
| `graphify-out/graph.json` | Raw graph for `/graphify query` and programmatic access |
| `graphify-out/GRAPH_REPORT.md` | Audit report — god nodes, community cohesion, surprising connections |

**Built from:** 100 files · 579 nodes · 890 edges · 66 communities · 18 hyperedges (AST + semantic extraction).

**God nodes** (highest cross-community connectivity): `ExecutionAgent` (40 edges) → `AgentManager` (39) → `VerificationAgent` (37). These are the highest-blast-radius touch points — changes here ripple everywhere.

**Key communities:**
- *Agent Pipeline Core* — `AgentManager`, `ExecutionAgent`, `InventoryAgent` + orchestration logic
- *ADK Agent & Gemini Brain* — `adk_agent.py`, `LlmAgent`, `plan_via_adk`, `gemini.py`
- *MCP Tools & Geo-Search* — `MCPTools`, `find_nearest_vendor`, haversine fallback chain
- *RAG Verification* — `VerificationAgent`, `_retrieve_constraints`, self-correction loop
- *Live Dashboard Panels* — React components reading from Zustand store over WebSocket
- *Elastic Client Layer* + *Elastic Index & Ingestion* — ES client, index schemas, ingest functions

**To update after code changes:**
```bash
cd /Users/agraw/Desktop/personal/projects/arena-plus
/graphify . --update
```

**To query the graph:**
```
/graphify query "how does find_nearby_vendors reach haversine fallback"
```

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

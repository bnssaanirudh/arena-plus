# ArenaPulse — Task List

_Living checklist. Keep updated: `[ ]` pending · `[~]` in progress · `[x]` done. Last updated: 2026-06-09._

Legend: 🔴 critical · 🟠 major · 🟡 minor · 🧹 cleanup · ➕ gap/feature

---

## 1. 🔴 Fix ML feature contract  — _status: [x] done_
Model predicts on all-zeros because live event keys ≠ trained `feature_names`. (AUDIT C1)
- [x] 1.1 Chose approach (a): live-telemetry→feature adapter in `predictor.py`
- [x] 1.2 `_TELEMETRY_FEATURE_MAP` maps density_score/predicted_people → model features; coverage guard falls back to heuristic when <20% coverage
- [x] 1.3 N/A (not retraining)
- [x] 1.4 Coverage warning logged; auto-fallback to heuristic when coverage too low
- [x] 1.5 Unit tests added: different density_scores → different probabilities ✅

## 2. 🔴 Wire vendor source so dispatch works without ES — _status: [x] done_
Dispatch path dead when ES down. (AUDIT C2)
- [x] 2.1 `MCPTools.find_nearest_vendor` falls back to in-memory `VENDORS_DB` via `_fallback_nearest_vendor`
- [x] 2.2 In-process haversine geo-filter implemented in `mcp/tools.py`
- [x] 2.3 `query_local_inventory` + `update_vendor_inventory` also fall back to in-memory cache
- [x] 2.4 Verified: fallback finds all 50 vendors within 1km ✅

## 3. 🟠 Format inventory/validation/execution WS messages — _status: [x] done_
AgentPanel shows "Processing event…" for half the pipeline. (AUDIT M1)
- [x] 3.1 `AGENT_INVENTORY` branch: allocation count + shortfall
- [x] 3.2 `AGENT_VALIDATION` branch: status/reason
- [x] 3.3 `AGENT_EXECUTION` branch: status + allocation count
- [x] 3.4 Real pubsub timestamp included in each agent_action payload

## 4. 🟠 WebSocket reconnect + connection status — _status: [x] done_
Silent dead feed on backend restart. (AUDIT M2)
- [x] 4.1 Exponential backoff reconnect (1s→30s) in `Dashboard.tsx`
- [x] 4.2 `wsStatus` state: connecting / live / reconnecting / offline
- [x] 4.3 Status badge rendered in header (colour-coded dot + label)

## 5. 🟠 Fix dead DemoControls — _status: [x] done_
Trigger Surge has no handler; Demo Mode toggles unused state. (AUDIT M3)
- [x] 5.1 `POST /api/v1/events/trigger` added to `routers/events.py`
- [x] 5.2 "Trigger Surge" button calls it with `event_type: crowd_surge`; loading state shown
- [x] 5.3 `isDemoMode` left wired (toggle visible in UI); deeper scenario scripting deferred

## 6. 🟡 Small frontend UI bugs — _status: [x] done_
- [x] 6.1 LiveFeed: `replaceAll('_',' ')` — all underscores replaced
- [x] 6.2 AgentPanel: stable key `agent_name+timestamp`; renders payload timestamp
- [x] 6.3 StadiumMap: stable offset derived from `event_id` hash — no more marker jitter

## 7. 🟡 Config & deployment hygiene — _status: [x] done_
- [x] 7.1 `VITE_API_BASE` env var; `.env` + `.env.example` added; Dashboard + StadiumMap use it
- [x] 7.2 CORS fixed: explicit origins list in `config.py`, `allow_credentials=False`

## 8. 🟡 Update stale docs — _status: [x] done_
- [x] 8.1 Rewrite `README.md` to reflect implemented backend pipeline (not "mock only")
- [x] 8.2 Rewrite `context.md` likewise
- [x] 8.3 Fix README Windows-only `venv/Scripts/activate` line
- [x] 8.4 Link `AUDIT.md` + `TASKS.md` from README

## 9. ➕ Fill functional gaps — _status: [~] partial_
- [ ] 9.1 Implement `GET /api/v1/events/history` (read from ES log or in-memory ring buffer) (AUDIT G1)
- [x] 9.2 `POST /api/v1/events/trigger` implemented (unblocked task 5)
- [ ] 9.3 Harden `manager.process_event` against missing `event_data["location"]` (AUDIT G3)

## 10. 🧹 Dead-code cleanup — _status: [ ] pending_
- [ ] 10.1 Remove unused `Channels.TELEMETRY_EVENTS`
- [ ] 10.2 Remove or use `PubSubService.stream()` / `get_recent_logs()`
- [ ] 10.3 Decide fate of legacy SSE path (`events.py /live`, `SimulatorEngine.subscribe`)
- [ ] 10.4 Make `ValidationAgent` actually reject on shortfall (or document pass-through intent)

---

### Already done (baseline, pre-audit)
- [x] FastAPI app + lifespan, CORS, routers (`events/vendors/zones/websockets/mcp`)
- [x] Simulator engine + random event generator
- [x] Pub/sub over in-memory MockRedis; WS multiplexer to dashboard
- [x] 5-stage agent pipeline (Perception→Planning→Inventory→Validation→Execution)
- [x] ML training pipeline (`generate_synthetic_data`, `train_model`) + trained joblib + heuristic fallback
- [x] ES client/index/ingestion with graceful degradation
- [x] MCP tools over REST; Phoenix/OTel tracer
- [x] Frontend: Landing/Capabilities/Operations/Contact + live Dashboard (map, feed, analytics, agent panel)
- [x] Test suite (`test_agents`, `test_ml_pipeline`, `test_pubsub`, `test_phase1`)

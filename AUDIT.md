# ArenaPulse — Audit Report

_Date: 2026-06-09. Scope: full repo (backend FastAPI pipeline + frontend dashboard). Graph-assisted (code-review-graph: 54 files, 225 nodes, 1173 edges, 15 flows, 12 communities)._

This document lists confirmed bugs, flow breaks, and UI issues. Severity: 🔴 critical (core feature broken) · 🟠 major · 🟡 minor.

---

## 🔴 Critical — core pipeline logic broken

### C1. ML model predicts on an all-zero feature vector
- **Where:** `backend/app/agents/perception.py` → `surge_predictor.predict_surge(event_data)` → `backend/app/ml/predictor.py:87`
- **What:** The model's `feature_names` are the training features — `avg_pressure_mat_velocity`, `Time_Step`, `max_occupancy_prob`, `attendance_to_capacity_ratio_velocity`, … (see `models/feature_importance.csv`, 53 features). The live event dict from the simulator only has `event_id, event_type, location, density_score, predicted_people, timestamp`. **Zero key overlap.**
- **Effect:** `X = np.array([[features.get(f, 0) for f in self.feature_names]])` builds an all-zeros vector for every event, so the model returns the **same prediction regardless of the event**. The "ML risk assessment" is constant noise. `density_score` (the one obviously predictive field) is never seen by the model.
- **Irony:** When `models/surge_predictor.joblib` is *absent*, the heuristic fallback (`_heuristic_fallback`) uses `density_score` and actually behaves sensibly. So the system is *more* correct with the model deleted.
- **Fix:** Add a telemetry→feature adapter, or retrain on simulator-shaped features. (Task #1)

### C2. Resource dispatch path is dead without Elasticsearch
- **Where:** `backend/app/agents/inventory.py:19` → `MCPTools.find_nearest_vendor` → `backend/app/mcp/tools.py` (ES `geo_distance` query)
- **What:** `InventoryAgent.allocate` finds vendors by querying the ES `vendors` index. But vendors actually live in-memory in `simulator/vendors.py::VENDORS_DB` and are only pushed to ES by `run_initial_ingestion()` *if ES is up*. Default deploy has no ES.
- **Effect:** ES down → `find_nearest_vendor` returns `[]` → `allocations=[]` → `ValidationAgent` approves an empty list → `ExecutionAgent` returns `NO_EXECUTION`. **The entire DISPATCH_RESOURCES branch produces nothing** in the documented "zero external deps" mode. The in-memory vendor DB (served fine at `GET /api/v1/vendors/` and on the map) and the agent pipeline are disconnected.
- **Fix:** Fall back to `get_all_vendors()` + in-process geo-filter when ES is unavailable. (Task #2)

---

## 🟠 Major — features partially wired / degraded

### M1. Half the agent pipeline shows placeholder text in the UI
- **Where:** `backend/app/routers/websockets.py:66-91`
- **What:** Only `AGENT_PERCEPTION`, `AGENT_PLANNING`, `AGENT_PIPELINE` get a real `action_text`/`reasoning`. `AGENT_INVENTORY`, `AGENT_VALIDATION`, `AGENT_EXECUTION` fall through to the default `action_text = "Processing event..."` with empty reasoning.
- **Effect:** `AgentPanel` renders "Processing event…" for inventory/validation/execution — the most operationally interesting stages look empty.
- **Fix:** Add explicit formatting branches. (Task #3)

### M2. No WebSocket reconnect / connection status
- **Where:** `frontend/src/pages/Dashboard.tsx:14-33`
- **What:** WS opened once in `useEffect`; no `onclose`/`onerror`/reconnect. No UI indicator of connection state.
- **Effect:** If backend is down at mount or restarts, the dashboard silently shows a frozen/empty feed forever. Looks like the product is broken.
- **Fix:** Reconnect with backoff + status badge. (Task #4)

### M3. DemoControls are non-functional (dead UI)
- **Where:** `frontend/src/components/DemoControls.tsx`
- **What:** "Trigger Surge" button has **no `onClick`**. "Start Demo" toggles `isDemoMode`, but `isDemoMode` is **never read** anywhere in the app (`store/useStore.ts` exposes it; no consumer).
- **Effect:** Two prominent dashboard buttons do nothing. The "Demo Mode" pill is purely decorative.
- **Fix:** Wire "Trigger Surge" to a backend endpoint (which doesn't exist yet — see G2) and consume `isDemoMode`, or remove. (Task #5)

---

## 🟡 Minor — UI polish & correctness

### U1. `event_type` underscore replace is non-global
- `frontend/src/components/LiveFeed.tsx:20` — `evt.event_type.replace('_', ' ')` only replaces the **first** underscore. `vendor_demand_spike` → `"VENDOR DEMAND_SPIKE"`. Use `replaceAll('_',' ')` or `/_/g`.

### U2. AgentPanel: unstable keys + wrong timestamp
- `frontend/src/components/AgentPanel.tsx:16-20` — uses array index `i` as React `key`, and renders `new Date().toLocaleTimeString()` (the **render** time) instead of the action's actual time. Every re-render shows "now". Carry a timestamp in the payload and key on a stable id.

### U3. Stadium map surge markers jitter every render
- `frontend/src/components/StadiumMap.tsx:72-77` — `Math.random()` lat/lon offsets are computed **inside the render map()**, so surge markers teleport on every re-render. Compute once per event (e.g. derive offset from `event_id` hash, or store it on the event).

### U4. CORS wildcard + credentials is an invalid combo
- `backend/app/main.py` — `allow_origins=["*"]` with `allow_credentials=True`. Browsers reject credentialed requests against a wildcard origin. Use explicit origins or drop credentials.

### U5. Hardcoded backend URLs (no env config)
- `Dashboard.tsx` (`ws://localhost:8000`) and `StadiumMap.tsx` (`http://localhost:8000`). Introduce `VITE_API_BASE`. (Already noted in CLAUDE.md.)

---

## Dead / unused code (low priority cleanup)
- `Channels.TELEMETRY_EVENTS = "telemetry.events"` — never published or subscribed (the simulator uses the literal `"arena:telemetry:raw"` instead).
- `PubSubService.stream()` and `get_recent_logs()` — defined, no callers.
- `routers/events.py` `/live` SSE + `SimulatorEngine.subscribe()/_notify_subscribers` — a second, parallel telemetry path that the dashboard does not use (the WS path is canonical). `/history` is a stub returning `[]`.
- `validation.py` — always returns `VALID` even when a shortfall is logged; validation is effectively a pass-through.

## Notable gaps (not bugs, but missing for "done")
- **G1.** `GET /api/v1/events/history` is a stub (`return []`).
- **G2.** No endpoint to manually inject/trigger an event (needed for DemoControls "Trigger Surge").
- **G3.** `manager.process_event` indexes `event_data["location"]` directly — `KeyError` if an event ever lacks `location` (simulator always sets it today, but external callers could break it).

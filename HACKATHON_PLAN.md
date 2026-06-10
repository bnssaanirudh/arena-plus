# ArenaPulse — Hackathon Alignment Plan

_Google Cloud "Building Agents for Real-World Challenges" hackathon. Created 2026-06-09._
_Goal: make ArenaPulse fully compliant with the hackathon qualification rules **and** complete to the project_idea.md vision._

Legend: 🚪 qualification gate (no submission without it) · ⭐ judging maximizer · 🧩 feature-parity with project_idea.md · `[ ]` pending · `[~]` in progress · `[x]` done

---

## 0. Strategic decisions (lock these first)

### 0.1 Partner track / bucket — **RECOMMENDATION: Elastic** 🚪
- Prizes are awarded **per partner bucket**; you submit to **exactly one** track.
- Options: Arize · **Elastic** · Fivetran · GitLab · MongoDB · Dynatrace.
- **Why Elastic:** the core mission (geospatial vendor lookup, inventory search, surge-vs-supply matching) *is* a search/analytics problem — Elastic is the natural superpower and our domain already models it. The agent's most important tool call ("which vendors near the surge are low on water?") is literally an Elastic query.
- **Arize stays as a secondary integration** (observability) — allowed and a judging bonus, but we compete in the **Elastic** bucket.
- ⚠️ Decision point: if you'd rather compete in the **Arize** bucket (smaller field, observability-first story), the plan's "primary MCP" tasks flip to Arize. Confirm before we build.

### 0.2 "Google Cloud Agent Builder" interpretation 🚪
- The rules say build "**using Google Cloud Agent Builder**" + "**built with Gemini 3**."
- Agent Builder = umbrella that includes the **Agent Development Kit (ADK)** — a *code-first* Python framework. **Use ADK.** It satisfies the requirement without throwing away our sophisticated pipeline (a no-code flow would be a downgrade).
- Plan: re-express the Perception→Planning→Inventory→Validation→Execution pipeline as an **ADK agent** with Gemini 3 as the reasoning model and the partner MCP server registered as a tool.

### 0.3 What we keep vs. replace
- **Keep:** FastAPI backend, simulator, pub/sub, WebSocket dashboard, React frontend, vendor domain model.
- **Replace/upgrade:** the hand-rolled `if/elif` orchestration → ADK + Gemini 3 reasoning; home-grown `mcp/tools.py` → real Elastic MCP server; legacy Gemini SDK → `google-genai`.

---

## 👤 Manual tasks (YOU, not the agent) — grouped by when they're needed

These need a human (accounts, billing, recording, form-filling). Claude builds everything around them.

**Before/during Phase 1–2 build (provision now, in parallel):**
- [ ] M1. Create **Google Cloud account + project**, enable billing ($300 free trial) → share **project ID**
- [ ] M2. Enable **Vertex AI API**, **Cloud Run**, **Agent Builder** in that project
- [ ] M3. Confirm the exact **Gemini 3 model id** available to you (verify in Vertex console; update `GEMINI_MODEL`)
- [x] M4. Start an **Elastic Cloud 14-day trial** → share **Elasticsearch endpoint URL** + **API key**
- [ ] M5. Confirm you can run the **Elastic MCP server** (Docker image or hosted endpoint)
- [x] M6. (Secondary) Create a free **Arize AX** account → share **Space ID** + **API key**

**After Phase 1–4 build (once agent + MCP + actions work locally):**
- [ ] M7. Authenticate `gcloud` locally (`gcloud auth application-default login`) so Vertex calls work
- [ ] M8. Smoke-test full pipeline locally with real Gemini + Elastic creds in `.env`

**Phase 5 (deploy):**
- [ ] M9. Approve/Cloud-Run deploy of backend (provide billing confirmation if prompted)
- [ ] M10. Connect a Vercel/Firebase account for the frontend deploy

**Phase 6 (submit) — all human:**
- [ ] M11. Make the GitHub repo **public**
- [ ] M12. Record the **~3-minute demo video**
- [ ] M13. Fill out the **Devpost submission form** (title, tagline, screenshots, track = Elastic)

---

## 1. 🚪 Qualification gates (MUST-HAVE to be eligible)

### 1.1 Open-source license
- [x] 1.1.1 Added MIT `LICENSE` at repo root
- [ ] 1.1.2 Confirm GitHub "About" panel detects it (visible license badge) — after push
- [ ] 1.1.3 Make the repo **public**

### 1.2 Gemini 3 as the agent brain
- [x] 1.2.1 Replaced `google-generativeai` with **`google-genai`** (+ `google-adk`) in `requirements.txt`
- [x] 1.2.2 Config now supports Vertex AI (`GOOGLE_GENAI_USE_VERTEXAI` + project/location) and AI Studio; `GEMINI_MODEL` default `gemini-3-pro-preview`; backend `.env.example` added
- [x] 1.2.3 Gemini is now the **planning brain** (`planning.py` `_gemini_plan` with structured JSON schema) — decides action + resources + reasoning
- [x] 1.2.4 Deterministic heuristic kept as fallback; `plan["planner"]` tags which path ran. New `llm/gemini.py` unified client. Perception migrated to it too.

### 1.3 Google Cloud Agent Builder (ADK)
- [x] 1.3.1 Added `google-adk` (installed: 2.2.0)
- [x] 1.3.2 Defined the ArenaPulse agent in ADK (`agents/adk_agent.py` — `LlmAgent` `arenapulse_coordinator`: instruction, Gemini 3 model, tool registry)
- [x] 1.3.3 Registered the Elastic vendor-search as an ADK `FunctionTool` (`find_nearby_vendors`) the agent calls autonomously while planning
- [x] 1.3.4 Planning brain runs through the ADK `Runner` (`plan_via_adk`); Inventory/Validation/Execution stay deterministic so the dashboard keeps structured stages — full multi-tool routing is a stretch
- [x] 1.3.5 Intermediate state still streams to pub/sub; ADK is import-guarded and falls back to direct Gemini → heuristic. **Live verification pending M3/M7 creds.**

### 1.4 Partner MCP server integration (Elastic) ⭐🚪
- [ ] 1.4.1 Stand up the **official Elastic MCP server** (Docker / hosted Elastic Cloud trial) and add it to `.mcp.json` / agent tool config — **blocked on M4/M5**
- [x] 1.4.2 ADK agent already exposes the vendor geo-search as a tool (`find_nearby_vendors`) Gemini calls autonomously; swap its backing from the home-grown `MCPTools` to the official Elastic MCP server once M4/M5 land
- [x] 1.4.3 Migrate vendor + inventory + zone data into Elastic indices (reuse `elastic/` ingestion already in repo) — needs ES endpoint
- [x] 1.4.4 "Find nearest vendor" is wired as the agent's headline tool call (`adk_agent.find_nearby_vendors` → `MCPTools.find_nearest_vendor`, geo_distance); upgrades to real Elastic MCP transparently
- [x] 1.4.5 In-memory haversine is fallback-only and logs which path served the request (ES vs in-memory)
- [ ] 1.4.6 Confirm in logs/traces that the agent's reasoning includes a real MCP tool invocation — needs live creds

### 1.5 Hosted project URL
- [~] 1.5.1 Deploy **backend** (Cloud Run recommended — same ecosystem as Agent Builder; or Railway/Render). `backend/Dockerfile` + `.dockerignore` ready (python:3.13-slim, `$PORT`-aware uvicorn); just needs `gcloud run deploy` once M9 lands.
- [~] 1.5.2 Deploy **frontend** (Vercel / Firebase Hosting) with `VITE_API_BASE` → deployed backend. `frontend/vercel.json` (SPA rewrite + Vite preset) ready; set `VITE_API_BASE` in Vercel env once M10 lands.
- [ ] 1.5.3 Decide whether Elastic + Gemini run live in prod or in a scripted-demo mode (manage trial-credit/key exposure)
- [ ] 1.5.4 Smoke-test the deployed URL end-to-end (surge → agent → MCP → action visible on dashboard)

### 1.6 Devpost submission package
- [ ] 1.6.1 Hosted project URL (from 1.5)
- [ ] 1.6.2 Public repo URL with visible license (from 1.1)
- [ ] 1.6.3 ~3-minute **demo video** (script: problem → trigger surge → watch agent reason via Gemini → MCP tool call → autonomous actions → Arize trace)
- [ ] 1.6.4 Select track = **Elastic** (per 0.1)
- [ ] 1.6.5 Complete Devpost form (title, tagline, description, tech stack, screenshots)

---

## 2. 🧩 Project-idea feature parity (complete the "multi-step mission")

The project_idea.md workflow has 4 steps + 2 actions. Step 3 (RAG verify) remains; **Action A + Action B + human oversight are done**.

### 2.1 Step 3 — Corrective RAG verification ("is the supply chain viable?")
- [x] 2.1.1 In-memory supply-chain constraint corpus (8 constraints: road closures, depot capacity, lead times across zones) — `agents/verification.py` `_CONSTRAINTS`. Upgrades to Elastic BM25/kNN by replacing `_retrieve_constraints()` body; interface unchanged.
- [x] 2.1.2 `VerificationAgent.verify()` retrieves relevant constraints (keyword match on zone + action) and checks feasibility — Gemini primary, heuristic fallback
- [x] 2.1.3 Self-correction loop in `manager._verify_with_correction()`: if infeasible, re-runs Planning with constraint context injected → re-runs Inventory+Validation. Up to `MAX_REPLANS=2` attempts. `plan["replan_count"]` tags corrected plans.
- [x] 2.1.4 Publishes to `AGENT_VERIFICATION` channel; WS formats "✅ feasible" or "⚠️ self-correcting (attempt N)"; re-plan shows "↻ Re-plan:" prefix in agent panel

### 2.2 Action A — Auto-generate flash deals to fans (the retail/commerce half)
- [x] 2.2.1 New `MarketingAgent` (`agents/marketing.py`): Gemini drafts a hyper-local flash-deal message for the surge zone (heuristic template fallback)
- [x] 2.2.2 Publishes deals to a new `AGENT_MARKETING` pub/sub channel; WS multiplexer forwards them (frontend "Autonomous Campaigns" panel still TODO — see 4.2)
- [x] 2.2.3 Deal content tied to live surge data (zone, item-by-event-type, nearest vendor, 30-min window)

### 2.3 Action B — B2B restocking orders (extend existing execution)
- [x] 2.3.1 Execution emits structured restock orders (`order_id`, vendor, item, qty, supplier, status) for every dispatched allocation
- [x] 2.3.2 Orders recorded via MCP (`record_agent_action`) and surfaced on the WS (`restock_orders` typed message); dashboard "B2B Restock Orders" panel streams them live (PO-xxxx, item, qty, supplier)
- [x] 2.3.3 Supplier-side acknowledgement: `schedule_supplier_acks()` fires as a background asyncio task after dispatch (8–20 s random delay), publishes `AGENT_RESTOCK_ACK` → `restock_ack` WS message → `acknowledgeRestockOrders()` store action updates order status badges from "ordered" → "✓ acked" live in RestockPanel

### 2.4 Human-in-the-loop oversight (rules emphasize "under your oversight")
- [x] 2.4.1 Approval gate for high-impact actions (EVACUATE_ZONE, or water+food ≥ `APPROVAL_RESOURCE_THRESHOLD`): pipeline pauses at `PENDING_APPROVAL`; `approvals` router (`GET /`, `POST /{event_id}`) lets a human approve/reject (backend done; UI control pending)
- [x] 2.4.2 Toggleable via `APPROVAL_REQUIRED` (default false = full-auto demo flair; true = supervised "you stay in control")

---

## 3. ⭐ Arize secondary integration (judging bonus)

- [x] 3.1 Replaced broken `arize-phoenix` full server dep with `arize-phoenix-otel` (lightweight OTLP); `tracer.py` now no-ops cleanly with an INFO log when `PHOENIX_COLLECTOR_ENDPOINT` is not set — no startup warnings
- [ ] 3.2 Instrument ADK + Gemini + MCP tool calls so every multi-step decision is traced — set `PHOENIX_COLLECTOR_ENDPOINT` (local Phoenix server or Arize AX cloud, M6)
- [ ] 3.3 Capture a screenshot/segment of the Arize trace for the demo video (shows reasoning + error-correction)

---

## 4. ⭐ Polish & judging maximizers (after compliance)

- [x] 4.1 ML story reframed: `SurgePredictor` is an honest fast triage pre-filter; `PerceptionAgent` uses Gemini `generate_json(_RISK_SCHEMA)` as authoritative assessor; pre-filter result is context + fallback
- [x] 4.2 Agent Reasoning Timeline: full-width panel groups all 8 pipeline stages per event into collapsible cards (horizontal scroll, live stage count badge, done/in-progress state) — WS now carries `event_id`+`stage` on every `agent_action`
- [x] 4.3 Scripted demo scenario: `demo.py` 5-event cascade (normal→congestion→crowd_surge→security_alert→recovery), DemoControls fires `POST /api/v1/events/demo`, live status badge, `isDemoMode` wired
- [x] 4.4 README: 8-stage ASCII pipeline diagram + hackathon-pillar table (Gemini/ADK/Elastic/Arize mapped to exact files)
- [x] 4.5 `README.md` + `CLAUDE.md` updated to the Gemini-3 / ADK / Elastic-MCP architecture; stale docs (AUDIT/TASKS/context/leakage) removed

---

## Critical path (suggested order)
1. **0.1 / 0.2** decisions (Elastic track, ADK approach) — 5 min, unblocks everything
2. **1.2 Gemini 3** + **1.3 ADK** — the brain + the framework
3. **1.4 Elastic MCP** — the required superpower
4. **2.1–2.3** complete the multi-step mission (RAG verify + both actions)
5. **3.x Arize** traces
6. **1.5 deploy** + **1.1 license**
7. **2.4 / 4.x** polish
8. **1.6 demo video + Devpost**

## Open questions to confirm before building
- **Track = Elastic?** (vs Arize/Mongo) — pivotal, reorients the whole MCP layer.
- **Gemini 3 access:** Vertex AI (GCP project + billing/trial) or AI Studio key? Affects auth + deploy.
- **Live vs scripted prod demo:** run Elastic/Gemini live on the hosted URL, or pre-recorded/scripted to protect trial credits?

# Graph Report - .  (2026-06-10)

## Corpus Check
- Large corpus: 100 files · ~564,473 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 579 nodes · 890 edges · 66 communities detected
- Extraction: 69% EXTRACTED · 31% INFERRED · 0% AMBIGUOUS · INFERRED: 277 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `ExecutionAgent` - 40 edges
2. `AgentManager` - 39 edges
3. `VerificationAgent` - 37 edges
4. `MarketingAgent` - 37 edges
5. `PlanningAgent` - 37 edges
6. `PerceptionAgent` - 36 edges
7. `MockRedis` - 30 edges
8. `Channels` - 24 edges
9. `PubSubService` - 23 edges
10. `MCPTools` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Multiplexes messages from multiple asyncio Queues into a single async generator.` --uses--> `Channels`  [INFERRED]
  backend/app/routers/websockets.py → backend/app/infra/pubsub.py
- `Hero Image PNG` --conceptually_related_to--> `Landing Page`  [INFERRED]
  frontend/src/assets/hero.png → frontend/src/pages/Landing.tsx
- `Icons SVG Sprite Sheet` --conceptually_related_to--> `App Root Component`  [INFERRED]
  frontend/public/icons.svg → frontend/src/App.tsx
- `Rationale: SIMULATION_ACTIVE=false` --rationale_for--> `ArenaPulse System`  [EXTRACTED]
  CLAUDE.md → README.md
- `Operations()` --calls--> `Nav Component`  [EXTRACTED]
  frontend/src/pages/Operations.tsx → frontend/src/components/Nav.tsx

## Hyperedges (group relationships)
- **Multi-Agent Pipeline Flow** — manager_AgentManager, perception_PerceptionAgent, planning_PlanningAgent, inventory_InventoryAgent, validation_ValidationAgent, verification_VerificationAgent, execution_ExecutionAgent, marketing_MarketingAgent [EXTRACTED 1.00]
- **Agents Using Gemini Brain** — perception_PerceptionAgent, planning_PlanningAgent, verification_VerificationAgent, marketing_MarketingAgent [EXTRACTED 1.00]
- **Agents Using MCPTools** — inventory_InventoryAgent, execution_ExecutionAgent, adk_agent_find_nearby_vendors [EXTRACTED 1.00]
- **RAG Self-Correction Loop** — manager_AgentManager, verification_VerificationAgent, planning_PlanningAgent, inventory_InventoryAgent, validation_ValidationAgent [EXTRACTED 1.00]
- **Infrastructure Backbone** — pubsub_PubSubService, mock_redis_MockRedis, elastic_client_es_client, pubsub_Channels [INFERRED 0.85]
- **Elastic Setup Pipeline** — setup_elastic_main, elastic_indexes_setup_indexes, elastic_ingestion_run_initial_ingestion, elastic_ingestion_ingest_vendors, elastic_ingestion_ingest_constraints, elastic_ingestion_ingest_stadium_zones [EXTRACTED 1.00]
- **REST API Routers Layer** — events_router, vendors_router, zones_router, approvals_router, status_router, chat_router, websockets_router, mcp_router [INFERRED 0.95]
- **MCP Tools with ES+In-Memory Fallback Pattern** — mcp_tools_find_nearest_vendor, mcp_tools_fallback_nearest_vendor, mcp_tools_haversine [EXTRACTED 0.95]
- **ML Training Pipeline Flow** — ml_generate_synthetic_data_main, ml_train_model_train_and_evaluate, ml_predictor_surgepredictor [INFERRED 0.90]
- **Simulator Event Generation Flow** — simulator_engine_simulatorengine, simulator_engine_run_loop, simulator_events_generate_random_event, simulator_demo_run_demo_scenario [EXTRACTED 0.95]
- **Pages Using Shared Nav Component** — landing_landing, platform_platform, capabilities_capabilities, operations_operations, process_process, contact_contact, globalanalytics_globalanalytics, operatorcenter_operatorcenter, systemstatus_systemstatus, supplyhub_supplyhub [EXTRACTED 1.00]
- **Informational Marketing Pages** — landing_landing, platform_platform, capabilities_capabilities, operations_operations, process_process, contact_contact [INFERRED 0.85]
- **Operational Dashboard Pages** — dashboard_dashboard, operatorcenter_operatorcenter, systemstatus_systemstatus, supplyhub_supplyhub, globalanalytics_globalanalytics [INFERRED 0.85]
- **Components consuming Zustand store** — agentpanel_AgentPanel, livefeed_LiveFeed, analytics_Analytics, stadiummap_StadiumMap, eventtimeline_EventTimeline, campaignspanel_CampaignsPanel, restockpanel_RestockPanel, approvalqueue_ApprovalQueue, democontrols_DemoControls [EXTRACTED 1.00]
- **Restock Order Data Hierarchy** — usestore_RestockBatch, usestore_RestockOrder, restockpanel_RestockPanel, restockpanel_OrderRow [EXTRACTED 1.00]
- **RAG Verification Display Pipeline** — usestore_VerificationInfo, eventtimeline_EventTimeline, eventtimeline_StageRow [EXTRACTED 1.00]
- **Hackathon Tech Pillars** — concept_gemini3, concept_adk, concept_elastic_mcp, concept_arize [EXTRACTED 1.00]
- **Graceful Degradation Components** — concept_graceful_degradation, concept_elastic_mcp, concept_gemini3 [INFERRED 0.85]

## Communities

### Community 0 - "Mock Redis Store"
Cohesion: 0.04
Nodes (34): MockRedis, Mock Redis Implementation =========================== In-memory mock of Redis th, Get number of subscribers on a channel., Push values to the head of a list., Get a range from a list. stop=-1 means to the end., In-memory mock Redis with pub/sub and key-value store.     Thread-safe via async, Set key to value. `ex` (TTL in seconds) is accepted but ignored in mock., List keys matching pattern. Only supports '*' (all) and prefix matching. (+26 more)

### Community 1 - "Agent Pipeline Core"
Cohesion: 0.12
Nodes (47): ExecutionAgent, InventoryAgent, AgentManager, Agent Manager =============== Orchestrates the multi-agent pipeline:   Event → P, RAG verification with self-correction loop (up to MAX_REPLANS).          Returns, Run execution + marketing and publish completion. Shared by the         auto pat, Pending approvals (for the approvals REST endpoint)., Resume or cancel a pipeline that was held for human approval. (+39 more)

### Community 2 - "ADK Agent & Gemini Brain"
Cohesion: 0.08
Nodes (39): ADK LlmAgent (arenapulse_coordinator), adk_available(), _build_prompt(), _extract_json(), find_nearby_vendors(), _get_runner(), plan_via_adk(), ArenaPulse ADK agent (Google Cloud Agent Builder) ============================== (+31 more)

### Community 3 - "REST API & Config"
Cohesion: 0.07
Nodes (22): POST /api/v1/events/demo, POST /api/v1/events/trigger, GET /api/v1/status, BaseSettings, Capabilities Page, ChatRequest, Nav Component, Settings (+14 more)

### Community 4 - "Human-in-the-Loop Approvals"
Cohesion: 0.07
Nodes (16): ApprovalDecision, list_pending(), Approvals router — human-in-the-loop oversight.  When ``APPROVAL_REQUIRED`` is e, List pipelines currently awaiting human approval., Approve (resume execution) or reject (cancel) a held pipeline., resolve(), BaseModel, SimulatorEngine (+8 more)

### Community 5 - "Frontend App Shell"
Cohesion: 0.09
Nodes (3): Operations(), async(), updateSetting()

### Community 6 - "Demo Scenario"
Cohesion: 0.09
Nodes (18): Scripted Demo Scenario  (HACKATHON_PLAN 4.3) ===================================, Fire the scripted scenario. Called as an asyncio background task., run_demo_scenario(), Execution Agent ================= Executes approved allocations by updating inve, Simulate supplier-side acknowledgement of restock orders.      Waits a random 8–, schedule_supplier_acks(), mock_redis, pubsub / Channels (+10 more)

### Community 7 - "ML Test Rationale A"
Cohesion: 0.08
Nodes (13): Tests for the synthetic data generator., Synthetic data directory should exist after generation., events.csv should be generated., seat_clusters.csv should be generated., movement_edges.csv should be generated., training_features.csv should be generated., events.csv should have ~10,000 rows., events.csv should have the expected columns. (+5 more)

### Community 8 - "ML Pipeline Tests"
Cohesion: 0.08
Nodes (14): Tests for the ML Pipeline =========================== Tests synthetic data gener, Evaluation report should exist., Model should load and have expected structure., Tests for the runtime predictor service., predict_surge should return risk_level, probability, model_used., Probability should be between 0 and 1., Risk level should be one of the expected values., Low vs high density events must not return the same probability (feature contrac (+6 more)

### Community 9 - "B2B Restock Execution"
Cohesion: 0.12
Nodes (13): _build_restock_orders(), Actually execute the allocations., Log execution decisions to the mock Redis store., Turn dispatched allocations into structured B2B restock orders.      Each unit d, Execution Agent     Role: Execute the approved allocations by updating ElasticSe, Log what would be executed without making changes., Channels, Well-known pub/sub channel names. (+5 more)

### Community 10 - "Frontend Components (AST)"
Cohesion: 0.14
Nodes (2): decide(), sendDecision()

### Community 11 - "Live Dashboard Panels"
Cohesion: 0.11
Nodes (21): AgentPanel Component, Analytics Component, ApprovalCard Sub-component, ApprovalQueue Component, CampaignsPanel Component, DemoControls Component, EventTimeline Component, StageRow Sub-component (+13 more)

### Community 12 - "Agent Test Suite"
Cohesion: 0.11
Nodes (0): 

### Community 13 - "MCP Tools & Geo-Search"
Cohesion: 0.21
Nodes (10): _fallback_nearest_vendor(), find_nearest_vendor(), _get_vendor_cache(), _haversine_m(), _parse_distance_m(), query_local_inventory(), Approximate distance in metres between two lat/lon points., Parse an ES distance string like '500m' or '1km' to metres. (+2 more)

### Community 14 - "ML Surge Predictor"
Cohesion: 0.21
Nodes (8): _heuristic_fallback(), _prob_to_risk(), ArenaPulse ML Pre-filter ========================= Fast triage layer that conver, Map a live telemetry event to the model's feature space.         Returns (adapte, Run the fast pre-filter on a raw telemetry event.          Accepts the raw live, Fast triage pre-filter for the Perception pipeline.      Produces a quick risk-l, Attempt to load the model from disk., SurgePredictor

### Community 15 - "System Architecture Concepts"
Cohesion: 0.15
Nodes (13): Google Cloud ADK, 8-Stage Agent Pipeline, ArenaPulse System, Arize Phoenix Observability, Elastic MCP Server, Gemini 3 (google-genai), Graceful Degradation Design, arize-phoenix-otel>=0.6.0 (+5 more)

### Community 16 - "RAG Verification"
Cohesion: 0.22
Nodes (6): _format_constraints(), Verification Agent  (project_idea.md — Step 3: corrective RAG verification) ====, Retrieve relevant constraints for a zone + action from Elasticsearch (BM25) with, Returns a verification result dict:           feasible       bool           conf, Deterministic fallback — flag HIGH-severity constraints as blocking., _retrieve_constraints()

### Community 17 - "Elastic Client Layer"
Cohesion: 0.31
Nodes (4): ingest_constraints(), ingest_stadium_zones(), ingest_vendors(), run_initial_ingestion()

### Community 18 - "Synthetic Data Generation"
Cohesion: 0.44
Nodes (8): build_lagged_training_features(), _clamp(), generate_events(), generate_movement_edges(), generate_seat_clusters(), _load_archive_stats(), main(), ArenaPulse Synthetic Data Generator (Temporal Lag Version) =====================

### Community 19 - "Elastic Index & Ingestion"
Cohesion: 0.31
Nodes (8): AsyncElasticsearch es_client, INDEXES schema definitions, setup_indexes, ingest_constraints, ingest_stadium_zones, ingest_vendors, run_initial_ingestion, main()

### Community 20 - "PubSub Infrastructure"
Cohesion: 0.47
Nodes (5): load_and_prepare(), main(), ArenaPulse ML Model Training ============================== Loads the synthetic, Load training features and split into X, y., train_and_evaluate()

### Community 21 - "Simulator Engine"
Cohesion: 0.33
Nodes (6): MCP Router, _fallback_nearest_vendor, MCPTools.find_nearest_vendor, MCPTools.find_overloaded_zone, _haversine_m helper, MCPTools.record_agent_action

### Community 22 - "Frontend Store (Zustand)"
Cohesion: 0.5
Nodes (3): Arize Phoenix observability — lightweight OTLP setup.  Uses `arize-phoenix-otel`, Wire OpenTelemetry traces to Arize Phoenix / Arize AX.      No-op when PHOENIX_C, setup_phoenix()

### Community 23 - "WebSocket Multiplex"
Cohesion: 0.5
Nodes (0): 

### Community 24 - "Chat & Status Routers"
Cohesion: 0.67
Nodes (3): MockRedis, PubSubService, pubsub singleton

### Community 25 - "Marketing Agent"
Cohesion: 0.67
Nodes (3): surge_predictor (singleton), SurgePredictor, TestPredictor

### Community 26 - "Planning Agent"
Cohesion: 0.67
Nodes (3): WS /api/v1/ws/dashboard, Dashboard Page, useStore (Zustand)

### Community 27 - "Perception Agent"
Cohesion: 0.67
Nodes (3): AICopilot Component, App Root Component, Icons SVG Sprite Sheet

### Community 28 - "Validation Agent"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Vendor Data"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Stadium Zones"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Phase 1 Tests"
Cohesion: 1.0
Nodes (2): SurgePredictor._heuristic_fallback, SurgePredictor.predict_surge

### Community 32 - "Settings Config"
Cohesion: 1.0
Nodes (2): SimulatorEngine._run_loop, generate_random_event

### Community 33 - "Pub/Sub Tests"
Cohesion: 1.0
Nodes (2): Corrective RAG Verification, Self-Correction Replan Loop

### Community 34 - "Frontend Pages (Semantic)"
Cohesion: 1.0
Nodes (2): Elastic Hackathon Partner Track, Rationale: Choose Elastic Track

### Community 35 - "Landing Page"
Cohesion: 1.0
Nodes (2): XGBoost Surge Predictor Model, xgboost>=2.0.0

### Community 36 - "Observability / Arize"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Execution Tests"
Cohesion: 1.0
Nodes (1): Map a surge probability to a human-readable risk level.

### Community 38 - "Deployment Config"
Cohesion: 1.0
Nodes (1): Simple rule-based fallback when no model is available.

### Community 39 - "ML Evaluation Report"
Cohesion: 1.0
Nodes (1): Channels

### Community 40 - "Supply Chain Constraints"
Cohesion: 1.0
Nodes (1): mock_redis singleton

### Community 41 - "Frontend Assets"
Cohesion: 1.0
Nodes (1): check_connection

### Community 42 - "Hackathon Plan Docs"
Cohesion: 1.0
Nodes (1): Events Router

### Community 43 - "Project Idea Concepts"
Cohesion: 1.0
Nodes (1): Vendors Router

### Community 44 - "Requirements Deps"
Cohesion: 1.0
Nodes (1): Zones Router

### Community 45 - "Index Mapping Schemas"
Cohesion: 1.0
Nodes (1): Approvals Router

### Community 46 - "Router Init"
Cohesion: 1.0
Nodes (1): Status Router

### Community 47 - "Agent Init"
Cohesion: 1.0
Nodes (1): Chat Router

### Community 48 - "Elastic Ingestion Detail"
Cohesion: 1.0
Nodes (1): chat_handler endpoint

### Community 49 - "Misc Utility A"
Cohesion: 1.0
Nodes (1): WebSockets Router

### Community 50 - "Misc Utility B"
Cohesion: 1.0
Nodes (1): train_and_evaluate

### Community 51 - "Misc Utility C"
Cohesion: 1.0
Nodes (1): generate_synthetic_data.main

### Community 52 - "Misc Utility D"
Cohesion: 1.0
Nodes (1): SimulatorEngine

### Community 53 - "Misc Utility E"
Cohesion: 1.0
Nodes (1): VENDORS_DB

### Community 54 - "Misc Utility F"
Cohesion: 1.0
Nodes (1): run_demo_scenario

### Community 55 - "Misc Utility G"
Cohesion: 1.0
Nodes (1): TestAgentManagerPipeline

### Community 56 - "Misc Utility H"
Cohesion: 1.0
Nodes (1): TestBuildRestockOrders

### Community 57 - "Misc Utility I"
Cohesion: 1.0
Nodes (1): Process Page

### Community 58 - "Misc Utility J"
Cohesion: 1.0
Nodes (1): Nav Component

### Community 59 - "Misc Utility K"
Cohesion: 1.0
Nodes (1): Vite Build Config

### Community 60 - "Misc Utility L"
Cohesion: 1.0
Nodes (1): ArenaPulse README

### Community 61 - "Misc Utility M"
Cohesion: 1.0
Nodes (1): CLAUDE.md Architecture Guide

### Community 62 - "Misc Utility N"
Cohesion: 1.0
Nodes (1): Hackathon Alignment Plan

### Community 63 - "Misc Utility O"
Cohesion: 1.0
Nodes (1): Project Idea Document

### Community 64 - "Misc Utility P"
Cohesion: 1.0
Nodes (1): B2B Restock Orders

### Community 65 - "Misc Utility Q"
Cohesion: 1.0
Nodes (1): Hyper-Local Flash Deals

## Knowledge Gaps
- **164 isolated node(s):** `Approvals router — human-in-the-loop oversight.  When ``APPROVAL_REQUIRED`` is e`, `List pipelines currently awaiting human approval.`, `Approve (resume execution) or reject (cancel) a held pipeline.`, `Manually inject a telemetry event and run it through the agent pipeline.`, `Trigger the scripted 5-event surge cascade for demo/recording purposes.     Fire` (+159 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Validation Agent`** (2 nodes): `vite.config.ts`, `manualChunks()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vendor Data`** (2 nodes): `counter.ts`, `setupCounter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stadium Zones`** (2 nodes): `zones.py`, `list_zones()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phase 1 Tests`** (2 nodes): `SurgePredictor._heuristic_fallback`, `SurgePredictor.predict_surge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Config`** (2 nodes): `SimulatorEngine._run_loop`, `generate_random_event`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pub/Sub Tests`** (2 nodes): `Corrective RAG Verification`, `Self-Correction Replan Loop`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Pages (Semantic)`** (2 nodes): `Elastic Hackathon Partner Track`, `Rationale: Choose Elastic Track`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Landing Page`** (2 nodes): `XGBoost Surge Predictor Model`, `xgboost>=2.0.0`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Observability / Arize`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Execution Tests`** (1 nodes): `Map a surge probability to a human-readable risk level.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Deployment Config`** (1 nodes): `Simple rule-based fallback when no model is available.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ML Evaluation Report`** (1 nodes): `Channels`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supply Chain Constraints`** (1 nodes): `mock_redis singleton`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Assets`** (1 nodes): `check_connection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hackathon Plan Docs`** (1 nodes): `Events Router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Idea Concepts`** (1 nodes): `Vendors Router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Requirements Deps`** (1 nodes): `Zones Router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Index Mapping Schemas`** (1 nodes): `Approvals Router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Router Init`** (1 nodes): `Status Router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agent Init`** (1 nodes): `Chat Router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Elastic Ingestion Detail`** (1 nodes): `chat_handler endpoint`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility A`** (1 nodes): `WebSockets Router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility B`** (1 nodes): `train_and_evaluate`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility C`** (1 nodes): `generate_synthetic_data.main`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility D`** (1 nodes): `SimulatorEngine`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility E`** (1 nodes): `VENDORS_DB`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility F`** (1 nodes): `run_demo_scenario`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility G`** (1 nodes): `TestAgentManagerPipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility H`** (1 nodes): `TestBuildRestockOrders`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility I`** (1 nodes): `Process Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility J`** (1 nodes): `Nav Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility K`** (1 nodes): `Vite Build Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility L`** (1 nodes): `ArenaPulse README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility M`** (1 nodes): `CLAUDE.md Architecture Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility N`** (1 nodes): `Hackathon Alignment Plan`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility O`** (1 nodes): `Project Idea Document`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility P`** (1 nodes): `B2B Restock Orders`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Misc Utility Q`** (1 nodes): `Hyper-Local Flash Deals`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Channels` connect `B2B Restock Execution` to `Mock Redis Store`, `Agent Pipeline Core`, `Demo Scenario`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Are the 34 inferred relationships involving `ExecutionAgent` (e.g. with `MCPTools` and `Channels`) actually correct?**
  _`ExecutionAgent` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `AgentManager` (e.g. with `PerceptionAgent` and `PlanningAgent`) actually correct?**
  _`AgentManager` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `VerificationAgent` (e.g. with `AgentManager` and `Agent Manager =============== Orchestrates the multi-agent pipeline:   Event → P`) actually correct?**
  _`VerificationAgent` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `MarketingAgent` (e.g. with `AgentManager` and `Agent Manager =============== Orchestrates the multi-agent pipeline:   Event → P`) actually correct?**
  _`MarketingAgent` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 32 inferred relationships involving `PlanningAgent` (e.g. with `AgentManager` and `Agent Manager =============== Orchestrates the multi-agent pipeline:   Event → P`) actually correct?**
  _`PlanningAgent` has 32 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Approvals router — human-in-the-loop oversight.  When ``APPROVAL_REQUIRED`` is e`, `List pipelines currently awaiting human approval.`, `Approve (resume execution) or reject (cancel) a held pipeline.` to the rest of the system?**
  _164 weakly-connected nodes found - possible documentation gaps or missing edges._
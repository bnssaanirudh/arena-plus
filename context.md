# ArenaPulse Project Context

## Overview
**ArenaPulse** is an autonomous, multi-agent logistics intelligence platform for large-scale events (e.g. FIFA World Cup 2026). It uses real-time crowd telemetry to predict surges, autonomously allocate resources, and coordinate vendors/staff.

> **Updated 2026-06.** Earlier versions of this file said only "Phases 1 & 2 (frontend + mock simulator)" were done. That is outdated — the backend pipeline, ML, agents, MCP tools, and Elasticsearch ingestion are all implemented. This file now reflects the real state. Known bugs live in [`AUDIT.md`](AUDIT.md); the work list lives in [`TASKS.md`](TASKS.md).

---

## What is actually built

### Frontend (`frontend/`)
- **Stack:** React 19, Vite 8, Tailwind v4, TypeScript. Routing via react-router-dom, state via Zustand, charts via recharts, map via react-leaflet, animation via framer-motion.
- **Pages:** Landing, Capabilities, Operations, Contact (marketing) + **Dashboard** (live control room).
- **Dashboard** opens the WebSocket, feeds a Zustand store, and renders the Leaflet stadium map, live telemetry feed, analytics charts, and an agent-activity panel.

### Backend (`backend/`, FastAPI)
- **Simulator** drives the system: generates a telemetry event every few seconds, publishes it, and processes it through the agent pipeline.
- **Agent pipeline** (state machine): Perception → Planning → Inventory → Validation → Execution, each stage published to a pub/sub channel.
- **Perception** uses a trained ML model (XGBoost/RandomForest) plus an optional Gemini LLM, with a heuristic fallback.
- **Pub/sub** runs over an in-memory mock Redis (no real Redis needed).
- **WebSocket** `/api/v1/ws/dashboard` multiplexes telemetry + all agent channels to the browser.
- **Elasticsearch** integration for telemetry/inventory is present but best-effort (the app runs with ES down).
- **MCP tools** (nearest vendor, overloaded zones, inventory) are exposed over REST for agent use.
- **Observability** via Arize Phoenix + OpenTelemetry.

### Design principle: graceful degradation
Runs with zero external dependencies — mock Redis always, ES optional, Gemini optional, ML model optional (heuristic fallback). Keep this property.

---

## Current known issues (high level — details in AUDIT.md)
- 🔴 **ML model is effectively inert**: live event fields don't match the model's trained feature names, so it predicts on an all-zero vector (constant output). Heuristic fallback is actually more useful right now.
- 🔴 **Dispatch path dead without ES**: vendors live in-memory but the inventory agent looks them up in Elasticsearch.
- 🟠 Half the agent stages show placeholder text in the UI; the dashboard WebSocket has no reconnect; DemoControls buttons are non-functional.
- 🟡 Misc UI/config polish (underscore formatting, unstable keys, map marker jitter, hardcoded URLs, CORS).

## Roadmap (what's left)
See [`TASKS.md`](TASKS.md) for the detailed, status-tracked checklist. Headline items: fix the ML feature contract, wire the vendor fallback, finish the agent→UI message formatting, add WS reconnect, fill the `events/history` + manual-trigger endpoints, and containerize for deployment.

# ArenaPulse — Working Info (Product, Business & Demo Guide)

_A plain-language companion to the technical docs. Written 2026-06-10._

---

## 1. What the product does (in one paragraph)

ArenaPulse is an **AI operations manager for stadiums and large events**. It watches live crowd data (how dense, how many people, which gate), predicts trouble before it happens, and then — without waiting for a human — **does something about it**: moves supplies to where the crowd is heading, reroutes foot traffic, alerts security, orders restocks from suppliers, and even pushes a discount deal to fans' phones to pull them toward an under-used vendor. A human operator can watch everything live on a dashboard and keep veto power over big decisions.

The one-liner: **"Air-traffic control for stadium crowds and commerce — staffed by AI agents."**

---

## 2. The problem it solves

Large events run on radios, spreadsheets, and gut feel:

1. **Crowd surges are detected late.** By the time staff notice a crush forming at a gate, the safe window to act has mostly closed. (Real-world stakes: Seoul 2022, Astroworld 2021 — crowd disasters are a known, recurring failure mode.)
2. **Supply decisions are slow and manual.** A vendor running out of water during halftime means 18+ minutes of radio calls, approvals, and a cart being dispatched — the rush is over before help arrives.
3. **Lost revenue is invisible.** Stock-outs at one stand while the stand 200 m away sits full is pure lost margin nobody measures.
4. **The data exists but nobody can act on it in time.** Cameras, ticket scans, and wifi telemetry already produce density data — humans just can't process and react at event speed.

ArenaPulse closes the gap between **seeing a problem** and **acting on it** — from ~18 minutes to seconds.

---

## 3. Business use case & business flow

### Who pays, and why

| Customer | What they buy it for | Money logic |
|---|---|---|
| **Stadium / venue operators** | Crowd safety + operational efficiency | Avoid liability, fines, and disaster headlines; cut ops staffing cost per event |
| **Event organizers** (leagues, FIFA-class tournaments, concert promoters) | Smooth fan experience at scale | Fan experience = renewals, sponsor value, brand protection |
| **Concession / vendor networks** | Revenue protection | Fewer stock-outs, demand-routed inventory, automated B2B reordering |

### The business flow (follow the money through one surge)

```
Crowd builds at South Gate (halftime rush)
   │
   ▼
ArenaPulse predicts surge → HIGH risk          ← safety value: early warning
   │
   ▼
AI plans: dispatch 800 water / 400 food
   │
   ▼
Checks real supply constraints (road closed?) ← avoids wasted dispatches
   │  infeasible → re-plans via East depot
   ▼
[High-impact? → human approves on dashboard]  ← oversight = insurable, auditable
   │
   ▼
Dispatch executes + restock POs auto-sent
to suppliers (PO-XXXX → supplier acknowledges) ← B2B commerce automation
   │
   ▼
Flash deal pushed to fans near an under-used
vendor ("25% off water at East Plaza, 30 min") ← demand shaping = new revenue
   │
   ▼
Impact logged: ~17.5 min faster than manual,
units dispatched, revenue protected            ← the ROI line for the CFO
```

**Revenue model options** (for a real company): SaaS per venue per season; per-event pricing for tournaments; revenue share on flash-deal commerce; enterprise tier with on-prem deployment.

---

## 4. App navigation flow — every page, what it does, and why it exists

| Page (route) | What it shows | Why it exists (business reason) |
|---|---|---|
| **Home** (`/`) | Marketing landing: value proposition, stats, capabilities preview | First impression for a buyer; explains the product before any login |
| **System Dashboard** (`/dashboard`) | THE control room: live map with surge circles, telemetry feed, impact stats (time saved / units / revenue protected), AI agent activity feed, per-event reasoning timeline, approval queue, flash-deal campaigns, B2B restock orders | This is the product. An ops manager lives here during an event. Demo buttons (Run Demo / Trigger Surge / Multi-Surge) exist so anyone can see the system act within seconds |
| **The Platform** (`/platform`) | How the system works conceptually | Buyer education — answers "what am I actually buying?" |
| **Capabilities** (`/capabilities`) | Feature catalogue | Sales support page |
| **Case Studies** (`/operations`) | Worked scenarios | Social proof / credibility for buyers |
| **Our Process** (`/process`) | Implementation methodology | Answers "how hard is rollout?" — an enterprise-sales question |
| **B2B Supply Hub** (`/supply-hub`) | Live vendor inventory grid, low-stock filter, manual restock form | The vendor-manager's daily tool; shows the commerce half is real, not a slide |
| **Command Center** (`/operator`) | Toggles: human-approval requirement, strict constraint-checking, simulator speed; manual event injection | The "you stay in control" page — proves to a safety officer that AI autonomy has a leash |
| **Global Analytics** (`/analytics`) | Charts fed by live database queries: crowd density by zone, AI decision mix, vendor stock levels | Post-event review and trends; the page a regional ops director checks weekly |
| **System Status** (`/system-status`) | Health of every integration (AI model, search cluster, tracing), diagnostics button | Trust + ops transparency; also the page that proves the tech is real during judging |
| **Contact** (`/contact`) | Lead capture | Standard funnel endpoint |
| **AI Copilot** (floating chat, every page) | Ask questions about live system state in plain English | Lowers the skill floor — a non-technical duty manager can ask "which vendors are low on water?" instead of reading dashboards |

**Intended demo walk-through order:** Home (10 s of context) → Dashboard → click **Run Demo** → watch the cascade → point at Approval Queue + Counterfactual panel → Global Analytics (proof of data) → done.

---

## 5. Honest assessment — is this idea actually good?

**Yes, with caveats. Verdict: strong hackathon project, credible seed of a real product.**

### What's genuinely strong
- **Real, expensive problem.** Crowd safety failures are catastrophic and litigated; stadium commerce loses real money to stock-outs. This is not a made-up pain.
- **The "agent that acts" framing is the right wave.** Most AI demos answer questions; this one takes actions with an audit trail and human override — exactly what enterprise buyers say they want from agentic AI.
- **Safety + commerce in one loop is a real differentiator.** Safety-only systems are a cost center; commerce-only systems are nice-to-have. Tying them together ("the same surge that's a risk is also a sales opportunity") makes the ROI conversation much easier.
- **Human-in-the-loop is built in, not bolted on.** That is the #1 objection from venue operators, pre-answered.
- **Timing.** World Cup 2026, LA 2028 Olympics — large-event infrastructure spending is peaking right now.

### Honest weaknesses (know these before anyone asks)
- **The telemetry is simulated.** A real deployment needs camera/CV or wifi/ticket-scan integrations — that's the hard, expensive part, and the demo skips it. Be upfront: "we consume a telemetry feed; producing it is a solved-but-integration-heavy problem."
- **Trust barrier is high.** No venue will let an AI evacuate a zone autonomously on day one. The realistic go-to-market is *recommendation mode* first (AI suggests, human clicks), full autonomy later. The approval-gate toggle is exactly this story — lead with it.
- **Incumbent competition.** Crowd-analytics vendors (CrowdVision, Density.io, AnyVision-style) exist; venue-ops platforms exist. The differentiator is the *closed action loop* (predict → verify → act → reorder → market), not detection. Never pitch this as "crowd analytics" — that market is taken.
- **Impact numbers are estimates.** "17.5 min saved" is a modeled heuristic, not a measured trial. Fine for a demo; label as estimated (the UI already does).

### USP (the sentence to memorize)
> "Everyone else's dashboard tells you there's a problem. ArenaPulse is the first system that **fixes it before you finish reading the alert** — dispatches supplies, files the purchase orders, redirects the crowd, and shows its reasoning for every decision, with a human veto on anything big."

### Target audience
1. **Primary:** Heads of Operations / Safety Officers at large venues (60k+ stadiums, arenas, festival grounds).
2. **Economic buyer:** VP Operations / GM of the venue or the event franchise (signs the check; cares about liability + cost per event).
3. **Secondary:** Concession-network managers (Aramark/Levy-type operators) — the commerce ROI lands with them.
4. **Tertiary (hackathon-specific):** technical judges — for them, the Gemini/ADK/Elastic/Arize wiring *is* the product.

---

## 6. How to market / sell it — what to actually say

### Elevator pitch (20 seconds)
> "When 60,000 fans surge toward one gate at halftime, your staff has about 3 minutes to react and it usually takes 18. ArenaPulse is an AI operations team that reacts in seconds: it predicts the surge, checks what's actually possible — road closures, depot stock — dispatches supplies, files the restock orders, and pulls fans toward open vendors with instant deals. Your operator watches it all happen on one screen and can veto anything big. Safety incident avoided, revenue captured, fully logged."

### Sales talking points (in order of impact)
1. **Lead with fear, close with money.** Open with crowd-disaster risk ("one incident ends careers and franchises"), close with the revenue-protection number ("and it pays for itself in saved stock-outs").
2. **"Recommendation mode" disarms the trust objection.** Day one it only suggests; you approve every action with one click. Autonomy is a dial you turn up as trust grows.
3. **Every decision is explainable.** Show the reasoning timeline: what the AI saw, what it considered, what constraint changed its mind, what a judge scored the decision. Auditors and insurers love this.
4. **It already self-corrects.** The counterfactual panel ("it wanted to send trucks through a closed road, caught it, re-routed") is the single most persuasive 15 seconds in the demo — it shows judgment, not just automation.
5. **No rip-and-replace.** It consumes a data feed and talks to existing inventory systems; it doesn't replace your cameras or POS.

### Where to market
- Venue-ops trade shows (Stadium Business Summit, ALSD), sports-tech accelerators, direct to World Cup 2026 host-city committees, concession-operator partnerships (one Aramark deal = hundreds of venues).

---

## 7. Demo video: will business people understand it?

### Overall verdict
**Yes — about 80% of the screen is business-legible, and the remaining 20% is deliberate tech-judge bait.** For the hackathon (where judges ARE technical) the current balance is correct. For a pure business audience, a handful of labels need a narrator's sentence or a rename.

### What lands perfectly with business viewers (keep, and point the camera at it)
- **Impact strip** — "35 min response time saved · 1,260 units auto-dispatched · $ revenue protected · vendor engagements." This is CFO language. Open or close the video on it.
- **Live map with surge circles** — instantly readable, zero explanation needed.
- **Approval Queue with Approve/Reject buttons** — "the human stays in charge" communicates itself.
- **B2B Restock Orders** — PO numbers flipping from "ordered" → "✓ acked" reads like real procurement.
- **Autonomous Campaigns** — "25% off water at East Plaza — 30 min window" is self-evidently money.
- **Live Telemetry feed** — "CROWD SURGE / South Gate / Density 9.4 / 11,000 people" is plain.
- **Landing-page copy** — "Forecasting surges 45 minutes ahead", "Dynamic Vendor Allocation" — already business-toned.

### Where it tilts technical (each needs one narrator sentence, or a rename)
| On-screen label | Problem for a business viewer | Fix in video / optional rename |
|---|---|---|
| "Agentic Swarm Activity" | "Agentic" and "swarm" are AI-insider words | Narrate: "this is the AI team's activity log." (Rename option: "AI Team Activity") |
| "RAG: infeasible · 2 self-correction(s)" badge | Nobody outside AI knows "RAG" | Narrate: "the system checked real-world constraints and corrected its own plan — twice." (Rename: "Reality check") |
| "⑤ feasible / ⑤ ↻2" badges | Cryptic glyphs | Covered by the same narrator line |
| "⚖ 9/10" judge badge | Meaning isn't obvious | Narrate: "every decision is independently scored for quality — this one got 9 out of 10." This is actually a *great* business beat once explained |
| "Live ES\|QL" badges + query text (Analytics) | Pure judge bait | In a business cut, don't expand the query; just say "every chart is live from the operational database." For the hackathon cut, DO expand it — judges score it |
| "Pipeline COMPLETED / stage names ①–⑦" | Mildly technical | Fine with one line: "you can replay exactly how the AI reasoned, step by step" |
| System Status page (model IDs, trace endpoints) | Too technical for business | Skip in business cut; show in hackathon cut |

### Concrete recommendation for the demo video
- **Make one video, two audiences, by ordering:** first 90 seconds = pure business story (map → surge → impact strip → approval → flash deal → restock acked), final 60-90 seconds = "under the hood" for technical judges (reasoning timeline, counterfactual, RAG badge, Arize trace, ES|QL query expand).
- **Rule of thumb that the UI already mostly follows:** every number a business person cares about is in dollars, minutes, or units — and it is. Every AI-internals word ("RAG", "agentic", "ES|QL") appears in *secondary* UI (badges, small panels), not headlines — which is the right hierarchy.
- **The single best business moment to script:** the counterfactual panel. "The AI was about to dispatch through a closed road. It caught its own mistake, re-planned through the East depot, and logged both versions." No other line communicates *judgment* + *safety* + *auditability* that fast.
- **The complexity is opt-in, and that's the win:** a viewer who only watches the map, the impact cards, and the approval queue fully understands the product. The deep panels reward whoever leans in. That's the correct design for a mixed audience, so: **no UI rework needed before recording** — narration carries the remaining 20%.

---

## 8. One-page cheat sheet (if you remember nothing else)

- **Product:** AI ops team for stadiums — predicts crowd trouble, acts in seconds, human keeps veto.
- **Problem:** 18-minute manual response loops vs 3-minute safe windows; invisible stock-out losses.
- **USP:** the only closed loop — predict → reality-check → act → reorder → market — with explainable, scored, vetoable decisions.
- **Audience:** venue ops/safety heads (user), VP Ops (buyer), concession operators (ROI ally).
- **Pitch:** lead with safety fear, close with revenue math, disarm with "recommendation mode."
- **Demo:** business story first 90 s (map → impact → approval → deal), tech depth last 90 s. The UI balance is already right; narration bridges the jargon.

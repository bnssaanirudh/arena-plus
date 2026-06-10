import { create } from 'zustand';

interface TelemetryEvent {
  event_id: string;
  event_type: string;
  location: string;
  density_score: number;
  predicted_people: number;
  timestamp: string;
}

export interface AgentAction {
  agent_name: string;
  action: string;
  reasoning: string;
  timestamp: string;
  event_id?: string;
  stage?: string;
}

export interface FlashDeal {
  event_id: string;
  headline: string;
  message: string;
  discount_pct: number;
  item: string;
  zone: string;
  vendor_name?: string;
  valid_for_minutes: number;
  drafted_by: string;
  issued_at: string;
  timestamp: string;
}

export interface RestockOrder {
  order_id: string;
  vendor_id: string;
  vendor_name: string;
  item: string;
  quantity: number;
  supplier: string;
  status: string;
  created_at: string;
  ack_at?: string;  // set when supplier acknowledges
}

export interface RestockAck {
  order_id: string;
  status: string;
  ack_at: string;
}

export interface RestockBatch {
  event_id: string;
  orders: RestockOrder[];
  timestamp: string;
}

export interface PendingApproval {
  event_id: string;
  action: string;
  timestamp: string;
}

export interface VerificationInfo {
  event_id: string;
  feasible: boolean;
  confidence: string;
  blocking: string[];
  correction: string;
  replan_count: number;
  constraints_checked: number;
  verified_by: string;
  timestamp: string;
}

export interface PlanSnapshot {
  action: string;
  priority: string;
  resources_required?: { water: number; food: number };
  reasoning: string;
}

export interface Counterfactual {
  event_id: string;
  rejected: PlanSnapshot;
  corrected: PlanSnapshot;
  correction: string;
  blocking: string[];
  timestamp: string;
}

export interface ImpactStat {
  event_id: string;
  response_time_saved_min: number;
  units_dispatched: number;
  revenue_protected_usd: number;
  vendors_engaged: number;
  timestamp: string;
}

export interface PlanEval {
  event_id: string;
  score: number;
  rationale: string;
  timestamp: string;
}

interface AppState {
  liveEvents: TelemetryEvent[];
  agentActions: AgentAction[];
  flashDeals: FlashDeal[];
  restockBatches: RestockBatch[];
  pendingApprovals: PendingApproval[];
  verifications: Record<string, VerificationInfo>;
  counterfactuals: Counterfactual[];
  impacts: ImpactStat[];
  planEvals: Record<string, PlanEval>;
  isDemoMode: boolean;

  addEvent: (event: TelemetryEvent) => void;
  addAgentAction: (action: AgentAction) => void;
  addFlashDeal: (deal: FlashDeal) => void;
  addRestockBatch: (batch: RestockBatch) => void;
  addApproval: (approval: PendingApproval) => void;
  resolveApproval: (event_id: string) => void;
  acknowledgeRestockOrders: (event_id: string, acks: RestockAck[]) => void;
  addVerification: (v: VerificationInfo) => void;
  addCounterfactual: (c: Counterfactual) => void;
  addImpact: (i: ImpactStat) => void;
  addPlanEval: (e: PlanEval) => void;
  setDemoMode: (val: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  liveEvents: [],
  agentActions: [],
  flashDeals: [],
  restockBatches: [],
  pendingApprovals: [],
  verifications: {},
  counterfactuals: [],
  impacts: [],
  planEvals: {},
  isDemoMode: false,

  addEvent: (event) => set((state) => {
    // Deduplicate by event_id — guards against double WS connections
    if (state.liveEvents.some((e) => e.event_id === event.event_id)) return state;
    return { liveEvents: [event, ...state.liveEvents].slice(0, 50) };
  }),
  addAgentAction: (action) => set((state) => {
    // Deduplicate by agent_name + timestamp — same message from two sockets
    const key = `${action.agent_name}\x00${action.timestamp}\x00${action.action}`;
    if (state.agentActions.some((a) => `${a.agent_name}\x00${a.timestamp}\x00${a.action}` === key)) return state;
    return { agentActions: [action, ...state.agentActions].slice(0, 100) };
  }),
  addFlashDeal: (deal) => set((state) => {
    if (state.flashDeals.some((d) => d.event_id === deal.event_id)) return state;
    return { flashDeals: [deal, ...state.flashDeals].slice(0, 20) };
  }),
  addRestockBatch: (batch) => set((state) => {
    if (state.restockBatches.some((b) => b.event_id === batch.event_id)) return state;
    return { restockBatches: [batch, ...state.restockBatches].slice(0, 20) };
  }),
  addApproval: (approval) => set((state) => ({
    // Deduplicate by event_id
    pendingApprovals: state.pendingApprovals.some(a => a.event_id === approval.event_id)
      ? state.pendingApprovals
      : [approval, ...state.pendingApprovals],
  })),
  resolveApproval: (event_id) => set((state) => ({
    pendingApprovals: state.pendingApprovals.filter(a => a.event_id !== event_id),
  })),
  acknowledgeRestockOrders: (event_id, acks) => set((state) => {
    const ackMap = new Map(acks.map((a) => [a.order_id, a]));
    return {
      restockBatches: state.restockBatches.map((batch) =>
        batch.event_id !== event_id
          ? batch
          : {
              ...batch,
              orders: batch.orders.map((o) => {
                const ack = ackMap.get(o.order_id);
                return ack ? { ...o, status: ack.status, ack_at: ack.ack_at } : o;
              }),
            }
      ),
    };
  }),
  addVerification: (v) => set((state) => {
    // Keep the latest verification per event (self-correction overwrites prior)
    const prev = state.verifications[v.event_id];
    if (prev && prev.replan_count > v.replan_count) return state;
    return { verifications: { ...state.verifications, [v.event_id]: v } };
  }),
  addCounterfactual: (c) => set((state) => {
    // One per event_id+timestamp — replans of the same event may add another
    const key = `${c.event_id}\x00${c.timestamp}`;
    if (state.counterfactuals.some((x) => `${x.event_id}\x00${x.timestamp}` === key)) return state;
    return { counterfactuals: [c, ...state.counterfactuals].slice(0, 10) };
  }),
  addImpact: (i) => set((state) => {
    if (state.impacts.some((x) => x.event_id === i.event_id)) return state;
    return { impacts: [i, ...state.impacts].slice(0, 50) };
  }),
  addPlanEval: (e) => set((state) => ({
    planEvals: { ...state.planEvals, [e.event_id]: e },
  })),
  setDemoMode: (val) => set({ isDemoMode: val }),
}));

import { create } from 'zustand';

interface TelemetryEvent {
  event_id: string;
  event_type: string;
  location: string;
  density_score: number;
  predicted_people: number;
  timestamp: string;
}

interface AgentAction {
  agent_name: string;
  action: string;
  reasoning: string;
  timestamp: string;
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

interface AppState {
  liveEvents: TelemetryEvent[];
  agentActions: AgentAction[];
  flashDeals: FlashDeal[];
  restockBatches: RestockBatch[];
  pendingApprovals: PendingApproval[];
  isDemoMode: boolean;

  addEvent: (event: TelemetryEvent) => void;
  addAgentAction: (action: AgentAction) => void;
  addFlashDeal: (deal: FlashDeal) => void;
  addRestockBatch: (batch: RestockBatch) => void;
  addApproval: (approval: PendingApproval) => void;
  resolveApproval: (event_id: string) => void;
  setDemoMode: (val: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  liveEvents: [],
  agentActions: [],
  flashDeals: [],
  restockBatches: [],
  pendingApprovals: [],
  isDemoMode: false,

  addEvent: (event) => set((state) => ({
    liveEvents: [event, ...state.liveEvents].slice(0, 50),
  })),
  addAgentAction: (action) => set((state) => ({
    agentActions: [action, ...state.agentActions].slice(0, 50),
  })),
  addFlashDeal: (deal) => set((state) => ({
    flashDeals: [deal, ...state.flashDeals].slice(0, 20),
  })),
  addRestockBatch: (batch) => set((state) => ({
    restockBatches: [batch, ...state.restockBatches].slice(0, 20),
  })),
  addApproval: (approval) => set((state) => ({
    // Deduplicate by event_id
    pendingApprovals: state.pendingApprovals.some(a => a.event_id === approval.event_id)
      ? state.pendingApprovals
      : [approval, ...state.pendingApprovals],
  })),
  resolveApproval: (event_id) => set((state) => ({
    pendingApprovals: state.pendingApprovals.filter(a => a.event_id !== event_id),
  })),
  setDemoMode: (val) => set({ isDemoMode: val }),
}));

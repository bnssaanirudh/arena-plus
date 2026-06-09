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

interface AppState {
  liveEvents: TelemetryEvent[];
  agentActions: AgentAction[];
  addEvent: (event: TelemetryEvent) => void;
  addAgentAction: (action: AgentAction) => void;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  liveEvents: [],
  agentActions: [],
  addEvent: (event) => set((state) => ({ 
      liveEvents: [event, ...state.liveEvents].slice(0, 50) 
  })),
  addAgentAction: (action) => set((state) => ({ 
      agentActions: [action, ...state.agentActions].slice(0, 50) 
  })),
  isDemoMode: false,
  setDemoMode: (val) => set({ isDemoMode: val })
}));

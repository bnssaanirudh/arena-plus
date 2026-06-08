import { create } from 'zustand';

interface TelemetryEvent {
  event_id: string;
  event_type: string;
  location: string;
  density_score: number;
  predicted_people: number;
  timestamp: string;
}

interface AppState {
  liveEvents: TelemetryEvent[];
  agentActions: any[];
  addEvent: (event: TelemetryEvent) => void;
  addAgentAction: (action: any) => void;
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

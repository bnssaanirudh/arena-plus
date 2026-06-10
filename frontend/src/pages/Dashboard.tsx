import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { LiveFeed } from '../components/LiveFeed';
import { AgentPanel } from '../components/AgentPanel';
import { Analytics } from '../components/Analytics';
import { DemoControls } from '../components/DemoControls';
import { CampaignsPanel } from '../components/CampaignsPanel';
import { RestockPanel } from '../components/RestockPanel';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { EventTimeline } from '../components/EventTimeline';
import { useStore } from '../store/useStore';

// Leaflet + react-leaflet are heavy — split into their own chunk and load lazily.
const StadiumMap = lazy(() =>
  import('../components/StadiumMap').then((m) => ({ default: m.StadiumMap })),
);

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
const WS_URL = API_BASE.replace(/^http/, 'ws') + '/api/v1/ws/dashboard';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

type WsStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');

  useEffect(() => {
    let destroyed = false;
    let currentWs: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = RECONNECT_BASE_MS;

    function connect() {
      if (destroyed) return;
      setWsStatus('connecting');

      const ws = new WebSocket(WS_URL);
      currentWs = ws;

      ws.onopen = () => {
        retryDelay = RECONNECT_BASE_MS;
        setWsStatus('live');
      };

      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data as string);
          // Read store actions at call time — no stale closure captures
          const s = useStore.getState();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = payload.data as any;
          switch (payload.type) {
            case 'telemetry':         s.addEvent(d); break;
            case 'agent_action':      s.addAgentAction(d); break;
            case 'flash_deal':        s.addFlashDeal(d); break;
            case 'restock_orders':    s.addRestockBatch(d); break;
            case 'approval_needed':   s.addApproval(d); break;
            case 'approval_resolved': s.resolveApproval(d.event_id as string); break;
            case 'restock_ack':       s.acknowledgeRestockOrders(d.event_id as string, d.acks); break;
            case 'verification':      s.addVerification(d); break;
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onclose = () => {
        // Guard: only reconnect if this WS is still current AND we're not destroyed
        if (destroyed || ws !== currentWs) return;
        setWsStatus('reconnecting');
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX_MS);
          connect();
        }, retryDelay);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      currentWs?.close();
      setWsStatus('offline');
    };
  }, []); // stable — store read via useStore.getState() inside handler

  const statusColor: Record<WsStatus, string> = {
    live: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    reconnecting: 'bg-orange-500 animate-pulse',
    offline: 'bg-red-500',
  };
  const statusLabel: Record<WsStatus, string> = {
    live: 'Live',
    connecting: 'Connecting…',
    reconnecting: 'Reconnecting…',
    offline: 'Offline',
  };

  return (
    <div className="w-full min-h-screen flex flex-col relative bg-black text-white selection:bg-orange-500 selection:text-white pb-20">
      
      {/* Navigation Overlay */}
      <div className={`bs-nav-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto mt-12 overflow-y-auto max-h-[85vh] pr-4 custom-scrollbar">
          <Link to="/" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/platform" className="bs-nav-link" onClick={() => setMenuOpen(false)}>The Platform</Link>
          <Link to="/capabilities" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Capabilities</Link>
          <Link to="/operations" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Case Studies</Link>
          <Link to="/process" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Our Process</Link>
          <Link to="/supply-hub" className="bs-nav-link" onClick={() => setMenuOpen(false)}>B2B Supply Hub</Link>
          <Link to="/operator" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Command Center</Link>
          <Link to="/analytics" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Global Analytics</Link>
          <Link to="/system-status" className="bs-nav-link" onClick={() => setMenuOpen(false)}>System Status</Link>
          <Link to="/contact" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Contact</Link>
        </div>
      </div>

      {/* Absolute Header Overlay */}
      <header className="absolute top-0 left-0 w-full z-[100] flex justify-between items-center p-8 pointer-events-none text-white">
        <div className="pointer-events-auto">
            <Link to="/" className="text-3xl font-black tracking-tighter uppercase flex items-center gap-2">
              <span className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></span>
              ArenaPulse
            </Link>
        </div>
        <div className="pointer-events-auto flex items-center gap-6">
          {/* Connection status badge */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            <span className={`w-2 h-2 rounded-full ${statusColor[wsStatus]}`}></span>
            <span className="text-white/70">{statusLabel[wsStatus]}</span>
          </div>
          <DemoControls />
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-4 hover:opacity-70 transition-opacity uppercase font-bold text-sm tracking-widest"
          >
            <span className="hidden md:block">{menuOpen ? 'Close' : 'Menu'}</span>
            <div className="flex flex-col gap-[6px]">
              <span className={`w-8 h-[2px] block transition-transform origin-center ${menuOpen ? 'rotate-45 translate-y-[8px] bg-black' : 'bg-white'}`}></span>
              <span className={`w-8 h-[2px] block transition-transform origin-center ${menuOpen ? '-rotate-45 -translate-y-[8px] bg-black' : 'bg-white'}`}></span>
            </div>
          </button>
        </div>
      </header>

      {/* Hero Map Section (Locked Proportions via Aspect Ratio) */}
      <section 
        className="relative w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9] min-h-[500px] max-h-[85vh] overflow-hidden bg-[#111]"
        style={{ containerType: 'inline-size' }}
      >
        {/* Shifting the map container down so it doesn't overlap with the absolute header */}
        <div className="absolute top-28 inset-x-0 bottom-0 z-0 opacity-80">
          <Suspense fallback={<div className="w-full h-full bg-[#111] animate-pulse" />}>
            <StadiumMap />
          </Suspense>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none z-10"></div>
        
        {/* Glassmorphic Panel over Map */}
        <div className="absolute bottom-[2em] left-[2em] z-20 w-[32em] pointer-events-auto" style={{ fontSize: 'max(8px, 1.2vmin)' }}>
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-[1.5em] rounded-[0.5em]">
            <h2 className="font-black uppercase tracking-widest text-orange-500 mb-[1em] text-[1.5em]">Live Telemetry</h2>
            <div className="overflow-y-auto custom-scrollbar pr-[0.5em] max-h-[25em]">
              <LiveFeed />
            </div>
          </div>
        </div>
      </section>

      {/* Ticker Divider */}
      <div className="bs-ticker-container border-y border-white/10 my-0 shrink-0">
        <div className="bs-ticker">
          AUTONOMOUS LOGISTICS INTELLIGENCE ✦ CROWD TELEMETRY ACTIVE ✦ AGENT RESOURCES DEPLOYED ✦ AUTONOMOUS LOGISTICS INTELLIGENCE ✦ 
        </div>
        <div className="bs-ticker" aria-hidden="true">
          AUTONOMOUS LOGISTICS INTELLIGENCE ✦ CROWD TELEMETRY ACTIVE ✦ AGENT RESOURCES DEPLOYED ✦ AUTONOMOUS LOGISTICS INTELLIGENCE ✦ 
        </div>
      </div>

      {/* Content Grid */}
      <section className="w-full flex-1 flex flex-col bg-[#fcfcfc] text-[#111111] p-6 lg:p-8">
        <h2 className="text-4xl lg:text-5xl font-black uppercase mb-8 tracking-tight shrink-0 text-black flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-orange-500 animate-ping"></span>
          System Operations
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-slate-200/80 p-6 flex flex-col h-[500px] lg:h-[650px] rounded-xl shadow-md">
            <div className="flex-1 min-h-0">
              <Analytics />
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200/80 p-6 flex flex-col h-[500px] lg:h-[650px] rounded-xl shadow-md">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
              <AgentPanel />
            </div>
          </div>
        </div>

        {/* Second row — Agent Reasoning Timeline (full width) */}
        <div className="mt-8 bg-white border border-slate-200/80 p-6 flex flex-col h-[380px] rounded-xl shadow-md">
          <h3 className="text-xl font-bold uppercase mb-4 tracking-widest text-black shrink-0 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            Agent Reasoning Timeline
            <span className="ml-2 text-xs font-normal text-slate-500 normal-case tracking-normal">
              per-event pipeline · scroll →
            </span>
          </h3>
          <div className="flex-1 min-h-0">
            <EventTimeline />
          </div>
        </div>

        {/* Third row — Approval Queue + Campaigns + Restock */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          <div className="lg:col-span-4 bg-red-50/40 border border-red-200/60 p-6 flex flex-col h-[400px] rounded-xl shadow-md">
            <h3 className="text-xl font-bold uppercase mb-4 tracking-widest text-red-600 shrink-0 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              Approval Queue
            </h3>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <ApprovalQueue />
            </div>
          </div>

          <div className="lg:col-span-4 bg-blue-50/40 border border-blue-200/60 p-6 flex flex-col h-[400px] rounded-xl shadow-md">
            <h3 className="text-xl font-bold uppercase mb-4 tracking-widest text-blue-600 shrink-0 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              Autonomous Campaigns
            </h3>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <CampaignsPanel />
            </div>
          </div>

          <div className="lg:col-span-4 bg-green-50/40 border border-green-200/60 p-6 flex flex-col h-[400px] rounded-xl shadow-md">
            <h3 className="text-xl font-bold uppercase mb-4 tracking-widest text-green-600 shrink-0 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              B2B Restock Orders
            </h3>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <RestockPanel />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

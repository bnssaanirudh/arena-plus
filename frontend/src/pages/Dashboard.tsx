import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StadiumMap } from '../components/StadiumMap';
import { LiveFeed } from '../components/LiveFeed';
import { AgentPanel } from '../components/AgentPanel';
import { Analytics } from '../components/Analytics';
import { DemoControls } from '../components/DemoControls';
import { useStore } from '../store/useStore';

export default function Dashboard() {
  const { addEvent, addAgentAction } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/api/v1/ws/dashboard');
    
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'telemetry') {
          addEvent(payload.data);
        } else if (payload.type === 'agent_action') {
          addAgentAction(payload.data);
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [addEvent, addAgentAction]);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col relative bg-black text-white selection:bg-orange-500 selection:text-white">
      
      {/* Navigation Overlay */}
      <div className={`bs-nav-overlay ${menuOpen ? 'open' : ''}`}>
        <Link to="/" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
        <a href="#" className="bs-nav-link" onClick={() => setMenuOpen(false)}>System Status</a>
        <a href="#" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Global Analytics</a>
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

      {/* Hero Map Section (Takes 55% of flexible height) */}
      <section className="relative w-full flex-[55] min-h-0 overflow-hidden bg-[#111]">
        {/* Shifting the map container down so it doesn't overlap with the absolute header */}
        <div className="absolute top-28 inset-x-0 bottom-0 z-0 opacity-80">
          <StadiumMap />
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none z-10"></div>
        
        {/* Glassmorphic Panel over Map */}
        <div className="absolute bottom-8 left-8 z-20 w-full max-w-md pointer-events-auto">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6">
            <h2 className="text-xl font-black uppercase mb-4 tracking-widest text-orange-500">Live Telemetry</h2>
            <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar">
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

      {/* Content Grid (Takes 45% of flexible height) */}
      <section className="w-full flex-[45] min-h-0 flex flex-col bg-white text-black p-6 lg:p-8">
        <h2 className="text-3xl lg:text-5xl font-black uppercase mb-6 tracking-tight shrink-0">System Status</h2>
        
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-[#f8f9fa] border-b-2 border-slate-300 p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold uppercase mb-4 tracking-widest text-slate-400 shrink-0">Global Analytics</h3>
            <div className="flex-1 min-h-0">
              <Analytics />
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#111] text-white border-b-2 border-slate-800 p-6 flex flex-col h-full">
            <h3 className="text-xl font-bold uppercase mb-4 tracking-widest text-orange-500 shrink-0">Active Agents</h3>
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
              <AgentPanel />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

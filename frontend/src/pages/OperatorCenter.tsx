import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Sliders, ToggleLeft, ToggleRight, Radio, Info } from 'lucide-react';

export default function OperatorCenter() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [oversight, setOversight] = useState(false);
  const [strictRAG, setStrictRAG] = useState(true);
  const [simInterval, setSimInterval] = useState('5');
  const [selectedEvent, setSelectedEvent] = useState('crowd_surge');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

  useEffect(() => {
    const fetchCurrentSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/status/`);
        const payload = await res.json();
        setOversight(payload.system.approval_required);
        setStrictRAG(payload.system.strict_rag);
        setSimInterval(String(payload.simulator.interval_seconds));
      } catch (err) {
        console.error('Failed to load settings from status API:', err);
      }
    };
    fetchCurrentSettings();
  }, []);

  const updateSetting = async (key: 'approval_required' | 'strict_rag' | 'simulation_interval_seconds', value: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/status/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Policy override updated: ${key} = ${value}` });
      } else {
        setAlertMsg({ type: 'error', text: `Failed to update policy override: status code ${res.status}` });
      }
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: 'error', text: `Failed to contact backend API. Changed locally.` });
    }
  };

  const triggerEvent = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: type })
      });
      const data = await res.json();
      setAlertMsg({ type: 'success', text: `Simulated event triggered successfully! ID: ${data.event_id.substring(0, 8)}... (${data.event_type})` });
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: 'error', text: 'Failed to contact backend API. Simulated locally.' });
    } finally {
      setLoading(false);
    }
  };

  const triggerDemo = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/v1/events/demo`, { method: 'POST' });
      setAlertMsg({ type: 'success', text: '5-event surge cascade started — watch the dashboard live feeds!' });
    } catch (err) {
      console.error(err);
      setAlertMsg({ type: 'error', text: 'Failed to trigger demo cascade.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      {/* Navigation Overlay */}
      <div className={`bs-nav-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="flex flex-col gap-8 md:gap-12 w-full max-w-4xl mx-auto mt-16 text-black">
          <Link to="/" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/dashboard" className="bs-nav-link" onClick={() => setMenuOpen(false)}>System Dashboard</Link>
          <Link to="/platform" className="bs-nav-link" onClick={() => setMenuOpen(false)}>The Platform</Link>
          <Link to="/capabilities" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Capabilities</Link>
          <Link to="/operations" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Case Studies</Link>
          <Link to="/process" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Our Process</Link>
          <Link to="/contact" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Contact</Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 left-0 w-full z-[80] bg-white/85 backdrop-blur-md border-b border-slate-200/80 flex justify-between items-center px-6 py-5 md:px-12 md:py-6">
        <Link to="/" className="font-bold tracking-tight text-xl md:text-2xl uppercase flex items-center gap-2 text-black hover:text-orange-600 transition-colors">
          ArenaPulse
        </Link>
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-4 hover:opacity-70 transition-opacity uppercase font-medium text-xs md:text-sm tracking-widest text-black"
        >
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
          <div className="flex flex-col gap-[6px]">
            <span className={`w-8 h-[2px] block bg-black transition-transform origin-center ${menuOpen ? 'rotate-45 translate-y-[8px]' : ''}`}></span>
            <span className={`w-8 h-[2px] block bg-black transition-transform origin-center ${menuOpen ? '-rotate-45 -translate-y-[8px]' : ''}`}></span>
          </div>
        </button>
      </header>

      {/* Hero Header */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">System Configuration</span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none mb-4">
            Command Center
          </h1>
          <p className="text-lg text-slate-600 font-light max-w-3xl leading-relaxed">
            Manage system overrides, tune constraint checking severity, and inject telemetry alerts directly into the active multi-agent pipeline.
          </p>
        </div>
      </section>

      {/* Alert Banner */}
      {alertMsg && (
        <section className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-6">
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${alertMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <span>{alertMsg.text}</span>
            <button onClick={() => setAlertMsg(null)} className="uppercase text-[9px] border border-current px-2 py-0.5 rounded hover:bg-white transition-colors">Dismiss</button>
          </div>
        </section>
      )}

      {/* Control Console */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Side: System Parameter Toggles */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-6">
            <h3 className="text-lg font-bold uppercase tracking-wide text-black flex items-center gap-2 border-b border-slate-100 pb-4">
              <Sliders className="w-5 h-5 text-orange-600" />
              Policy Overrides
            </h3>

            {/* Oversight Switch */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">Human-in-the-loop oversight</span>
                <span className="text-[10px] text-slate-500 font-light block">Pauses P0 dispatches for approval.</span>
              </div>
              <button 
                onClick={async () => {
                  const val = !oversight;
                  setOversight(val);
                  await updateSetting('approval_required', val);
                }} 
                className="text-slate-600 hover:text-orange-600 transition-colors cursor-pointer"
              >
                {oversight ? <ToggleRight className="w-12 h-12 text-orange-600" /> : <ToggleLeft className="w-12 h-12" />}
              </button>
            </div>

            {/* RAG Severity Switch */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">Strict RAG Rules Compliance</span>
                <span className="text-[10px] text-slate-500 font-light block">BM25 rule-checks trigger self-correction.</span>
              </div>
              <button 
                onClick={async () => {
                  const val = !strictRAG;
                  setStrictRAG(val);
                  await updateSetting('strict_rag', val);
                }} 
                className="text-slate-600 hover:text-orange-600 transition-colors cursor-pointer"
              >
                {strictRAG ? <ToggleRight className="w-12 h-12 text-orange-600" /> : <ToggleLeft className="w-12 h-12" />}
              </button>
            </div>

            {/* Simulation Interval Selection */}
            <div>
              <label className="block uppercase text-[10px] font-bold tracking-widest text-slate-400 mb-2">Simulator Tick Speed</label>
              <select 
                value={simInterval}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSimInterval(val);
                  await updateSetting('simulation_interval_seconds', parseInt(val));
                }}
                className="w-full border border-slate-200 px-4 py-3 rounded-lg text-sm text-black bg-white cursor-pointer focus:border-orange-500 focus:outline-none"
              >
                <option value="5">Fast Trigger Mode (5s / Event)</option>
                <option value="15">Operational Mode (15s / Event)</option>
                <option value="30">Monitoring Mode (30s / Event)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Side: Incident Injector */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-6">
            <h3 className="text-lg font-bold uppercase tracking-wide text-black flex items-center gap-2 border-b border-slate-100 pb-4">
              <Radio className="w-5 h-5 text-orange-600 animate-pulse" />
              Simulated Telemetry Injector
            </h3>

            {/* Inject Event Form */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block uppercase text-[10px] font-bold tracking-widest text-slate-400 mb-2">Simulate Alert Type</label>
                <select 
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full border border-slate-200 px-4 py-3 rounded-lg text-sm text-black bg-white cursor-pointer focus:border-orange-500 focus:outline-none"
                >
                  <option value="crowd_surge">Halftime Crowd Surge (Zone 4 Corridor)</option>
                  <option value="gate_congestion">Entrance Gate Congestion (Zone 1 Turnstile)</option>
                  <option value="concession_shortage">Concession Inventory Shortage (Zone 2 POS)</option>
                  <option value="security_alert">Suspicious Package Detection (Zone 3 Bridge)</option>
                </select>
              </div>

              <button 
                onClick={() => triggerEvent(selectedEvent)}
                disabled={loading}
                className="w-full bg-black hover:bg-orange-600 text-white font-bold uppercase text-[10px] tracking-widest py-3.5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Inject Custom Telemetry Event
              </button>
            </div>

            {/* Demo cascade trigger */}
            <div className="border-t border-slate-100 pt-6 flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">Automated Showcase Cascade</span>
                <span className="text-[10px] text-slate-500 font-light block">Fires the full 5-event stadium scenario sequentially for recording and testing.</span>
              </div>

              <button 
                onClick={triggerDemo}
                disabled={loading}
                className="w-full border border-black hover:bg-black hover:text-white text-black font-bold uppercase text-[10px] tracking-widest py-3.5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Trigger 5-Event Cascade Scenario
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-xs text-slate-500">
            <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <p>Parameters set in the Operator Command Center directly override default simulation behaviors. Verify that your WebSocket stream is active on the <Link to="/dashboard" className="font-bold text-orange-600 hover:underline">System Dashboard</Link> to observe incoming events.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full bg-black text-white px-6 py-16 md:px-16 md:py-24 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter mb-2">ArenaPulse</h2>
          <p className="text-gray-500 font-light text-sm">© 2026 Logistics Intelligence. All Rights Reserved.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-6 md:gap-12 font-bold uppercase text-xs md:text-sm tracking-widest text-gray-400">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link to="/capabilities" className="hover:text-white transition-colors">Capabilities</Link>
          <Link to="/operations" className="hover:text-white transition-colors">Operations</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Users, TrendingDown, LayoutGrid } from 'lucide-react';

export default function Operations() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [capacity, setCapacity] = useState<number>(65000);

  // Dynamic calculations based on capacity
  const calculatedAgents = Math.round(capacity * 0.0055);
  const calculatedIngestion = Math.round(capacity * 0.35);
  const calculatedWaitReduction = Math.min(48, Math.round(25 + (capacity / 5000)));

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      {/* Navigation Overlay */}
      <div className={`bs-nav-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="flex flex-col gap-8 md:gap-12 w-full max-w-4xl mx-auto mt-16 text-black">
          <Link to="/" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/dashboard" className="bs-nav-link" onClick={() => setMenuOpen(false)}>System Dashboard</Link>
          <Link to="/platform" className="bs-nav-link" onClick={() => setMenuOpen(false)}>The Platform</Link>
          <Link to="/capabilities" className="bs-nav-link" onClick={() => setMenuOpen(false)}>Capabilities</Link>
          <Link to="/operations" className="bs-nav-link text-orange-600 border-orange-600 pl-8" onClick={() => setMenuOpen(false)}>Case Studies</Link>
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

      {/* Hero */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">Case Studies</span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none mb-4">
            Global Operations
          </h1>
          <p className="text-lg text-slate-600 font-light max-w-3xl leading-relaxed">
            ArenaPulse has been deployed across global events to coordinate logistics, prevent spectator congestion, and automate vendor restocking.
          </p>
        </div>
      </section>

      {/* Cases Grid + Estimator */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 flex-grow flex flex-col lg:flex-row gap-12">
        
        {/* Left Side: Estimator Console */}
        <div className="lg:w-5/12 flex flex-col gap-6">
          <div className="border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold uppercase tracking-wide text-black mb-1">Swarm Capacity Estimator</h3>
              <p className="text-xs text-slate-500 font-light">Drag the slider to adjust venue capacity and estimate the required active agent swarm nodes.</p>
            </div>
            
            {/* Input Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span>STADIUM CAPACITY</span>
                <span className="font-mono text-orange-600 text-sm">{capacity.toLocaleString()} Fans</span>
              </div>
              <input 
                type="range" 
                min={20000} 
                max={100000} 
                step={5000}
                value={capacity} 
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none"
              />
            </div>

            {/* Calculations outputs */}
            <div className="border-t border-slate-100 pt-6 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-light flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-orange-600" /> Active Agent Nodes
                </span>
                <span className="font-black font-mono text-black">{calculatedAgents} Swarm Agents</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-light flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600" /> Ingestion Latency (p99)
                </span>
                <span className="font-black font-mono text-black">12ms @ {calculatedIngestion.toLocaleString()}/s</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 font-light flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-600" /> Wait Time Reduction
                </span>
                <span className="font-black font-mono text-emerald-600">{calculatedWaitReduction}% Expected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Case Studies */}
        <div className="lg:w-7/12 flex flex-col gap-10">
          {/* Study 1 */}
          <div className="border border-slate-200/80 bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-widest mb-4">
              <Globe className="w-4 h-4" /> Global Tournament
            </div>
            <h3 className="text-2xl font-black uppercase text-black mb-3">FIFA World Cup 2026 Setup</h3>
            <p className="text-slate-600 font-light leading-relaxed mb-6">
              To support the upcoming World Cup, ArenaPulse is deployed across 16 Host Cities. By combining real-time turnstile mapping and concession restocking queues, we estimate a 42% reduction in gate bottleneck delays.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-slate-100 px-3 py-1 font-bold text-slate-600 uppercase tracking-wide rounded">16 Stadia</span>
              <span className="bg-slate-100 px-3 py-1 font-bold text-slate-600 uppercase tracking-wide rounded">Multi-Agent Swarm</span>
              <span className="bg-slate-100 px-3 py-1 font-bold text-slate-600 uppercase tracking-wide rounded">Elastic BM25 RAG</span>
            </div>
          </div>

          {/* Study 2 */}
          <div className="border border-slate-200/80 bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-widest mb-4">
              <Globe className="w-4 h-4" /> Athletic Games
            </div>
            <h3 className="text-2xl font-black uppercase text-black mb-3">Summer Athletics 2028</h3>
            <p className="text-slate-600 font-light leading-relaxed mb-6">
              Pedestrian crowd flows are modeled dynamically to optimize egress operations. Using an array of VisionEngine detectors, the platform auto-routes digital pedestrian indicators to reduce high-congestion bottlenecks.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-slate-100 px-3 py-1 font-bold text-slate-600 uppercase tracking-wide rounded">Pedestrian Flow</span>
              <span className="bg-slate-100 px-3 py-1 font-bold text-slate-600 uppercase tracking-wide rounded">XGBoost Forecasts</span>
              <span className="bg-slate-100 px-3 py-1 font-bold text-slate-600 uppercase tracking-wide rounded">OTLP Traces</span>
            </div>
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

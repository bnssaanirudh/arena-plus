import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, RefreshCw, ChevronDown } from 'lucide-react';

interface ZoneData {
  time: string;
  "Zone 1": number;
  "Zone 2": number;
  "Zone 3": number;
  "Zone 4": number;
  "Zone 5": number;
  "Zone 6": number;
  "Zone 7": number;
}

export default function GlobalAnalytics() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedPhase, setSelectedPhase] = useState<string>('Halftime');
  const [loading, setLoading] = useState(false);

  // Simulated time series density data by zone
  const densityData: ZoneData[] = [
    { time: '18:00', "Zone 1": 450, "Zone 2": 250, "Zone 3": 120, "Zone 4": 650, "Zone 5": 300, "Zone 6": 180, "Zone 7": 90 },
    { time: '18:30', "Zone 1": 780, "Zone 2": 480, "Zone 3": 340, "Zone 4": 820, "Zone 5": 540, "Zone 6": 390, "Zone 7": 150 },
    { time: '19:00', "Zone 1": 1200, "Zone 2": 950, "Zone 3": 850, "Zone 4": 1400, "Zone 5": 920, "Zone 6": 780, "Zone 7": 410 },
    { time: '19:30', "Zone 1": 890, "Zone 2": 620, "Zone 3": 550, "Zone 4": 980, "Zone 5": 710, "Zone 6": 600, "Zone 7": 320 },
    { time: '20:00', "Zone 1": 1480, "Zone 2": 1390, "Zone 3": 1100, "Zone 4": 1850, "Zone 5": 1290, "Zone 6": 1150, "Zone 7": 680 }, // Halftime peak
    { time: '20:30', "Zone 1": 950, "Zone 2": 710, "Zone 3": 620, "Zone 4": 1120, "Zone 5": 840, "Zone 6": 700, "Zone 7": 410 },
    { time: '21:00', "Zone 1": 520, "Zone 2": 380, "Zone 3": 290, "Zone 4": 610, "Zone 5": 440, "Zone 6": 350, "Zone 7": 210 }
  ];

  // Simulated vendor stock level data
  const stockData = [
    { name: 'Gate A Snacks', food: 88, water: 95, merch: 40 },
    { name: 'North Stand Concessions', food: 35, water: 42, merch: 78 },
    { name: 'South Concourse E', food: 92, water: 80, merch: 65 },
    { name: 'Zone 4 Beer & Soda', food: 15, water: 22, merch: 12 }, // Low stock hotspot
    { name: 'VIP Lounge Dining', food: 70, water: 85, merch: 90 },
    { name: 'East Plaza Kiosk', food: 50, water: 65, merch: 30 }
  ];

  // Agent action frequency metrics
  const agentActionData = [
    { name: 'B2B Restock Dispatch', value: 42, color: '#10b981' },
    { name: 'Autonomous Campaign / Discount', value: 28, color: '#3b82f6' },
    { name: 'Crowd Bottleneck Warning', value: 18, color: '#f59e0b' },
    { name: 'Security Relocation Alert', value: 12, color: '#ef4444' }
  ];

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">System Analytics</span>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
              Global Analytics
            </h1>
          </div>
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="flex items-center gap-2 bg-black hover:bg-orange-600 text-white font-bold uppercase text-xs tracking-widest px-6 py-3.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </section>

      {/* Control Filters */}
      <section className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-10 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Filter Zone:</span>
          <div className="relative inline-block">
            <select 
              value={selectedZone} 
              onChange={(e) => setSelectedZone(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-black px-4 py-2 pr-8 font-bold text-xs uppercase tracking-wider rounded-lg focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="All">All Stadium Zones</option>
              <option value="Zone 1">Zone 1 (Main Entrance)</option>
              <option value="Zone 2">Zone 2 (North Concourse)</option>
              <option value="Zone 3">Zone 3 (Pedestrian Bridge)</option>
              <option value="Zone 4">Zone 4 (East Concourse)</option>
              <option value="Zone 5">Zone 5 (West Concourse)</option>
              <option value="Zone 6">Zone 6 (Premium Club)</option>
              <option value="Zone 7">Zone 7 (B2B Supply Hub)</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Match Phase:</span>
          <div className="relative inline-block">
            <select 
              value={selectedPhase} 
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-black px-4 py-2 pr-8 font-bold text-xs uppercase tracking-wider rounded-lg focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="Pre-match">Pre-match Gate Surge</option>
              <option value="In-progress">Match In Progress</option>
              <option value="Halftime">Halftime intermission</option>
              <option value="Post-match">Egress Discharge</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Charts Panels */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Crowd Flow Area Chart */}
        <div className="lg:col-span-8 border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col h-[450px]">
          <h3 className="text-lg font-bold uppercase tracking-wide mb-6 text-black flex items-center gap-2 shrink-0">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            Crowd Density Mapping Over Time
          </h3>
          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={densityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                {selectedZone === 'All' ? (
                  <>
                    <Area type="monotone" dataKey="Zone 4" stroke="#ea580c" fillOpacity={1} fill="url(#colorZone)" />
                    <Area type="monotone" dataKey="Zone 1" stroke="#4f46e5" fill="none" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="Zone 2" stroke="#16a34a" fill="none" />
                  </>
                ) : (
                  <Area type="monotone" dataKey={selectedZone as any} stroke="#ea580c" fillOpacity={1} fill="url(#colorZone)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Decisions Pie Chart */}
        <div className="lg:col-span-4 border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col h-[450px]">
          <h3 className="text-lg font-bold uppercase tracking-wide mb-6 text-black flex items-center gap-2 shrink-0">
            <PieIcon className="w-5 h-5 text-indigo-600" />
            Agent Operations Shares
          </h3>
          <div className="flex-grow min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={agentActionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {agentActionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="shrink-0 flex flex-col gap-2 mt-4 text-xs">
            {agentActionData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-bold text-black">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Stock Distribution */}
        <div className="lg:col-span-12 border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm h-[400px] flex flex-col">
          <h3 className="text-lg font-bold uppercase tracking-wide mb-6 text-black flex items-center gap-2 shrink-0">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Concession Vendor In-Stock Percentages
          </h3>
          <div className="flex-grow min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Legend iconType="rect" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="water" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="food" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="merch" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

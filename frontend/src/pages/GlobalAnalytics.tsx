import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, RefreshCw, ChevronDown, Database } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

interface Dataset<T> {
  source: 'esql' | 'mock';
  query: string;
  rows: T[];
}

interface ZoneRow { location: string; avg_density: number; events: number; peak_people: number }
interface OpsRow { agent_name: string; decisions: number }
interface StockRow { vendor_name: string; inventory_water: number; inventory_food: number; inventory_merchandise: number }

interface Summary {
  zone_density: Dataset<ZoneRow>;
  agent_ops: Dataset<OpsRow>;
  vendor_stock: Dataset<StockRow>;
  meta: { live_datasets: number; total_datasets: number };
}

const OPS_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/** "LIVE ES|QL" / "MOCK" badge + collapsible query text — judges see what ran. */
function SourceBadge({ ds }: { ds: Dataset<unknown> }) {
  const live = ds.source === 'esql';
  return (
    <details className="ml-auto text-right">
      <summary
        className={`list-none cursor-pointer inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
          live
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}
        title="Click to see the ES|QL query behind this chart"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        {live ? 'Live ES|QL' : 'Mock data'}
      </summary>
      <code className="block mt-2 max-w-[420px] text-left whitespace-pre-wrap break-words text-[10px] leading-relaxed bg-slate-900 text-emerald-300 rounded-lg p-3 font-mono">
        {ds.query}
      </code>
    </details>
  );
}

export default function GlobalAnalytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/analytics/summary`);
      if (res.ok) setSummary(await res.json());
    } catch (e) {
      console.error('Failed to fetch analytics summary', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const zones = useMemo(
    () => ['All', ...(summary?.zone_density.rows.map((r) => r.location) ?? [])],
    [summary],
  );

  const zoneRows = useMemo(() => {
    const rows = summary?.zone_density.rows ?? [];
    const filtered = selectedZone === 'All' ? rows : rows.filter((r) => r.location === selectedZone);
    return filtered.map((r) => ({
      ...r,
      avg_density: Math.round((r.avg_density ?? 0) * 10) / 10,
    }));
  }, [summary, selectedZone]);

  const opsRows = useMemo(
    () => (summary?.agent_ops.rows ?? []).map((r, i) => ({ ...r, color: OPS_COLORS[i % OPS_COLORS.length] })),
    [summary],
  );

  const opsTotal = useMemo(() => opsRows.reduce((s, r) => s + r.decisions, 0), [opsRows]);

  const stockRows = summary?.vendor_stock.rows ?? [];
  const liveCount = summary?.meta.live_datasets ?? 0;

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      <Nav />

      {/* Hero Header */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">System Analytics</span>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
              Global Analytics
            </h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Database className="w-4 h-4 text-emerald-600" />
              {summary
                ? `${liveCount}/${summary.meta.total_datasets} charts fed by live Elasticsearch ES|QL queries`
                : 'Connecting to Elasticsearch…'}
            </p>
          </div>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="flex items-center gap-2 bg-black hover:bg-orange-600 text-white font-bold uppercase text-xs tracking-widest px-6 py-3.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>
      </section>

      {/* Zone filter */}
      <section className="max-w-7xl mx-auto w-full px-6 md:px-12 pt-10 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Filter Zone:</span>
          <div className="relative inline-block">
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="appearance-none bg-slate-50 border border-slate-200 text-black px-4 py-2 pr-8 font-bold text-xs uppercase tracking-wider rounded-lg focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {zones.map((z) => (
                <option key={z} value={z}>{z === 'All' ? 'All Stadium Zones' : z}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Charts Panels */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-10 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Zone density (live ES|QL aggregation) */}
        <div className="lg:col-span-8 border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col h-[450px]">
          <div className="flex items-start gap-2 mb-6 shrink-0">
            <h3 className="text-lg font-bold uppercase tracking-wide text-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Crowd Density by Zone
            </h3>
            {summary && <SourceBadge ds={summary.zone_density} />}
          </div>
          <div className="flex-1 min-h-0 w-full">
            {zoneRows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                No crowd events indexed yet — trigger a surge from the dashboard.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneRows} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis dataKey="location" stroke="#94a3b8" fontSize={11} />
                  {/* density is 0-10, event counts are unbounded — separate axes */}
                  <YAxis yAxisId="density" stroke="#ea580c" fontSize={11} domain={[0, 10]} />
                  <YAxis yAxisId="events" orientation="right" stroke="#4f46e5" fontSize={11} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="density" dataKey="avg_density" name="Avg density (0-10)" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="events" dataKey="events" name="Events" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Agent decisions pie (live ES|QL aggregation) */}
        <div className="lg:col-span-4 border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col h-[450px]">
          <div className="flex items-start gap-2 mb-6 shrink-0">
            <h3 className="text-lg font-bold uppercase tracking-wide text-black flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              Agent Decisions
            </h3>
            {summary && <SourceBadge ds={summary.agent_ops} />}
          </div>
          <div className="flex-grow min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={opsRows}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="decisions"
                  nameKey="agent_name"
                >
                  {opsRows.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="shrink-0 flex flex-col gap-2 mt-4 text-xs">
            {opsRows.map((item) => (
              <div key={item.agent_name} className="flex justify-between items-center text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.agent_name}</span>
                </div>
                <span className="font-bold text-black">
                  {opsTotal > 0 ? Math.round((item.decisions / opsTotal) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor stock (live ES|QL over the vendors index) */}
        <div className="lg:col-span-12 border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm h-[400px] flex flex-col">
          <div className="flex items-start gap-2 mb-6 shrink-0">
            <h3 className="text-lg font-bold uppercase tracking-wide text-black flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Vendor Inventory Levels
            </h3>
            {summary && <SourceBadge ds={summary.vendor_stock} />}
          </div>
          <div className="flex-grow min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockRows} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                <XAxis dataKey="vendor_name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend iconType="rect" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inventory_water" name="Water" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inventory_food" name="Food" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inventory_merchandise" name="Merch" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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

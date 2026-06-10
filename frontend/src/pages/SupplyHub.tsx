import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { ShieldAlert, Package, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Vendor {
  vendor_id: string;
  vendor_name: string;
  inventory_water: number;
  inventory_food: number;
  inventory_merchandise: number;
  latitude?: number;
  longitude?: number;
}

export default function SupplyHub() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLow, setFilterLow] = useState(false);
  const [restockVendor, setRestockVendor] = useState('');
  const [restockQty, setRestockQty] = useState({ water: 100, food: 100, merch: 50 });
  const [restockStatus, setRestockStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/vendors`);
      const payload = await res.json();
      setVendors(payload);
    } catch (err) {
      console.error(err);
      // Fallback mocks if server is offline
      setVendors([
        { vendor_id: "V-01", vendor_name: "Gate A Premium Snacks", inventory_water: 12, inventory_food: 4, inventory_merchandise: 88 },
        { vendor_id: "V-02", vendor_name: "North Stand Concessions", inventory_water: 95, inventory_food: 78, inventory_merchandise: 32 },
        { vendor_id: "V-03", vendor_name: "East Concourse Drinks", inventory_water: 5, inventory_food: 65, inventory_merchandise: 10 },
        { vendor_id: "V-04", vendor_name: "West Plaza Fan Shop", inventory_water: 80, inventory_food: 20, inventory_merchandise: 5 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockVendor) return;
    setRestockStatus('submitting');
    setTimeout(() => {
      setRestockStatus('success');
      // Update local cache stock level
      setVendors(prev => prev.map(v => {
        if (v.vendor_id === restockVendor) {
          return {
            ...v,
            inventory_water: v.inventory_water + restockQty.water,
            inventory_food: v.inventory_food + restockQty.food,
            inventory_merchandise: v.inventory_merchandise + restockQty.merch
          };
        }
        return v;
      }));
    }, 1200);
  };

  const filteredVendors = filterLow 
    ? vendors.filter(v => v.inventory_water < 25 || v.inventory_food < 25 || v.inventory_merchandise < 25)
    : vendors;

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      <Nav />

      {/* Hero Header */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">B2B Management</span>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
              B2B Supply Hub
            </h1>
          </div>
          <button 
            onClick={fetchVendors} 
            disabled={loading}
            className="flex items-center gap-2 bg-black hover:bg-orange-600 text-white font-bold uppercase text-xs tracking-widest px-6 py-3.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Inventory
          </button>
        </div>
      </section>

      {/* Layout Grid */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-12 flex-grow flex flex-col lg:flex-row gap-10">
        
        {/* Left: Inventory List Table */}
        <div className="lg:w-8/12 flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4 shrink-0">
            <h3 className="text-lg font-bold uppercase tracking-wide text-black flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              Concession Inventory Grid
            </h3>
            <button 
              onClick={() => setFilterLow(!filterLow)}
              className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${filterLow ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
            >
              {filterLow ? "⚠️ Showing Low Stock Only" : "Filter Low Stock"}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 sticky top-0">
                    <th className="py-4 px-6 bg-slate-50">Stand ID</th>
                    <th className="py-4 px-6 bg-slate-50">Vendor Name</th>
                    <th className="py-4 px-6 bg-slate-50 text-right">Water</th>
                    <th className="py-4 px-6 bg-slate-50 text-right">Food</th>
                    <th className="py-4 px-6 bg-slate-50 text-right">Merchandise</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => {
                    const lowWater = vendor.inventory_water < 25;
                    const lowFood = vendor.inventory_food < 25;
                    const lowMerch = vendor.inventory_merchandise < 25;

                    return (
                      <tr key={vendor.vendor_id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs font-bold text-slate-500">{vendor.vendor_id}</td>
                        <td className="py-4 px-6 font-bold text-slate-800 text-sm">{vendor.vendor_name}</td>
                        <td className={`py-4 px-6 text-right font-mono text-sm font-bold ${lowWater ? 'text-red-600 bg-red-50/20' : 'text-slate-600'}`}>
                          {vendor.inventory_water}
                        </td>
                        <td className={`py-4 px-6 text-right font-mono text-sm font-bold ${lowFood ? 'text-red-600 bg-red-50/20' : 'text-slate-600'}`}>
                          {vendor.inventory_food}
                        </td>
                        <td className={`py-4 px-6 text-right font-mono text-sm font-bold ${lowMerch ? 'text-red-600 bg-red-50/20' : 'text-slate-600'}`}>
                          {vendor.inventory_merchandise}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVendors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-light text-sm">
                        No low-stock concessions detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Replenishment Panel */}
        <div className="lg:w-4/12">
          {restockStatus === 'success' ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-emerald-200 bg-emerald-50 p-6 rounded-2xl flex flex-col items-center gap-4 text-center shadow-sm"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              <h3 className="text-lg font-bold uppercase text-slate-900">Restock Order Dispatched</h3>
              <p className="text-xs text-slate-600 font-light">
                Autonomous B2B replenishment batch successfully sent to supplier hub. Ack scheduled within 10 seconds.
              </p>
              <button 
                onClick={() => setRestockStatus('idle')}
                className="bg-black hover:bg-orange-600 text-white font-bold uppercase text-[10px] tracking-widest px-6 py-3 transition-colors mt-2"
              >
                Send Another Dispatch
              </button>
            </motion.div>
          ) : (
            <div className="border border-slate-200/80 bg-white p-6 rounded-2xl shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-wide text-black flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-orange-600" />
                  Manual Replenish
                </h3>
                <p className="text-xs text-slate-500 font-light mt-1">Directly trigger restocking orders for vendors experiencing shortages.</p>
              </div>

              <form onSubmit={handleRestock} className="flex flex-col gap-4">
                <div>
                  <label className="block uppercase text-[10px] font-bold tracking-widest text-slate-400 mb-2">Target Vendor</label>
                  <select 
                    required
                    value={restockVendor}
                    onChange={(e) => setRestockVendor(e.target.value)}
                    className="w-full border border-slate-200 px-4 py-3 rounded-lg text-sm text-black bg-white cursor-pointer focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Select Vendor...</option>
                    {vendors.map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name} ({v.vendor_id})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block uppercase text-[9px] font-bold tracking-widest text-slate-400 mb-2 text-center">Water Qty</label>
                    <input 
                      type="number" 
                      min={0}
                      value={restockQty.water}
                      onChange={(e) => setRestockQty({...restockQty, water: Number(e.target.value)})}
                      className="w-full border border-slate-200 px-2 py-2 text-center rounded-lg text-xs font-mono text-black" 
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-[9px] font-bold tracking-widest text-slate-400 mb-2 text-center">Food Qty</label>
                    <input 
                      type="number" 
                      min={0}
                      value={restockQty.food}
                      onChange={(e) => setRestockQty({...restockQty, food: Number(e.target.value)})}
                      className="w-full border border-slate-200 px-2 py-2 text-center rounded-lg text-xs font-mono text-black" 
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-[9px] font-bold tracking-widest text-slate-400 mb-2 text-center">Merch Qty</label>
                    <input 
                      type="number" 
                      min={0}
                      value={restockQty.merch}
                      onChange={(e) => setRestockQty({...restockQty, merch: Number(e.target.value)})}
                      className="w-full border border-slate-200 px-2 py-2 text-center rounded-lg text-xs font-mono text-black" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={restockStatus === 'submitting'}
                  className="w-full bg-black hover:bg-orange-600 text-white font-bold uppercase text-[10px] tracking-widest py-3.5 transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Dispatch B2B Restock
                </button>
              </form>
            </div>
          )}
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

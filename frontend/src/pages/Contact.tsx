import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Contact() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    org: '',
    capacity: '50000',
    challenge: 'concession'
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setTimeout(() => {
      setStatus('success');
    }, 1500);
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
          <Link to="/contact" className="bs-nav-link text-orange-600 border-orange-600 pl-8" onClick={() => setMenuOpen(false)}>Contact</Link>
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
          <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">Connect</span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none mb-4">
            Contact Sales
          </h1>
          <p className="text-lg text-slate-600 font-light max-w-3xl leading-relaxed">
            Ready to deploy ArenaPulse at your stadium? Fill out the inquiry form below to request a customized technical demonstration.
          </p>
        </div>
      </section>

      {/* Form Area */}
      <main className="max-w-3xl mx-auto w-full px-6 py-16 flex-grow">
        {status === 'success' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-emerald-200 bg-emerald-50 p-8 rounded-2xl text-center flex flex-col items-center gap-4 shadow-sm"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            <h2 className="text-2xl font-black uppercase text-slate-900">Request Dispatched</h2>
            <p className="text-slate-600 font-light max-w-md">
              A virtual ArenaPulse demonstration agent has been initialized and dispatched to <span className="font-bold text-black">{formState.email}</span>. A representative will contact you shortly.
            </p>
            <button 
              onClick={() => setStatus('idle')}
              className="mt-4 bg-black hover:bg-orange-600 text-white font-bold uppercase text-xs tracking-widest px-6 py-3 transition-colors"
            >
              Submit Another Request
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block uppercase text-xs font-bold tracking-widest mb-2 text-slate-400">Full Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                    className="w-full border border-slate-200 px-4 py-3 rounded-lg focus:border-orange-500 focus:outline-none transition-colors text-sm text-black" 
                    placeholder="Anirudh" 
                  />
                </div>
              </div>
              <div>
                <label className="block uppercase text-xs font-bold tracking-widest mb-2 text-slate-400">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    value={formState.email}
                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                    className="w-full border border-slate-200 px-4 py-3 rounded-lg focus:border-orange-500 focus:outline-none transition-colors text-sm text-black" 
                    placeholder="logistics@arenapulse.com" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block uppercase text-xs font-bold tracking-widest mb-2 text-slate-400">Organization / Venue Name</label>
                <input 
                  type="text" 
                  required
                  value={formState.org}
                  onChange={(e) => setFormState({...formState, org: e.target.value})}
                  className="w-full border border-slate-200 px-4 py-3 rounded-lg focus:border-orange-500 focus:outline-none transition-colors text-sm text-black" 
                  placeholder="FIFA 2026 Committee" 
                />
              </div>
              <div>
                <label className="block uppercase text-xs font-bold tracking-widest mb-2 text-slate-400">Average Stadium Capacity</label>
                <select 
                  value={formState.capacity}
                  onChange={(e) => setFormState({...formState, capacity: e.target.value})}
                  className="w-full border border-slate-200 px-4 py-3 rounded-lg focus:border-orange-500 focus:outline-none transition-colors text-sm text-black bg-white cursor-pointer"
                >
                  <option value="20000">Under 25,000 Seats</option>
                  <option value="50000">25,000 - 60,000 Seats</option>
                  <option value="80000">60,000 - 90,000 Seats</option>
                  <option value="100000">90,000+ Seats</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block uppercase text-xs font-bold tracking-widest mb-2 text-slate-400">Primary Logistics Challenge</label>
              <select 
                value={formState.challenge}
                onChange={(e) => setFormState({...formState, challenge: e.target.value})}
                className="w-full border border-slate-200 px-4 py-3 rounded-lg focus:border-orange-500 focus:outline-none transition-colors text-sm text-black bg-white cursor-pointer"
              >
                <option value="concession">Concession Restock Delays & POS Coordination</option>
                <option value="turnstile">Turnstile Gate Bottlenecks & Egress Easing</option>
                <option value="security">Security Patrol Dispatch & Incident Routing</option>
                <option value="other">All / Custom Requirements</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={status === 'sending'}
              className="w-full bg-black hover:bg-orange-600 text-white font-bold uppercase tracking-widest text-xs py-4 transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {status === 'sending' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Dispatching Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Request Technical Demonstration
                </>
              )}
            </button>
          </form>
        )}
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

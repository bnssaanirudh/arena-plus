import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Database, Eye, Terminal } from 'lucide-react';

type StepId = 'ingest' | 'elastic' | 'swarm' | 'action';

export default function Platform() {
  const [activeStep, setActiveStep] = useState<StepId>('ingest');

  const steps = {
    ingest: {
      title: "IoT & Telemetry Ingestion",
      tech: "FastAPI WebSockets + Live Simulator",
      metric: "Sub-15ms Latency",
      desc: "Turnstile entry counters, POS sales, and crowd events are continually pushed via WebSockets into the backend pub-sub channel. Data includes GPS coordinates and zone occupancy rates.",
      code: `{\n  "event_type": "CROWD_BOTTLENECK",\n  "location": "Zone 4",\n  "density_score": 0.88,\n  "predicted_people": 1250\n}`
    },
    elastic: {
      title: "Elasticsearch Indexing & BM25 RAG",
      tech: "Elastic Cloud cluster + BM25 Querying",
      metric: "5 Indices Active",
      desc: "Raw events are indexed into the 'crowd_events' index. Concurrently, the swarm searches the 'supply_constraints' index using BM25 algorithms to fetch rules relevant to the targeted zone and action.",
      code: `GET /supply_constraints/_search\n{\n  "query": {\n    "match": { "zone": "Zone 4" }\n  }\n}`
    },
    swarm: {
      title: "Swarm Orchestrator & Verification",
      tech: "Gemini 2.5 Flash + ADK LlmAgent",
      metric: "100% Verification Rate",
      desc: "The Orchestrator agent evaluates predictions. Before acting, it queries the Swarm Verification agent, which checks retrieves rules from Elasticsearch to ensure safety constraints are respected.",
      code: `{\n  "decision": "DISPATCH_VENDORS",\n  "reasoning": "Halftime bottleneck predicted in Zone 4. Ingested safety rules allow mobile dispatch.",\n  "verified": true\n}`
    },
    action: {
      title: "Autonomous Execution & Tracing",
      tech: "Phoenix OTEL Tracing + B2B Orders",
      metric: "98% Action Efficiency",
      desc: "Valid decisions trigger B2B restocks, flash deals, or security warnings. The entire reasoning path is automatically exported via OpenTelemetry to the Arize Phoenix collector for debugging.",
      code: `{\n  "action": "Restock vendor V-04",\n  "items": { "water": 1500, "food": 500 },\n  "arize_trace_id": "8af87cb9e2a4"\n}`
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      <Nav />

      {/* Hero */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-4 block">Core Engine</span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight mb-6 text-black leading-none">
            The Platform Architecture
          </h1>
          <p className="text-lg md:text-xl text-slate-600 font-light max-w-3xl leading-relaxed">
            ArenaPulse functions as a real-time event brain. Combining sub-second telemetry streams, Elasticsearch storage, multi-agent AI planning, and OpenTelemetry instrumentation into a robust operational platform.
          </p>
        </div>
      </section>

      {/* Interactive Flowchart Section */}
      <section className="py-16 md:py-24 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1">
        <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tight mb-12 border-b border-slate-200 pb-4 flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
          Data Processing Pipeline
        </h2>

        {/* Visual HTML/CSS Diagram */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-16 relative">
          <button 
            onClick={() => setActiveStep('ingest')}
            className={`border p-6 rounded-xl text-left transition-all duration-300 relative overflow-hidden group ${activeStep === 'ingest' ? 'bg-white border-orange-500 shadow-lg scale-[1.02]' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 shadow-sm'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step 01</span>
              <Eye className={`w-5 h-5 ${activeStep === 'ingest' ? 'text-orange-600' : 'text-slate-400'}`} />
            </div>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2 text-black">Telemetry Ingest</h3>
            <p className="text-xs text-slate-500 font-light line-clamp-2">Real-time Turnstile, IoT, and POS inputs streamed via WebSockets.</p>
            {activeStep === 'ingest' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}
          </button>

          <button 
            onClick={() => setActiveStep('elastic')}
            className={`border p-6 rounded-xl text-left transition-all duration-300 relative overflow-hidden group ${activeStep === 'elastic' ? 'bg-white border-orange-500 shadow-lg scale-[1.02]' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 shadow-sm'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step 02</span>
              <Database className={`w-5 h-5 ${activeStep === 'elastic' ? 'text-orange-600' : 'text-slate-400'}`} />
            </div>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2 text-black">Elasticsearch BM25</h3>
            <p className="text-xs text-slate-500 font-light line-clamp-2">Indexing raw histories and querying safety rules on the fly.</p>
            {activeStep === 'elastic' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}
          </button>

          <button 
            onClick={() => setActiveStep('swarm')}
            className={`border p-6 rounded-xl text-left transition-all duration-300 relative overflow-hidden group ${activeStep === 'swarm' ? 'bg-white border-orange-500 shadow-lg scale-[1.02]' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 shadow-sm'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step 03</span>
              <Cpu className={`w-5 h-5 ${activeStep === 'swarm' ? 'text-orange-600' : 'text-slate-400'}`} />
            </div>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2 text-black">Swarm Orchestration</h3>
            <p className="text-xs text-slate-500 font-light line-clamp-2">Gemini planning brain verifying safety logic with RAG rules.</p>
            {activeStep === 'swarm' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}
          </button>

          <button 
            onClick={() => setActiveStep('action')}
            className={`border p-6 rounded-xl text-left transition-all duration-300 relative overflow-hidden group ${activeStep === 'action' ? 'bg-white border-orange-500 shadow-lg scale-[1.02]' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 shadow-sm'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Step 04</span>
              <Terminal className={`w-5 h-5 ${activeStep === 'action' ? 'text-orange-600' : 'text-slate-400'}`} />
            </div>
            <h3 className="font-bold uppercase tracking-wide text-sm mb-2 text-black">Execution & Tracing</h3>
            <p className="text-xs text-slate-500 font-light line-clamp-2">Directing restocks and warnings, tracked via Arize Phoenix traces.</p>
            {activeStep === 'action' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}
          </button>
        </div>

        {/* Selected Step Description Console */}
        <motion.div 
          key={activeStep}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 border border-slate-200 rounded-2xl overflow-hidden shadow-md"
        >
          <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1 text-xs uppercase font-bold tracking-widest rounded-full">{steps[activeStep].metric}</span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{steps[activeStep].tech}</span>
              </div>
              <h3 className="text-3xl font-black uppercase text-black mb-6 leading-tight">{steps[activeStep].title}</h3>
              <p className="text-slate-600 font-light leading-relaxed text-base md:text-lg mb-8">{steps[activeStep].desc}</p>
            </div>
            <div className="flex items-center gap-2 text-orange-600 font-bold uppercase tracking-widest text-xs hover:gap-4 transition-all cursor-pointer" onClick={() => {
              const keys = Object.keys(steps) as StepId[];
              const nextIndex = (keys.indexOf(activeStep) + 1) % keys.length;
              setActiveStep(keys[nextIndex]);
            }}>
              Next Step <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          
          <div className="lg:col-span-5 bg-slate-900 text-slate-300 p-8 flex flex-col font-mono text-xs overflow-x-auto min-h-[300px]">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 shrink-0 text-slate-500 uppercase tracking-widest text-[10px] font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="ml-2">Live Output Stream</span>
            </div>
            <pre className="flex-1 text-emerald-400 select-all leading-normal whitespace-pre-wrap">{steps[activeStep].code}</pre>
          </div>
        </motion.div>
      </section>

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

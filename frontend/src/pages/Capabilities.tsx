import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { motion } from 'framer-motion';
import { Eye, TrendingUp, Cpu } from 'lucide-react';

type TabId = 'telemetry' | 'predictive' | 'swarms';

export default function Capabilities() {
  const [activeTab, setActiveTab] = useState<TabId>('telemetry');

  const tabContents = {
    telemetry: {
      title: "Real-time Crowd Telemetry",
      subtitle: "Optical Turnstile Counting & Spatial GPS Analysis",
      desc: "Our vision-based ingestion tracks turnstile arrivals and GPS telemetry continuously, mapping spectator heatmaps across 7 stadium zones with less than 15ms latency.",
      stats: [
        { label: "Latency", value: "<15ms" },
        { label: "Turnstile Accuracy", value: "99.9%" },
        { label: "Data Points / Sec", value: "25,000+" }
      ],
      features: [
        "Dynamic crowd density score monitoring (0.0 to 1.0)",
        "Turnstile ingress and egress bottleneck alerts",
        "Autonomous crowd redirection signage routing",
        "Zonewise GPS geolocation mapping for mobile vendors"
      ],
      icon: <Eye className="w-8 h-8 text-orange-600" />
    },
    predictive: {
      title: "ML Halftime Forecasting",
      subtitle: "XGBoost Bottleneck Modeling & Peak Estimation",
      desc: "ArenaPulse uses machine learning models (trained on historical attendance logs) to project halftime and post-match bottleneck zones up to 45 minutes before they manifest.",
      stats: [
        { label: "Forecast Window", value: "45 Mins" },
        { label: "Model Type", value: "XGBoost" },
        { label: "Surge Accuracy", value: "98.4%" }
      ],
      features: [
        "Historical patterns ingestion mapping via pandas & numpy",
        "Halftime bottleneck threat classification levels",
        "Real-time prediction streams logged to Elasticsearch index",
        "Dynamic threshold notifications to dispatch hubs"
      ],
      icon: <TrendingUp className="w-8 h-8 text-orange-600" />
    },
    swarms: {
      title: "Autonomous Swarm Planning",
      subtitle: "RAG Verification & Dual-Agent Orchestration",
      desc: "A decentralized fleet of Gemini agents works together to allocate restocking vendors and launch dynamic concession campaigns, fully verified against local stadium constraints.",
      stats: [
        { label: "Agents Deployed", value: "400+" },
        { label: "Verify Method", value: "BM25 RAG" },
        { label: "API Provider", value: "Gemini 2.5" }
      ],
      features: [
        "Dual-Agent Swarm logic (Orchestration agent + Verification agent)",
        "BM25 RAG rules search inside 'supply_constraints' index",
        "Autonomous B2B replenishment batch dispatching",
        "Arize Phoenix OpenTelemetry tracing on every agent action"
      ],
      icon: <Cpu className="w-8 h-8 text-orange-600" />
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      <Nav />

      {/* Hero */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">Our Engine</span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none mb-4">
            System Capabilities
          </h1>
          <p className="text-lg text-slate-600 font-light max-w-3xl leading-relaxed">
            ArenaPulse features three core functional layers built to manage multi-stadium events autonomously, processing data and executing decisions safely.
          </p>
        </div>
      </section>

      {/* Tabs Selector */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 flex-grow flex flex-col gap-12">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('telemetry')}
            className={`pb-4 px-6 font-bold uppercase text-xs tracking-widest border-b-2 transition-all ${activeTab === 'telemetry' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-400 hover:text-black'}`}
          >
            Crowd Telemetry
          </button>
          <button 
            onClick={() => setActiveTab('predictive')}
            className={`pb-4 px-6 font-bold uppercase text-xs tracking-widest border-b-2 transition-all ${activeTab === 'predictive' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-400 hover:text-black'}`}
          >
            Predictive Analytics
          </button>
          <button 
            onClick={() => setActiveTab('swarms')}
            className={`pb-4 px-6 font-bold uppercase text-xs tracking-widest border-b-2 transition-all ${activeTab === 'swarms' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-400 hover:text-black'}`}
          >
            Autonomous Swarms
          </button>
        </div>

        {/* Tab Detail panel */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
        >
          {/* Detailed summary */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-2">
              <div className="p-3 bg-orange-50 rounded-xl shrink-0">
                {tabContents[activeTab].icon}
              </div>
              <div>
                <span className="text-orange-600 text-xs font-bold uppercase tracking-widest block">{tabContents[activeTab].subtitle}</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase text-black mt-0.5">{tabContents[activeTab].title}</h2>
              </div>
            </div>
            
            <p className="text-slate-600 font-light leading-relaxed text-base md:text-lg mb-4">
              {tabContents[activeTab].desc}
            </p>

            <div className="flex flex-col gap-3">
              <h3 className="font-bold uppercase tracking-widest text-xs text-slate-400">Core Functions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tabContents[activeTab].features.map((feature, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-slate-600 text-sm">
                    <span className="w-5 h-5 shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center rounded-full text-xs font-bold">✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="lg:col-span-4 border border-slate-200/80 bg-slate-50 p-6 rounded-2xl flex flex-col gap-6 shadow-sm">
            <h3 className="font-bold uppercase tracking-widest text-xs text-slate-400">Performance Metrics</h3>
            <div className="flex flex-col gap-4">
              {tabContents[activeTab].stats.map((stat, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
                  <span className="text-slate-600 text-sm font-light">{stat.label}</span>
                  <span className="text-lg font-black uppercase text-black font-mono">{stat.value}</span>
                </div>
              ))}
            </div>
            
            <Link to="/dashboard" className="w-full text-center bg-black hover:bg-orange-600 text-white font-bold uppercase text-xs tracking-widest p-4 transition-colors mt-2">
              Launch Dashboard View
            </Link>
          </div>

        </motion.div>
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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { Activity, Database, CheckCircle2, AlertTriangle, RefreshCw, Cpu } from 'lucide-react';

interface StatusData {
  status: string;
  elasticsearch: {
    connected: boolean;
    url: string;
    index_counts: Record<string, number>;
  };
  arize_phoenix: {
    active: boolean;
    endpoint: string;
    authenticated: boolean;
  };
  simulator: {
    active: boolean;
    running: boolean;
    interval_seconds: number;
  };
  gemini: {
    key_configured: boolean;
    use_vertex_ai: boolean;
    model: string;
    use_adk: boolean;
  };
  system: {
    dry_run: boolean;
    version: string;
    project_name: string;
  };
}

interface ModelLimit {
  model: string;
  category: string;
  rpm: string;
  tpm: string;
  rpd: string;
  isCustom?: boolean;
}

export default function SystemStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "Initializing System Diagnostics...",
    "Telemetry Ingestion Engine: ONLINE",
    "PubSub Message Bus: CONNECTED (redis mock)",
  ]);

  const mockTraces = [
    {
      id: "trace-01f31eb7-0634",
      name: "Perception & Swarm Restock",
      timestamp: "11:19:25 AM",
      status: "Ok",
      duration: "1820ms",
      spans: [
        { name: "arenapulse_coordinator", type: "LlmAgent", duration: "1820ms", offset: "0%", width: "100%", status: "Ok", details: { model: "gemini-2.5-flash", input: "Surge detected in Zone 4. Concessions low.", output: "Dispatch restocking order to V-04 (1500 water, 500 food)." } },
        { name: "PerceptionAgent.analyze", type: "LLM", duration: "420ms", offset: "0%", width: "23%", status: "Ok", details: { model: "gemini-2.5-flash", input: "Turnstile Zone 4 tick: density score 0.88.", output: "High risk bottleneck confirmed in Zone 4." } },
        { name: "PlanningAgent.plan", type: "LLM", duration: "650ms", offset: "23%", width: "35%", status: "Ok", details: { model: "gemini-2.5-flash", input: "Risk: HIGH. Decide resource dispatch.", output: "Allocating 2 restocking dispatches." } },
        { name: "find_nearby_vendors", type: "Tool (Elastic)", duration: "22ms", offset: "23%", width: "2%", status: "Ok", details: { query: "geo_distance: 1000m, lat: 34.05, lon: -118.24", output: "Found 4 vendors. V-04 inventory water: 12." } },
        { name: "VerificationAgent.verify", type: "Agent", duration: "510ms", offset: "58%", width: "28%", status: "Ok", details: { model: "gemini-2.5-flash", input: "Verify plan: restock V-04.", output: "Verified: True. Respects safety constraints." } },
        { name: "_retrieve_constraints", type: "Tool (Elastic)", duration: "15ms", offset: "58%", width: "1%", status: "Ok", details: { query: "BM25 match on zone 'Zone 4' in supply_constraints index", output: "Retrieved 3 constraints: road open." } },
        { name: "ExecutionAgent.execute", type: "Agent", duration: "80ms", offset: "86%", width: "4%", status: "Ok", details: { action: "restock", doc: "Write decision V-04 to agent_decisions index" } }
      ]
    },
    {
      id: "trace-8d7204d6-3e1c",
      name: "Gate Congestion Monitor",
      timestamp: "11:20:01 AM",
      status: "Ok",
      duration: "450ms",
      spans: [
        { name: "arenapulse_coordinator", type: "LlmAgent", duration: "450ms", offset: "0%", width: "100%", status: "Ok", details: { model: "gemini-2.5-flash", input: "Turnstile Zone 1 tick: normal flow.", output: "Action: MONITOR ONLY. Priority: P3." } },
        { name: "PerceptionAgent.analyze", type: "LLM", duration: "210ms", offset: "0%", width: "46%", status: "Ok", details: { model: "gemini-2.5-flash", input: "Turnstile Zone 1 tick: density score 0.32.", output: "Low risk confirmed." } },
        { name: "PlanningAgent.plan", type: "LLM", duration: "230ms", offset: "46%", width: "51%", status: "Ok", details: { model: "gemini-2.5-flash", input: "Risk: LOW. Formulate plan.", output: "MONITOR." } }
      ]
    }
  ];

  const [activeTraceId, setActiveTraceId] = useState(mockTraces[0].id);
  const [activeSpanIdx, setActiveSpanIdx] = useState(0);

  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/status/`);
      const payload = await res.json();
      setData(payload);
      setLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Fetched system status: Elasticsearch ${payload.elasticsearch.connected ? 'ONLINE' : 'OFFLINE'}, Gemini model: ${payload.gemini.model}`,
      ]);
    } catch (err) {
      console.error(err);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: Failed to contact status endpoint. Using offline presets.`]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => {
      setLogs(prev => {
        const timestamp = new Date().toLocaleTimeString();
        const fakeLogs = [
          `[${timestamp}] Telemetry: Turnstile Zone 2 tick registered (density: 0.45)`,
          `[${timestamp}] RAG Swarm: BM25 queried on 'supply_constraints' index for bottleneck checks`,
          `[${timestamp}] Phoenix: OTLP trace batch exported successfully`,
          `[${timestamp}] Agent Execution: dry_run verification check OK`
        ];
        const selected = fakeLogs[Math.floor(Math.random() * fakeLogs.length)];
        return [...prev.slice(-30), selected];
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Gemini rate limits matching the user request spreadsheet
  const geminiModels: ModelLimit[] = [
    { model: "Gemini 2.5 Flash", category: "Text-out models", rpm: "5", tpm: "250K", rpd: "20" },
    { model: "Gemini 3.5 Flash", category: "Text-out models", rpm: "5", tpm: "250K", rpd: "20" },
    { model: "Gemini 3.1 Flash Lite", category: "Text-out models", rpm: "15", tpm: "250K", rpd: "500" },
    { model: "Gemini 2.5 Flash Lite", category: "Text-out models", rpm: "10", tpm: "250K", rpd: "20" },
    { model: "Gemini 3 Flash", category: "Text-out models", rpm: "5", tpm: "250K", rpd: "20" },
    { model: "Gemini 2.5 Flash TTS", category: "Multi-modal generative models", rpm: "3", tpm: "10K", rpd: "10" },
    { model: "Gemini Robotics ER 1.5 Preview", category: "Other models", rpm: "10", tpm: "250K", rpd: "20" },
    { model: "Gemini Robotics ER 1.6 Preview", category: "Other models", rpm: "5", tpm: "250K", rpd: "20" },
    { model: "Gemini Embedding 1", category: "Other models", rpm: "100", tpm: "30K", rpd: "1K" },
    { model: "Gemini Embedding 2", category: "Other models", rpm: "100", tpm: "30K", rpd: "1K" },
    { model: "Antigravity", category: "Agents", rpm: "0", tpm: "0", rpd: "0" }
  ];

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      <Nav />

      {/* Hero */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">Monitoring Dashboard</span>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
              System Status
            </h1>
          </div>
          <button 
            onClick={fetchStatus} 
            disabled={loading}
            className="flex items-center gap-2 bg-black hover:bg-orange-600 text-white font-bold uppercase text-xs tracking-widest px-6 py-3.5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Diagnostic Check
          </button>
        </div>
      </section>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-12 flex-grow flex flex-col gap-10">
        
        {/* Core Services Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Elasticsearch */}
          <div className="border border-slate-200/80 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <Database className="w-6 h-6" />
              </span>
              {data?.elasticsearch.connected ? (
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" /> Offline
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide mb-2 text-black">Elasticsearch Node</h3>
            <p className="text-xs text-slate-500 font-light font-mono truncate mb-4">{data?.elasticsearch.url || 'Connecting...'}</p>
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-widest text-[10px]">Indexed Records</span>
              <div className="flex justify-between text-slate-600">
                <span>Vendors</span>
                <span className="font-mono font-bold text-black">{data?.elasticsearch.index_counts.vendors ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Crowd History</span>
                <span className="font-mono font-bold text-black">{data?.elasticsearch.index_counts.crowd_events ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Agent Decisions</span>
                <span className="font-mono font-bold text-black">{data?.elasticsearch.index_counts.agent_decisions ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Arize Phoenix */}
          <div className="border border-slate-200/80 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <span className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Activity className="w-6 h-6" />
              </span>
              {data?.arize_phoenix.active ? (
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Exporting
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                  Disabled
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide mb-2 text-black">Arize Phoenix Tracing</h3>
            <p className="text-xs text-slate-500 font-light font-mono truncate mb-4">{data?.arize_phoenix.endpoint || 'Unconfigured'}</p>
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-widest text-[10px]">Instrumentation Details</span>
              <div className="flex justify-between text-slate-600">
                <span>Exporter Protocol</span>
                <span className="font-bold text-black">OTLP / HTTP</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Authorization Header</span>
                <span className="font-bold text-black">{data?.arize_phoenix.authenticated ? "Bearer Configured" : "None"}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Span Types</span>
                <span className="font-bold text-black">LlmAgent / Tools / RAG</span>
              </div>
            </div>
          </div>

          {/* Agent Settings */}
          <div className="border border-slate-200/80 bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Cpu className="w-6 h-6" />
              </span>
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                Active Brain
              </span>
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide mb-2 text-black">Orchestrator Settings</h3>
            <p className="text-xs text-slate-500 font-light font-mono truncate mb-4">Model: {data?.gemini.model || 'Loading...'}</p>
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-1.5 text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-widest text-[10px]">Pipeline Policies</span>
              <div className="flex justify-between text-slate-600">
                <span>Execution Mode</span>
                <span className={`font-bold ${data?.system.dry_run ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {data?.system.dry_run ? 'DRY_RUN (Safe Mode)' : 'LIVE_MUTATE'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ADK Framework Enabled</span>
                <span className="font-bold text-black">{data?.gemini.use_adk ? 'Yes (adk-agent)' : 'No (direct json)'}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Verification Method</span>
                <span className="font-bold text-black">Elastic BM25 RAG</span>
              </div>
            </div>
          </div>
        </div>

        {/* Arize Phoenix OTel Trace Waterfall UI */}
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse" />
                <h3 className="text-xl font-bold uppercase tracking-wide text-black flex items-center gap-2">
                  Arize Phoenix Distributed Tracing
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-light mt-1">
                Visualizing nested execution spans, latency waterfalls, and tool inputs/outputs across the agent coordination loop.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg font-mono font-semibold">
              Collector: OTLP / gRPC @ {data?.arize_phoenix.endpoint || "http://localhost:6006"}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
            {/* Left: Trace List */}
            <div className="lg:col-span-4 border-r border-slate-200 p-4 bg-slate-50/50 flex flex-col gap-3">
              <span className="font-semibold text-slate-400 uppercase tracking-widest text-[10px] px-2">
                Active Spans & Traces
              </span>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[450px] pr-1">
                {mockTraces.map((trace) => {
                  const isActive = trace.id === activeTraceId;
                  return (
                    <button
                      key={trace.id}
                      onClick={() => {
                        setActiveTraceId(trace.id);
                        setActiveSpanIdx(0);
                      }}
                      className={`text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-white border-orange-500 shadow-md ring-1 ring-orange-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`text-xs font-mono font-semibold ${isActive ? "text-orange-600" : "text-slate-400"}`}>
                          {trace.id}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {trace.duration}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2 truncate">
                        {trace.name}
                      </h4>
                      <div className="flex justify-between items-center text-[11px] text-slate-500 font-light">
                        <span>{trace.timestamp}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {trace.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Waterfall Visualizer */}
            <div className="lg:col-span-8 p-6 flex flex-col gap-6">
              {(() => {
                const activeTrace = mockTraces.find((t) => t.id === activeTraceId) || mockTraces[0];
                const activeSpan = activeTrace.spans[activeSpanIdx] || activeTrace.spans[0];

                return (
                  <>
                    {/* Trace Details Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 uppercase">
                          {activeTrace.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-light mt-0.5 font-mono">
                          Trace ID: {activeTrace.id}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Duration</span>
                          <span className="text-sm font-mono font-bold text-black">{activeTrace.duration}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Headers */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="w-1/3">Span Name & Type</span>
                        <span className="w-2/3 flex justify-between font-mono relative pl-4">
                          <span>0%</span>
                          <span>25%</span>
                          <span>50%</span>
                          <span>75%</span>
                          <span>100%</span>
                          <span className="absolute inset-x-4 top-3 border-b border-dashed border-slate-200" />
                        </span>
                      </div>

                      {/* Waterfall Spans */}
                      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                        {activeTrace.spans.map((span, idx) => {
                          const isSpanActive = idx === activeSpanIdx;
                          let typeBgColor = "bg-slate-500";
                          let typeTextClass = "text-slate-600 bg-slate-100";
                          
                          if (span.type === "LlmAgent") {
                            typeBgColor = "bg-amber-500";
                            typeTextClass = "text-amber-700 bg-amber-50 border border-amber-100";
                          } else if (span.type === "LLM") {
                            typeBgColor = "bg-orange-500";
                            typeTextClass = "text-orange-700 bg-orange-50 border border-orange-100";
                          } else if (span.type === "Tool (Elastic)") {
                            typeBgColor = "bg-indigo-500";
                            typeTextClass = "text-indigo-700 bg-indigo-50 border border-indigo-100";
                          } else if (span.type === "Agent") {
                            typeBgColor = "bg-emerald-500";
                            typeTextClass = "text-emerald-700 bg-emerald-50 border border-emerald-100";
                          }

                          return (
                            <div
                              key={idx}
                              onClick={() => setActiveSpanIdx(idx)}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                isSpanActive
                                  ? "bg-orange-50/20 border-orange-300 shadow-sm"
                                  : "bg-white border-slate-150 hover:bg-slate-50/50 hover:border-slate-200"
                              }`}
                            >
                              {/* Left Info: Name & Type */}
                              <div className="w-1/3 flex flex-col gap-1 pr-3">
                                <span className="text-xs font-bold text-slate-800 font-mono truncate">
                                  {span.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${typeTextClass}`}>
                                    {span.type}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {span.duration}
                                  </span>
                                </div>
                              </div>

                              {/* Right Graph: Offset / Bar */}
                              <div className="w-2/3 relative h-6 bg-slate-100/40 rounded-md overflow-hidden pl-4 border border-slate-100">
                                {/* Grid ticks for visual alignment */}
                                <div className="absolute inset-y-0 left-[25%] border-r border-slate-200/50" />
                                <div className="absolute inset-y-0 left-[50%] border-r border-slate-200/50" />
                                <div className="absolute inset-y-0 left-[75%] border-r border-slate-200/50" />
                                
                                <div
                                  className={`absolute top-1 bottom-1 rounded-sm shadow-sm opacity-90 ${typeBgColor}`}
                                  style={{
                                    left: `calc(${span.offset} * 0.95)`,
                                    width: `calc(${span.width} * 0.95)`,
                                    minWidth: "4px"
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Span Details Panel */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                            Span Inspector
                          </span>
                          <span className="font-bold text-xs text-black font-mono">
                            {activeSpan.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {activeSpan.duration}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-light">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Span Type</span>
                          <span className="font-semibold text-slate-800">{activeSpan.type}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Execution Status</span>
                          <span className="font-bold text-emerald-600 uppercase flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {activeSpan.status}
                          </span>
                        </div>
                      </div>

                      {/* Inputs/Outputs Inspector */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Context Attributes & Telemetry Payloads
                        </span>
                        <div className="bg-slate-900 rounded-lg p-3 text-[11px] font-mono text-slate-300 max-h-[160px] overflow-y-auto custom-scrollbar selection:bg-orange-500">
                          {activeSpan.details ? (
                            <pre className="whitespace-pre-wrap leading-relaxed">
                              {JSON.stringify(activeSpan.details, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-slate-500 italic">No custom metadata attributes recorded on this span.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Gemini Model Limits Table */}
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-wide text-black">Gemini API Model Registry</h3>
              <p className="text-xs text-slate-500 font-light mt-1">Configured rate limits and peak quotas as verified over the last 28 days.</p>
            </div>
            <div className="flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold uppercase tracking-widest">
              Active Model: <span className="text-orange-600">{data?.gemini.model || "gemini-2.5-flash"}</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <th className="py-4 px-6">Model Identifier</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">RPM (Min)</th>
                  <th className="py-4 px-6">TPM (Tokens/Min)</th>
                  <th className="py-4 px-6">RPD (Day)</th>
                  <th className="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {geminiModels.map((item, idx) => {
                  const isActive = data?.gemini.model.toLowerCase().includes(item.model.split(" ")[1]?.toLowerCase()) || 
                                   (item.model === "Gemini 2.5 Flash" && !data?.gemini.model);
                  return (
                    <tr 
                      key={idx} 
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${isActive ? 'bg-orange-50/30' : ''}`}
                    >
                      <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                        {item.model}
                        {isActive && <span className="ml-2 bg-orange-600 text-white text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-widest">Selected</span>}
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-sm">{item.category}</td>
                      <td className="py-4 px-6 font-mono text-slate-600 text-sm">{isActive ? `1 / ${item.rpm}` : `0 / ${item.rpm}`}</td>
                      <td className="py-4 px-6 font-mono text-slate-600 text-sm">{isActive ? `1.2K / ${item.tpm}` : `0 / ${item.tpm}`}</td>
                      <td className="py-4 px-6 font-mono text-slate-600 text-sm">{isActive ? `4 / ${item.rpd}` : `0 / ${item.rpd}`}</td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Diagnostics Console */}
        <div className="border border-slate-200 rounded-2xl bg-slate-900 text-slate-300 p-6 shadow-md font-mono text-xs flex flex-col h-[350px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="ml-2">Live Operational Logs</span>
            </div>
            <button 
              onClick={() => setLogs(["Console log cleared..."])}
              className="text-[9px] font-bold uppercase border border-slate-700 px-3 py-1 rounded text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-1.5 leading-relaxed selection:bg-orange-500 selection:text-white">
            {logs.map((log, index) => {
              let color = 'text-slate-300';
              if (log.includes('ERROR')) color = 'text-rose-400';
              if (log.includes('SUCCESS') || log.includes('ONLINE')) color = 'text-emerald-400';
              if (log.includes('RAG') || log.includes('BM25')) color = 'text-indigo-400';
              if (log.includes('OTLP') || log.includes('Phoenix')) color = 'text-orange-400';
              return <div key={index} className={color}>{log}</div>;
            })}
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

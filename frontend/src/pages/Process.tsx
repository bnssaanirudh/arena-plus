import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { CheckCircle, ShieldCheck, Zap, Activity, Info } from 'lucide-react';
import { motion } from 'framer-motion';

type StepNum = 1 | 2 | 3 | 4;

export default function Process() {
  const [activeStep, setActiveStep] = useState<StepNum>(1);

  const stepsDetails = {
    1: {
      num: "01",
      tag: "Data Collection",
      title: "Real-time Telemetry Ingestion",
      summary: "ArenaPulse taps directly into existing stadium hardware APIs and sensors, processing turnstile ticks, food stand sales, and crowd GPS data in real time.",
      checkpoints: [
        "WebSocket server ingesting Turnstile counter streams.",
        "POS API syncing concession inventory balances.",
        "Anonymized location coordinates grouped into 7 main stadium zones.",
        "Incoming raw JSON packages pushed to local pub-sub channels."
      ],
      icon: <Activity className="w-8 h-8 text-orange-600" />
    },
    2: {
      num: "02",
      tag: "Model Forecasting",
      title: "Predictive Analytics & ML",
      summary: "Once streamed, the raw events are processed by predictive models loaded from 'surge_predictor.joblib' (XGBoost Classifier) to anticipate crowd surges.",
      checkpoints: [
        "Ingests historical crowd data to detect Halftime bottleneck anomalies.",
        "Generates density forecast ratings (0.0 to 1.0) 45 minutes in advance.",
        "Categorizes surge threat levels from NORMAL to CRITICAL.",
        "Automatically writes predicted surges to Elasticsearch 'crowd_events' index."
      ],
      icon: <Zap className="w-8 h-8 text-orange-600" />
    },
    3: {
      num: "03",
      tag: "Compliance & Safety",
      title: "Swarm Constraint Verification",
      summary: "The Orchestrator agent evaluates predicted surges. Before issuing orders, it queries the Swarm Verification agent to cross-check actions against local safety rules.",
      checkpoints: [
        "Runs BM25 query on Elasticsearch 'supply_constraints' index.",
        "Retrieves strict rules matching target zones and proposed dispatch items.",
        "Cross-checks rule thresholds (e.g. max dispatches, zone capacities).",
        "Confirms action validity and marks verified flag to 'true' or 'false'."
      ],
      icon: <ShieldCheck className="w-8 h-8 text-orange-600" />
    },
    4: {
      num: "04",
      tag: "Execution & Oversight",
      title: "Autonomous Action & Telemetry",
      summary: "If verified, the decision is dispatched. Action outputs are sent to concession screens, turnstile controllers, and logged directly to Arize Phoenix.",
      checkpoints: [
        "Generates B2B restocking order batches for vendors in shortage.",
        "Launches autonomous discount campaigns to redirect spectators to cold zones.",
        "Logs dry-run results or writes active modifications to local database.",
        "Transmits OpenTelemetry trace logs containing complete reasoning paths to Phoenix."
      ],
      icon: <CheckCircle className="w-8 h-8 text-orange-600" />
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white text-black selection:bg-orange-500 selection:text-white">
      <Nav />

      {/* Hero */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-sm mb-2 block">Our Workflow</span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-black leading-none mb-4">
            Our Operational Process
          </h1>
          <p className="text-lg text-slate-600 font-light max-w-3xl leading-relaxed">
            From sensor signals to machine learning forecasts, safe swarm planning, and real-time tracing — this is how ArenaPulse transforms stadium chaos into structured logistics.
          </p>
        </div>
      </section>

      {/* Steps Selector and Details Grid */}
      <main className="max-w-7xl mx-auto w-full px-6 md:px-12 py-16 flex-grow flex flex-col lg:flex-row gap-12">
        {/* Left Side: Step List */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          {(Object.keys(stepsDetails) as unknown as StepNum[]).map((stepNum) => (
            <button
              key={stepNum}
              onClick={() => setActiveStep(stepNum)}
              className={`p-6 rounded-xl border text-left transition-all duration-300 flex items-center justify-between ${activeStep === stepNum ? 'bg-white border-orange-500 shadow-md scale-[1.02]' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/60'}`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-black ${activeStep === stepNum ? 'text-orange-600' : 'text-slate-400'}`}>
                  0{stepNum}.
                </span>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Phase 0{stepNum}</span>
                  <h3 className="font-bold uppercase tracking-wide text-xs text-black">{stepsDetails[stepNum].tag}</h3>
                </div>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${activeStep === stepNum ? 'bg-orange-500 animate-ping' : 'bg-slate-300'}`} />
            </button>
          ))}
        </div>

        {/* Right Side: Step Detailed Console */}
        <div className="lg:w-2/3">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="border border-slate-200/80 bg-white p-8 md:p-12 rounded-2xl shadow-sm h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-orange-600 text-xs font-bold uppercase tracking-widest block mb-1">
                    Step {stepsDetails[activeStep].num}
                  </span>
                  <h2 className="text-3xl font-black uppercase text-black leading-tight">
                    {stepsDetails[activeStep].title}
                  </h2>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl shrink-0">
                  {stepsDetails[activeStep].icon}
                </div>
              </div>

              <p className="text-slate-600 font-light leading-relaxed text-base md:text-lg mb-8">
                {stepsDetails[activeStep].summary}
              </p>

              <h3 className="font-bold uppercase tracking-widest text-xs text-slate-400 mb-4">Pipeline Operations Checklist</h3>
              <ul className="flex flex-col gap-3 mb-8">
                {stepsDetails[activeStep].checkpoints.map((checkpoint, idx) => (
                  <li key={idx} className="flex gap-3 text-slate-600 text-sm font-light">
                    <span className="w-5 h-5 shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center rounded-full text-xs font-bold">✓</span>
                    <span>{checkpoint}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-xs text-slate-500">
              <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <p>This process has been fully tested and validated. System operators can monitor live logs and metrics by visiting the <Link to="/system-status" className="font-bold text-orange-600 hover:underline">System Status</Link> dashboard console.</p>
            </div>

          </motion.div>
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

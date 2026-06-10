import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Nav } from '../components/Nav';

const FadeInUp = ({ children, delay = 0, className = "" }: { children: ReactNode, delay?: number, className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Landing() {
  const tickerText = "AUTONOMOUS LOGISTICS ✦ MULTI-AGENT INTELLIGENCE ✦ CROWD TELEMETRY ✦ EVENT PREDICTION ✦ AUTONOMOUS LOGISTICS ✦ MULTI-AGENT INTELLIGENCE ✦ ";

  return (
    <div className="w-full min-h-screen flex flex-col relative bg-white text-black selection:bg-orange-500 selection:text-white">
      <Nav variant="landing" />

      {/* Full Bleed Hero */}
      <section className="relative w-full h-screen overflow-hidden bg-black">
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <img 
            src="/images/585758-american-anticipation.jpg" 
            alt="ArenaPulse Hero" 
            className="w-full h-full object-cover opacity-75 object-center"
          />
        </motion.div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10 pointer-events-none"></div>
        
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-16 pb-24 md:pb-32">
          <motion.h1 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white uppercase tracking-tight max-w-4xl mb-4 leading-[1.1]"
          >
            Extraordinary<br/>
            <span className="bs-outline-text text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.8)' }}>Intelligence</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-white/80 text-lg md:text-xl max-w-2xl mb-10 font-light"
          >
            Empowering global events with multi-agent orchestration, real-time crowd telemetry, and predictive resource allocation.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-4 flex gap-4"
          >
            <Link to="/dashboard" className="inline-block bg-white text-black px-8 py-4 uppercase font-bold tracking-widest text-xs md:text-sm hover:bg-orange-500 hover:text-white transition-colors duration-300">
              Launch Dashboard
            </Link>
            <a href="#intro" className="hidden md:inline-block border border-white/30 text-white px-8 py-4 uppercase font-bold tracking-widest text-sm hover:bg-white/10 transition-colors duration-300">
              Discover Platform
            </a>
          </motion.div>
        </div>
      </section>

      {/* Scrolling Ticker */}
      <div className="bs-ticker-container border-y border-white/10">
        <div className="bs-ticker">{tickerText}</div>
        <div className="bs-ticker" aria-hidden="true">{tickerText}</div>
      </div>

      {/* Introduction / Manifesto Section */}
      <section id="intro" className="px-6 py-24 md:px-16 md:py-32 max-w-[1600px] mx-auto flex flex-col md:flex-row gap-12 items-start">
        <div className="md:w-1/3">
          <FadeInUp>
            <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-orange-600 mb-4 border-b-2 border-black/10 pb-4">The Platform</h2>
          </FadeInUp>
        </div>
        <div className="md:w-2/3">
          <FadeInUp delay={0.1}>
            <h3 className="text-2xl md:text-5xl font-semibold leading-snug tracking-tight text-[#111] mb-8">
              We engineer autonomous ecosystems for global events.
              Transforming reactive stadium management into predictive logistics.
            </h3>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <p className="text-lg md:text-xl text-gray-600 font-light leading-relaxed mb-6 max-w-3xl">
              ArenaPulse utilizes a fleet of decentralized AI agents to monitor, analyze, and predict crowd movements and vendor demands before they happen. By integrating directly with venue telemetry, our platform automatically routes security, directs concessions, and mitigates bottlenecks without human intervention.
            </p>
            <a href="#sectors" className="inline-block uppercase font-bold text-sm tracking-widest border-b-2 border-black pb-1 mt-4 hover:text-orange-600 hover:border-orange-600 transition-colors">
              Explore Capabilities
            </a>
          </FadeInUp>
        </div>
      </section>

      {/* [NEW] Global Scale Statistics */}
      <section className="w-full bg-black text-white px-6 py-24 md:px-16 md:py-32">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          <FadeInUp delay={0.1} className="flex flex-col border-l border-white/20 pl-6">
            <span className="text-5xl md:text-7xl font-black mb-4">1.2M+</span>
            <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">Fans Monitored Active</p>
          </FadeInUp>
          <FadeInUp delay={0.2} className="flex flex-col border-l border-white/20 pl-6">
            <span className="text-5xl md:text-7xl font-black mb-4">400+</span>
            <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">Autonomous Agents Deployed</p>
          </FadeInUp>
          <FadeInUp delay={0.3} className="flex flex-col border-l border-white/20 pl-6">
            <span className="text-5xl md:text-7xl font-black mb-4">15ms</span>
            <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">System Latency</p>
          </FadeInUp>
          <FadeInUp delay={0.4} className="flex flex-col border-l border-white/20 pl-6">
            <span className="text-5xl md:text-7xl font-black mb-4">98%</span>
            <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">Prediction Accuracy</p>
          </FadeInUp>
        </div>
      </section>

      {/* Capabilities / Sectors Grid */}
      <section id="sectors" className="w-full px-6 md:px-16 py-24 md:py-32 max-w-[1600px] mx-auto">
        <FadeInUp>
          <div className="flex justify-between items-end mb-16 border-b border-black/20 pb-6">
            <h2 className="text-xl md:text-3xl font-bold uppercase tracking-widest">Capabilities</h2>
            <span className="font-bold text-gray-400">03</span>
          </div>
        </FadeInUp>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <FadeInUp delay={0.1}>
            <Link to="/capabilities" className="bs-card group aspect-square md:aspect-[4/3] block">
              <img src="/images/1075025.jpg" alt="Crowd Telemetry" className="object-cover w-full h-full" />
              <div className="bs-card-overlay bg-gradient-to-t from-black/80 to-transparent p-8 md:p-12">
                  <h3 className="text-2xl md:text-4xl font-bold text-white uppercase tracking-wide mb-2">Crowd<br/>Telemetry</h3>
                  <p className="text-white/80 font-light text-sm md:text-base opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">Real-time heatmaps and density tracking across all stadium zones.</p>
              </div>
            </Link>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <Link to="/capabilities" className="bs-card group aspect-square md:aspect-[4/3] block">
              <img src="/images/1663680175_1u1a3799.jpg" alt="Predictive Analytics" className="object-cover w-full h-full" />
              <div className="bs-card-overlay bg-gradient-to-t from-black/80 to-transparent p-8 md:p-12">
                  <h3 className="text-2xl md:text-4xl font-bold text-white uppercase tracking-wide mb-2">Predictive<br/>Analytics</h3>
                  <p className="text-white/80 font-light text-sm md:text-base opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">Forecasting surges and anomalies 45 minutes ahead of time.</p>
              </div>
            </Link>
          </FadeInUp>
          <FadeInUp delay={0.3} className="md:col-span-2">
            <Link to="/capabilities" className="bs-card group aspect-[16/9] md:aspect-[21/9] block">
              <img src="/images/wp2981717.jpg" alt="Autonomous Agents" className="object-cover w-full h-full object-top" />
              <div className="bs-card-overlay bg-gradient-to-t from-black/80 to-transparent p-8 md:p-16">
                  <h3 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-wide mb-4">Autonomous<br/>Agents</h3>
                  <p className="text-white/90 font-light max-w-xl text-base md:text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">Intelligent micro-services that dynamically reallocate resources, dispatch security, and manage inventory seamlessly.</p>
              </div>
            </Link>
          </FadeInUp>
        </div>
      </section>

      {/* [NEW] Platform Modules Layer */}
      <section className="w-full bg-[#f8f8f8] px-6 py-24 md:px-16 md:py-32">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24">
          <div className="lg:w-1/3">
            <FadeInUp>
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-6">Technical<br/>Modules</h2>
              <p className="text-gray-600 font-light text-lg mb-8">
                The Core Engine consists of three decentralized networks working in unison to process venue operations at scale.
              </p>
              <Link to="/capabilities" className="inline-block bg-black text-white px-8 py-4 uppercase font-bold tracking-widest text-xs hover:bg-orange-600 transition-colors">
                View Architecture
              </Link>
            </FadeInUp>
          </div>
          <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            <FadeInUp delay={0.1}>
              <h3 className="text-xl font-bold uppercase tracking-widest border-b border-black/10 pb-4 mb-4 text-orange-600">VisionEngine</h3>
              <p className="text-gray-600 font-light leading-relaxed">Continuous ingestion from stadium optical sensors to map multi-directional crowd flow and density anomalies.</p>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <h3 className="text-xl font-bold uppercase tracking-widest border-b border-black/10 pb-4 mb-4 text-orange-600">Predictive Core</h3>
              <p className="text-gray-600 font-light leading-relaxed">XGBoost and Random Forest architectures modeling anticipated halftime surges to preemptively route attendees.</p>
            </FadeInUp>
            <FadeInUp delay={0.3}>
              <h3 className="text-xl font-bold uppercase tracking-widest border-b border-black/10 pb-4 mb-4 text-orange-600">Swarm Dispatch</h3>
              <p className="text-gray-600 font-light leading-relaxed">LLM-driven agent network instructing human vendors, assigning restock priorities, and broadcasting logistics automatically.</p>
            </FadeInUp>
            <FadeInUp delay={0.4}>
              <h3 className="text-xl font-bold uppercase tracking-widest border-b border-black/10 pb-4 mb-4 text-orange-600">Command Sync</h3>
              <p className="text-gray-600 font-light leading-relaxed">A central dashboard for operators to oversee AI decision-making, offering an override kill-switch for ultimate control.</p>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Our Process Section */}
      <section id="process" className="w-full bg-white px-6 py-24 md:px-16 md:py-32">
        <div className="max-w-[1600px] mx-auto">
          <FadeInUp>
            <div className="flex justify-between items-end mb-16 border-b border-black/20 pb-6">
              <h2 className="text-xl md:text-3xl font-bold uppercase tracking-widest">Our Process</h2>
              <span className="font-bold text-gray-400">03</span>
            </div>
          </FadeInUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            <FadeInUp delay={0.1} className="flex flex-col border-t-2 border-black pt-6">
              <span className="text-5xl font-black text-black/10 mb-6">01.</span>
              <h3 className="text-xl font-bold uppercase tracking-wide mb-4">Data Ingestion</h3>
              <p className="text-gray-600 font-light leading-relaxed">
                We tap directly into stadium APIs, IoT sensors, turnstile counters, and POS systems to stream millions of data points per second into our secure vector databases.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.2} className="flex flex-col border-t-2 border-black pt-6">
              <span className="text-5xl font-black text-black/10 mb-6">02.</span>
              <h3 className="text-xl font-bold uppercase tracking-wide mb-4">Agent Analysis</h3>
              <p className="text-gray-600 font-light leading-relaxed">
                Our decentralized agents evaluate the telemetry streams using advanced forecasting models, identifying bottlenecks, stock shortages, and security risks instantly.
              </p>
            </FadeInUp>
            <FadeInUp delay={0.3} className="flex flex-col border-t-2 border-black pt-6">
              <span className="text-5xl font-black text-black/10 mb-6">03.</span>
              <h3 className="text-xl font-bold uppercase tracking-wide mb-4">Automated Action</h3>
              <p className="text-gray-600 font-light leading-relaxed">
                The platform autonomously executes decisions—redirecting crowds via digital signage, dispatching vendors, and alerting response teams before issues escalate.
              </p>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* Case Studies Grid (Dark Section) */}
      <section id="projects" className="w-full bg-[#111111] text-white px-6 py-24 md:px-16 md:py-32">
        <div className="max-w-[1600px] mx-auto">
          <FadeInUp>
            <div className="flex justify-between items-end mb-16 border-b border-white/20 pb-6">
              <h2 className="text-xl md:text-3xl font-bold uppercase tracking-widest text-white">Case Studies</h2>
              <Link to="/operations" className="font-bold hover:text-orange-500 transition-colors uppercase tracking-widest text-xs md:text-sm">View All →</Link>
            </div>
          </FadeInUp>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
            <FadeInUp delay={0.1} className="lg:col-span-5 relative group overflow-hidden cursor-pointer">
              <Link to="/operations" className="block">
                <div className="aspect-[4/5] relative overflow-hidden">
                  <img src="/images/1947558.jpg" alt="FIFA 2026" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110" />
                </div>
                <div className="mt-8">
                  <p className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-3">Global Sporting Event</p>
                  <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-4">FIFA World Cup 2026 Setup</h3>
                  <p className="text-gray-400 font-light leading-relaxed">Deploying full-stack telemetry and vendor logistics across 16 interconnected stadiums in North America.</p>
                </div>
              </Link>
            </FadeInUp>
            
            <FadeInUp delay={0.2} className="lg:col-span-7 relative group overflow-hidden cursor-pointer mt-12 lg:mt-32">
              <Link to="/operations" className="block">
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img src="/images/4143343.jpg" alt="Vendor Allocation" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110" />
                </div>
                <div className="mt-8">
                  <p className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-3">Resource Management</p>
                  <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-4">Dynamic Vendor Allocation</h3>
                  <p className="text-gray-400 font-light leading-relaxed max-w-2xl">A 40% reduction in queue wait times by autonomously relocating mobile vendors to predicted high-density zones during halftime intermissions.</p>
                </div>
              </Link>
            </FadeInUp>
          </div>
        </div>
      </section>

      {/* [NEW] Call to Action */}
      <section className="w-full bg-orange-600 text-white px-6 py-24 md:px-16 md:py-40 text-center">
        <FadeInUp>
          <h2 className="text-4xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-8 max-w-5xl mx-auto leading-none">
            Ready to Initialize The Engine?
          </h2>
          <p className="text-lg md:text-2xl font-light mb-12 max-w-2xl mx-auto opacity-90">
            Join the future of autonomous event logistics. Schedule a technical demonstration of ArenaPulse.
          </p>
          <Link to="/contact" className="inline-block bg-black text-white px-10 py-5 uppercase font-bold tracking-widest text-sm hover:bg-white hover:text-black transition-colors duration-300">
            Contact Sales
          </Link>
        </FadeInUp>
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

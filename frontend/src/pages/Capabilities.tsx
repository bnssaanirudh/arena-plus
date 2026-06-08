import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Capabilities() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500">
      <header className="w-full flex justify-between items-center px-8 py-6 border-b border-white/10">
        <Link to="/" className="text-2xl font-black uppercase tracking-tight hover:text-orange-500 transition-colors">
          ArenaPulse
        </Link>
        <Link to="/" className="uppercase font-bold text-sm tracking-widest hover:text-orange-500">
          Back to Home
        </Link>
      </header>
      
      <main className="max-w-7xl mx-auto px-8 py-32 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8"
        >
          Capabilities
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl font-light text-gray-400 max-w-3xl mx-auto"
        >
          Detailed technical specifications for the ArenaPulse Core Engine, coming in Phase 3.
        </motion.p>
      </main>
    </div>
  );
}

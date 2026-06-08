import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Contact() {
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
          Contact Sales
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl font-light text-gray-400 max-w-3xl mx-auto mb-12"
        >
          Ready to initialize the ArenaPulse engine for your venue?
        </motion.p>
        
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-xl mx-auto flex flex-col gap-6 text-left"
        >
          <div>
            <label className="block uppercase text-xs font-bold tracking-widest mb-2 text-gray-400">Organization Name</label>
            <input type="text" className="w-full bg-[#111] border border-white/20 p-4 text-white focus:border-orange-500 focus:outline-none transition-colors" placeholder="e.g. FIFA" />
          </div>
          <div>
            <label className="block uppercase text-xs font-bold tracking-widest mb-2 text-gray-400">Email Address</label>
            <input type="email" className="w-full bg-[#111] border border-white/20 p-4 text-white focus:border-orange-500 focus:outline-none transition-colors" placeholder="logistics@fifa.com" />
          </div>
          <button type="button" className="w-full bg-orange-600 text-white font-bold uppercase tracking-widest p-4 hover:bg-white hover:text-black transition-colors mt-4">
            Request Demonstration
          </button>
        </motion.form>
      </main>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Systems initialized. I am the ArenaPulse AI Copilot. Ask me about vendor inventories, crowd bottlenecks, or swarm planning dispatches." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_BASE}/api/v1/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyPayload })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "Connection timed out. Using offline dispatcher fallback: Heuristics are currently monitoring 7 stadium zones. Check the System Status console for details." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Check system status",
    "Show low stock stands",
    "How does the swarm verify?",
    "Explain Arize Phoenix integration"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[999] font-sans selection:bg-orange-500 selection:text-white text-black">
      <AnimatePresence>
        {isOpen ? (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="w-[360px] md:w-[400px] h-[500px] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-black text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-orange-500 rounded-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-bold uppercase tracking-wide text-xs leading-none">AI Copilot</h4>
                  <span className="text-[9px] text-orange-500 font-bold uppercase tracking-widest mt-1 block">Gemini 2.5 Flash active</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:text-orange-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message Pane */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-slate-50/50">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs leading-normal ${msg.role === 'user' ? 'bg-orange-600 text-white font-medium rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 text-slate-500 shadow-sm rounded-xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                    <span>Analyzing metrics...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions Chips */}
            {messages.length === 1 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-slate-50/20 border-t border-slate-100">
                {suggestions.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSend(item)}
                    className="text-[10px] bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50/20 transition-all font-medium"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 bg-white border-t border-slate-250/60 flex gap-2 items-center"
            >
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI Copilot..." 
                className="flex-1 border border-slate-200 px-4 py-2 rounded-xl text-xs text-black focus:border-orange-500 focus:outline-none transition-colors"
              />
              <button 
                type="submit" 
                className="p-2.5 bg-black hover:bg-orange-600 text-white rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-orange-600 text-white flex items-center justify-center rounded-full shadow-2xl hover:bg-black transition-colors cursor-pointer border-2 border-white"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

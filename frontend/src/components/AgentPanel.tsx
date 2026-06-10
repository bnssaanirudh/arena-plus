import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

/** Types text out character by character — the "agent thinking live" effect. */
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    if (!text) return;
    const interval = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(interval);
          return n;
        }
        return n + 2; // 2 chars per tick ≈ natural reading pace
      });
    }, 24);
    return () => clearInterval(interval);
  }, [text]);

  const done = shown >= text.length;
  return (
    <span>
      {text.slice(0, shown)}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-purple-600 align-middle animate-pulse ml-[1px]" />}
    </span>
  );
}

export function AgentPanel() {
    const { agentActions } = useStore();

    return (
        <div className="flex flex-col h-full overflow-hidden text-slate-800">
            <h2 className="text-xl font-bold mb-4 text-purple-700 flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                Agentic Swarm Activity
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-300">
                {agentActions.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4 italic">No autonomous actions yet...</p>
                )}
                {agentActions.map((action, idx) => {
                    // Newest entry types itself out — live agent reasoning
                    const isNewest = idx === 0;
                    return (
                    <div key={`${action.agent_name}-${action.timestamp}-${action.action}`} className="p-3 bg-slate-50 rounded-xl border border-slate-200 border-l-4 border-l-purple-600 flex flex-col gap-1 shadow-sm">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-purple-700">{action.agent_name}</span>
                            <span className="text-xs text-slate-450">
                              {action.timestamp ? new Date(action.timestamp).toLocaleTimeString() : '—'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{action.action}</p>
                        {action.reasoning && (
                          <p className="text-xs text-slate-500 italic mt-1">
                            &quot;{isNewest ? <Typewriter text={action.reasoning} /> : action.reasoning}&quot;
                          </p>
                        )}
                    </div>
                    );
                })}
            </div>
        </div>
    );
}

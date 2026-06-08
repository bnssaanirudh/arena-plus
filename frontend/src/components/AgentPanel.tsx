import { useStore } from '../store/useStore';

export function AgentPanel() {
    const { agentActions } = useStore();

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-xl overflow-hidden">
            <h2 className="text-xl font-bold mb-4 text-purple-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                Agentic Brain Activity
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                {agentActions.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No autonomous actions yet...</p>
                )}
                {agentActions.map((action, i) => (
                    <div key={i} className="p-3 bg-slate-900 rounded-md border-l-4 border-purple-500 flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-sm text-purple-300">{action.agent_name}</span>
                            <span className="text-xs text-slate-500">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-slate-300 mt-1">{action.action}</p>
                        <p className="text-xs text-slate-500 italic mt-1">&quot;{action.reasoning}&quot;</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

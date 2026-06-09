import { useState } from 'react';
import { Play, Square, FastForward } from 'lucide-react';
import { useStore } from '../store/useStore';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export function DemoControls() {
    const { isDemoMode, setDemoMode } = useStore();
    const [triggering, setTriggering] = useState(false);

    async function triggerSurge() {
        setTriggering(true);
        try {
            await fetch(`${API_BASE}/api/v1/events/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event_type: 'crowd_surge' }),
            });
        } catch (e) {
            console.error('Failed to trigger surge', e);
        } finally {
            setTriggering(false);
        }
    }

    return (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-xl flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <div className={`w-3 h-3 rounded-full ${isDemoMode ? 'bg-orange-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    <span className="text-white font-bold">Demo Mode</span>
                </div>
                <div className="text-sm text-slate-400 hidden lg:block whitespace-nowrap">
                    Simulated Scenarios
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setDemoMode(!isDemoMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors ${
                        isDemoMode
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                >
                    {isDemoMode ? <Square size={16} /> : <Play size={16} />}
                    {isDemoMode ? 'Stop Demo' : 'Start Demo'}
                </button>

                <button
                    onClick={triggerSurge}
                    disabled={triggering}
                    className="flex items-center gap-2 px-4 py-2 rounded-md font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FastForward size={16} />
                    {triggering ? 'Triggering…' : 'Trigger Surge'}
                </button>
            </div>
        </div>
    );
}

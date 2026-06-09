import { useState } from 'react';
import { Play, Square, FastForward, Clapperboard } from 'lucide-react';
import { useStore } from '../store/useStore';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export function DemoControls() {
    const { isDemoMode, setDemoMode } = useStore();
    const [triggering, setTriggering] = useState(false);
    const [demoRunning, setDemoRunning] = useState(false);
    const [demoStatus, setDemoStatus] = useState('');

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

    async function startDemo() {
        if (demoRunning) return;
        setDemoRunning(true);
        setDemoMode(true);
        setDemoStatus('Launching 5-event cascade…');
        try {
            const res = await fetch(`${API_BASE}/api/v1/events/demo`, { method: 'POST' });
            if (res.ok) {
                // Demo runs ~50 seconds total (5 events, 6-12s apart)
                const steps = ['Normal flow…', 'Congestion building…', 'SURGE detected!', 'Security alert!', 'Recovery…', 'Complete ✓'];
                const delays = [0, 6000, 14000, 24000, 36000, 48000];
                for (let i = 0; i < steps.length; i++) {
                    setTimeout(() => {
                        setDemoStatus(steps[i]);
                        if (i === steps.length - 1) {
                            setTimeout(() => {
                                setDemoRunning(false);
                                setDemoMode(false);
                                setDemoStatus('');
                            }, 3000);
                        }
                    }, delays[i]);
                }
            } else {
                setDemoStatus('Failed to start demo');
                setDemoRunning(false);
                setDemoMode(false);
            }
        } catch (e) {
            console.error('Failed to start demo scenario', e);
            setDemoStatus('Error — is the backend running?');
            setDemoRunning(false);
            setDemoMode(false);
        }
    }

    return (
        <div className="flex items-center gap-3">
            {/* Demo status badge */}
            {demoRunning && demoStatus && (
                <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-orange-400 bg-orange-950/40 border border-orange-800/50 px-3 py-1 rounded-full animate-pulse max-w-[200px] truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></span>
                    {demoStatus}
                </div>
            )}

            {/* Start/Stop Demo — the scripted cascade */}
            <button
                onClick={demoRunning ? undefined : startDemo}
                disabled={demoRunning}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                    demoRunning
                        ? 'bg-orange-500/20 text-orange-400 cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Run scripted 5-event surge cascade"
            >
                <Clapperboard size={14} />
                {demoRunning ? 'Demo Running…' : 'Run Demo'}
            </button>

            {/* Trigger single surge */}
            <button
                onClick={triggerSurge}
                disabled={triggering}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Inject a single crowd_surge event"
            >
                <FastForward size={14} />
                {triggering ? 'Triggering…' : 'Trigger Surge'}
            </button>
        </div>
    );
}

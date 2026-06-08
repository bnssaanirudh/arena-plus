import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function LiveFeed() {
    const { liveEvents } = useStore();

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-lg p-[max(1rem,1vw)] border border-slate-700 shadow-xl overflow-hidden">
            <h2 className="font-bold mb-[max(1rem,1vw)] text-blue-400 flex items-center gap-[max(0.5rem,0.5vw)] text-[max(1.25rem,1.5vw)]">
                <span className="rounded-full bg-blue-500 animate-pulse w-[max(0.5rem,0.5vw)] h-[max(0.5rem,0.5vw)]"></span>
                Live Telemetry Feed
            </h2>
            <div className="flex-1 overflow-y-auto space-y-[max(0.75rem,0.75vw)] pr-[max(0.5rem,0.5vw)] scrollbar-thin scrollbar-thumb-slate-600">
                {liveEvents.length === 0 && (
                    <p className="text-slate-400 text-[max(0.875rem,1vw)] text-center py-[max(1rem,1vw)]">Waiting for telemetry...</p>
                )}
                {liveEvents.map(evt => (
                    <div key={evt.event_id} className="p-[max(0.75rem,0.75vw)] bg-slate-900 rounded-md border-l-[max(4px,0.25vw)] border-blue-500 flex flex-col gap-[max(0.25rem,0.25vw)]">
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-200 text-[max(0.875rem,1vw)]">{evt.event_type.replace('_', ' ').toUpperCase()}</span>
                            <span className="text-slate-500 text-[max(0.75rem,0.8vw)]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-300 text-[max(0.875rem,1vw)]">
                            Location: <span className="font-medium text-slate-100">{evt.location}</span>
                        </div>
                        <div className="flex justify-between mt-[max(0.25rem,0.25vw)] text-[max(0.75rem,0.8vw)]">
                            <span className="text-slate-400">Density: <span className={`font-bold ${evt.density_score > 8 ? 'text-red-400' : 'text-green-400'}`}>{evt.density_score}</span></span>
                            <span className="text-slate-400">People: <span className="text-slate-200">{evt.predicted_people.toLocaleString()}</span></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function LiveFeed() {
    const { liveEvents } = useStore();

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-[0.5em] p-[1em] border border-slate-700 shadow-xl overflow-hidden">
            <h2 className="font-bold mb-[1em] text-blue-400 flex items-center gap-[0.5em] text-[1.5em]">
                <span className="rounded-full bg-blue-500 animate-pulse w-[0.6em] h-[0.6em]"></span>
                Live Telemetry Feed
            </h2>
            <div className="flex-1 overflow-y-auto space-y-[0.75em] pr-[0.5em] scrollbar-thin scrollbar-thumb-slate-600">
                {liveEvents.length === 0 && (
                    <p className="text-slate-400 text-[1em] text-center py-[1em]">Waiting for telemetry...</p>
                )}
                {liveEvents.map(evt => (
                    <div key={evt.event_id} className="p-[0.75em] bg-slate-900 rounded-[0.4em] border-l-[0.25em] border-blue-500 flex flex-col gap-[0.25em]">
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-200 text-[1em]">{evt.event_type.replaceAll('_', ' ').toUpperCase()}</span>
                            <span className="text-slate-500 text-[0.8em]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-300 text-[1em]">
                            Location: <span className="font-medium text-slate-100">{evt.location}</span>
                        </div>
                        <div className="flex justify-between mt-[0.25em] text-[0.8em]">
                            <span className="text-slate-400">Density: <span className={`font-bold ${evt.density_score > 8 ? 'text-red-400' : 'text-green-400'}`}>{evt.density_score}</span></span>
                            <span className="text-slate-400">People: <span className="text-slate-200">{evt.predicted_people.toLocaleString()}</span></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

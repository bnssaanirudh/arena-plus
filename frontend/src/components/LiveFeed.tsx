import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function LiveFeed() {
    const { liveEvents } = useStore();

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-xl overflow-hidden">
            <h2 className="text-xl font-bold mb-4 text-blue-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Live Telemetry Feed
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                {liveEvents.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">Waiting for telemetry...</p>
                )}
                {liveEvents.map(evt => (
                    <div key={evt.event_id} className="p-3 bg-slate-900 rounded-md border-l-4 border-blue-500 flex flex-col gap-1">
                        <div className="flex justify-between items-start">
                            <span className="font-semibold text-sm text-slate-200">{evt.event_type.replace('_', ' ').toUpperCase()}</span>
                            <span className="text-xs text-slate-500">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-sm text-slate-300">
                            Location: <span className="font-medium text-slate-100">{evt.location}</span>
                        </div>
                        <div className="flex justify-between mt-1 text-xs">
                            <span className="text-slate-400">Density: <span className={`font-bold ${evt.density_score > 8 ? 'text-red-400' : 'text-green-400'}`}>{evt.density_score}</span></span>
                            <span className="text-slate-400">People: <span className="text-slate-200">{evt.predicted_people.toLocaleString()}</span></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function Analytics() {
    const { liveEvents } = useStore();

    // Group events by minute for the chart
    const data = liveEvents.slice(0, 20).reverse().map((e, i) => ({
        time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        density: e.density_score,
        people: e.predicted_people
    }));

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-xl overflow-hidden">
            <h2 className="text-xl font-bold mb-4 text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Live Analytics
            </h2>
            
            <div className="flex-1 min-h-0 flex flex-col gap-4">
                <div className="flex-1 min-h-[200px] bg-slate-900 rounded-lg p-3 border border-slate-700 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-400 mb-2 pl-2">Density Trend</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={5} />
                                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px' }} itemStyle={{ color: '#22c55e' }} />
                                <Line type="monotone" dataKey="density" stroke="#22c55e" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex-1 min-h-[200px] bg-slate-900 rounded-lg p-3 border border-slate-700 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-400 mb-2 pl-2">Crowd Volume</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={5} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px' }} itemStyle={{ color: '#3b82f6' }} />
                                <Area type="monotone" dataKey="people" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

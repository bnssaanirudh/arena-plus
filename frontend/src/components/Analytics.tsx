import { useStore } from '../store/useStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function Analytics() {
    const { liveEvents } = useStore();

    // Group events by minute for the chart
    const data = liveEvents.slice(0, 20).reverse().map((e) => ({
        time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        density: e.density_score,
        people: e.predicted_people
    }));

    return (
        <div className="flex flex-col h-full overflow-hidden text-slate-800">
            <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-green-600"></span>
                Live Analytics
            </h2>
            
            <div className="flex-1 min-h-0 flex flex-col gap-4">
                <div className="flex-1 min-h-[200px] bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-500 mb-2 pl-2">Density Trend</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={5} />
                                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#16a34a' }} />
                                <Line type="monotone" dataKey="density" stroke="#16a34a" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex-1 min-h-[200px] bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-500 mb-2 pl-2">Crowd Volume</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={5} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} itemStyle={{ color: '#2563eb' }} />
                                <Area type="monotone" dataKey="people" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.15} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store/useStore';

const STADIUM_CENTER = [34.0141, -118.2879];

// Component to recenter or adjust map dynamically if needed
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export function StadiumMap() {
    const { liveEvents } = useStore();
    const [vendors, setVendors] = useState<any[]>([]);

    useEffect(() => {
        // Fetch vendors from backend
        fetch('http://localhost:8000/api/v1/vendors/')
            .then(res => res.json())
            .then(data => setVendors(data))
            .catch(err => console.error("Failed to fetch vendors", err));
    }, []);

    // Get the most recent event for hotspots
    const latestSurges = liveEvents.filter(e => e.event_type === 'crowd_surge').slice(0, 5);

    return (
        <div className="w-full h-full rounded-lg overflow-hidden border border-slate-700 shadow-xl relative">
            <div className="absolute top-[1cqw] left-[1cqw] z-[1000] bg-slate-900/80 p-[1cqw] rounded backdrop-blur-sm border border-slate-700">
                <h3 className="text-white font-bold text-[1.5cqw]">Arena Map</h3>
                <div className="flex flex-col gap-[0.5cqw] mt-[0.8cqw] text-[1cqw]">
                    <div className="flex items-center gap-[0.8cqw]"><span className="w-[1cqw] h-[1cqw] rounded-full bg-blue-500"></span> Vendors</div>
                    <div className="flex items-center gap-[0.8cqw]"><span className="w-[1cqw] h-[1cqw] rounded-full bg-red-500 animate-ping"></span> Crowd Surge</div>
                </div>
            </div>
            <MapContainer 
                center={STADIUM_CENTER as [number, number]} 
                zoom={16} 
                className="w-full h-full"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                
                {/* Render Vendors */}
                {vendors.map(v => (
                    <CircleMarker 
                        key={v.vendor_id}
                        center={[v.latitude, v.longitude]}
                        radius={6}
                        pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.7 }}
                    >
                        <Popup className="bg-slate-800 text-white border-slate-700">
                            <strong>{v.vendor_name}</strong><br/>
                            Water: {v.inventory_water}<br/>
                            Food: {v.inventory_food}<br/>
                            Merch: {v.inventory_merchandise}
                        </Popup>
                    </CircleMarker>
                ))}

                {/* Render Crowd Surges */}
                {latestSurges.map((s, i) => {
                    // Approximate lat/lon for zones to demo visuals
                    const latOff = (Math.random() - 0.5) * 0.005;
                    const lonOff = (Math.random() - 0.5) * 0.005;
                    return (
                        <CircleMarker 
                            key={`surge-${i}`}
                            center={[STADIUM_CENTER[0] + latOff, STADIUM_CENTER[1] + lonOff]}
                            radius={s.density_score * 3}
                            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.5 }}
                        >
                            <Popup>
                                <strong>Surge at {s.location}</strong><br/>
                                Density: {s.density_score}<br/>
                                People: {s.predicted_people}
                            </Popup>
                        </CircleMarker>
                    )
                })}
            </MapContainer>
        </div>
    );
}

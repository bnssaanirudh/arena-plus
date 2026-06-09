import random
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

EVENT_TYPES = [
    "crowd_surge",
    "congestion",
    "vendor_demand_spike",
    "security_alert",
    "medical_emergency",
    "normal_flow"
]

# Zone names + SoFi Stadium approximate coordinates (lat, lon)
ZONES = [
    "North Gate",
    "South Gate",
    "East Gate",
    "West Gate",
    "Food Court",
    "Merchandise Zone",
    "Parking"
]

_ZONE_COORDS: Dict[str, tuple] = {
    "North Gate":       (33.9574, -118.3379),
    "South Gate":       (33.9494, -118.3395),
    "East Gate":        (33.9534, -118.3342),
    "West Gate":        (33.9534, -118.3448),
    "Food Court":       (33.9540, -118.3392),
    "Merchandise Zone": (33.9552, -118.3375),
    "Parking":          (33.9510, -118.3420),
}

def generate_random_event() -> Dict[str, Any]:
    event_type = random.choices(
        EVENT_TYPES,
        weights=[0.1, 0.2, 0.1, 0.05, 0.05, 0.5],
        k=1
    )[0]
    
    zone = random.choice(ZONES)
    
    if event_type == "crowd_surge":
        density_score = round(random.uniform(7.5, 10.0), 1)
        predicted_people = random.randint(5000, 15000)
    elif event_type == "congestion":
        density_score = round(random.uniform(6.0, 8.5), 1)
        predicted_people = random.randint(3000, 8000)
    else:
        density_score = round(random.uniform(1.0, 5.0), 1)
        predicted_people = random.randint(500, 3000)
        
    lat, lon = _ZONE_COORDS.get(zone, (33.9534, -118.3392))
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "location": zone,
        "density_score": density_score,
        "predicted_people": predicted_people,
        "latitude": lat,
        "longitude": lon,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

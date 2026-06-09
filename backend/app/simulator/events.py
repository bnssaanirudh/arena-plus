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

ZONES = [
    "North Gate",
    "South Gate",
    "East Gate",
    "West Gate",
    "Food Court",
    "Merchandise Zone",
    "Parking"
]

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
        
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "location": zone,
        "density_score": density_score,
        "predicted_people": predicted_people,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

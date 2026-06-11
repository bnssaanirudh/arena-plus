import random
import uuid
from faker import Faker
from typing import List, Dict, Any

fake = Faker()

# SoFi Stadium center — must match the zone coords in simulator/events.py and
# simulator/demo.py, otherwise the agent's geo_distance vendor search finds nothing.
STADIUM_CENTER_LAT = 33.9534
STADIUM_CENTER_LON = -118.3392
RADIUS_DEG = 0.005  # roughly 500m

def generate_vendors(count: int = 50) -> List[Dict[str, Any]]:
    vendors = []
    for _ in range(count):
        # Generate coordinates near the stadium
        lat = STADIUM_CENTER_LAT + random.uniform(-RADIUS_DEG, RADIUS_DEG)
        lon = STADIUM_CENTER_LON + random.uniform(-RADIUS_DEG, RADIUS_DEG)
        
        vendors.append({
            "vendor_id": str(uuid.uuid4()),
            "vendor_name": fake.company() + " " + random.choice(["Stand", "Cart", "Kiosk", "Truck"]),
            "latitude": lat,
            "longitude": lon,
            "inventory_water": random.randint(100, 1000),
            "inventory_food": random.randint(50, 500),
            "inventory_merchandise": random.randint(10, 200) if random.random() > 0.5 else 0
        })
    return vendors

VENDORS_DB = generate_vendors(50)

def get_all_vendors() -> List[Dict[str, Any]]:
    return VENDORS_DB

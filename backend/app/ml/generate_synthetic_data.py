"""
ArenaPulse Synthetic Data Generator (Temporal Lag Version)
==========================================================
Generates a time-series dataset of stadium events to train predictive models
without concurrent data leakage.

Output (written to backend/data/synthetic/):
  - events.csv
  - seat_clusters.csv
  - movement_edges.csv
  - training_features.csv (Lagged features paired with target label)
"""

import os
import random
import math
import csv
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[3]  # backend/
ARCHIVE_DIR = PROJECT_ROOT.parent / "archive"
DATA_DIR = PROJECT_ROOT / "data"
SYNTHETIC_DIR = DATA_DIR / "synthetic"

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GATES = ["North", "South", "East", "West"]
TICKET_CLASSES = ["Economy", "Regular", "VIP"]
PURCHASE_TYPES = ["Pre", "At-Gate"]
GATE_STATUSES = ["Open", "Closed"]
ALERT_TYPES = ["None", "Blockage", "Overcrowding"]
CONGESTION_ZONES = [f"Z{i}" for i in range(1, 11)]
PATH_TYPES = ["Corridor", "Stairs", "Ramp"]

# Temporal Simulation config
NUM_MATCHES = 500
TIME_STEPS_PER_MATCH = 20  # T=0 to T=190 in 10-minute intervals
CLUSTERS_PER_EVENT = 50
EDGES_PER_EVENT_MIN = 80
EDGES_PER_EVENT_MAX = 120

# Surge threshold: event is experiencing a surge if max occupancy >= 0.85
SURGE_THRESHOLD = 0.85
SURGE_MATCH_FRACTION = 0.25
LAG_STEPS = 2  # Predict 2 time steps (20 minutes) into the future

# ---------------------------------------------------------------------------
# Stats Loader
# ---------------------------------------------------------------------------
def _load_archive_stats() -> Dict[str, Any]:
    return {
        "attendance_mean": 52500, "attendance_std": 6500,
        "zone_attendance_mean": 10300, "zone_attendance_std": 3200,
        "sellout_mean": 94, "sellout_std": 4,
        "evac_time_mean": 4.7, "evac_time_std": 0.8,
        "staff_mean": 17, "staff_std": 4.5,
        "people_count_mean": 120, "people_count_std": 45,
        "ble_pings_mean": 400, "ble_pings_std": 120,
        "pressure_mat_mean": 85, "pressure_mat_std": 22,
        "zone_capacity_mean": 1140, "zone_capacity_std": 200,
        "distance_mean": 17, "distance_std": 8,
        "flow_capacity_mean": 205, "flow_capacity_std": 60,
        "congestion_mean": 0.63, "congestion_std": 0.22,
    }

def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))

# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------
def generate_events(stats: Dict[str, Any]) -> pd.DataFrame:
    rows = []
    base_date = datetime(2024, 6, 1, 18, 0, 0)
    
    n_surge = int(NUM_MATCHES * SURGE_MATCH_FRACTION)
    surge_matches = set(random.sample(range(NUM_MATCHES), n_surge))

    for m in range(NUM_MATCHES):
        is_surge_match = m in surge_matches
        gate = random.choice(GATES)
        ticket = random.choice(TICKET_CLASSES)
        sellout = round(_clamp(np.random.normal(stats["sellout_mean"], stats["sellout_std"]), 60, 100), 0)
        total_attendance = int(_clamp(np.random.normal(stats["attendance_mean"], stats["attendance_std"]), 20000, 80000))
        match_start_time = base_date + timedelta(days=m % 365, hours=random.choice([14, 16, 18, 20]))
        
        # Determine the peak surge time step for this match if applicable
        surge_time_step = random.randint(3, 16) if is_surge_match else -1

        for t in range(TIME_STEPS_PER_MATCH):
            event_id = 1000 + (m * TIME_STEPS_PER_MATCH) + t
            timestamp = match_start_time + timedelta(minutes=10 * t)
            
            # Simple temporal curves
            staff = int(_clamp(np.random.normal(stats["staff_mean"], stats["staff_std"]), 5, 40))
            alert = "None"
            gate_status = "Open"
            
            # Simulated surge multiplier for this time step
            surge_multiplier = 1.0
            if is_surge_match and abs(t - surge_time_step) <= 1:
                surge_multiplier = 1.8
                alert = random.choice(["Blockage", "Overcrowding"])
                gate_status = "Closed"
                
            zone_attendance = int(_clamp(
                np.random.normal(stats["zone_attendance_mean"], stats["zone_attendance_std"]) * surge_multiplier,
                2000, 20000
            ))
            
            rows.append({
                "Event_ID": event_id,
                "Match_ID": m,
                "Time_Step": t,
                "Timestamp": timestamp.strftime("%m/%d/%Y %H:%M"),
                "Gate_ID": gate,
                "Ticket_Class": ticket,
                "Purchase_Type": random.choice(PURCHASE_TYPES),
                "Staff_On_Duty": staff,
                "Gate_Status": gate_status,
                "Alerts": alert,
                "Total_Attendance": total_attendance,
                "Zone_Attendance": zone_attendance,
                "Sellout_Rate(%)": int(sellout),
                "Drill_Timestamp": (timestamp + timedelta(days=1)).strftime("%m/%d/%Y %H:%M"),
                "Evacuation_Time(min)": round(random.uniform(3.0, 8.0), 2),
                "Congestion_Hotspot": random.choice(CONGESTION_ZONES),
                "_surge_multiplier": surge_multiplier
            })
            
    return pd.DataFrame(rows)


def generate_seat_clusters(events_df: pd.DataFrame, stats: Dict[str, Any]) -> pd.DataFrame:
    rows = []
    
    for _, event in events_df.iterrows():
        event_id = event["Event_ID"]
        surge_mult = event["_surge_multiplier"]
        time_step = event["Time_Step"]
        
        # Base temporal occupancy curve (0-1) representing arrival, peak, and departure
        if time_step < 5:
            base_curve = 0.2 + (time_step * 0.15)  # arrival
        elif 5 <= time_step <= 14:
            base_curve = 0.95 if time_step not in [9, 10] else 0.7  # peak, dip at half-time
        else:
            base_curve = 0.95 - ((time_step - 14) * 0.15)  # departure
            
        base_curve = max(0.1, min(1.0, base_curve))
        
        for c in range(1, CLUSTERS_PER_EVENT + 1):
            seat_id = f"C{c:02d}"
            
            zone_cap = int(_clamp(np.random.normal(stats["zone_capacity_mean"], stats["zone_capacity_std"]), 600, 1600))
            
            # Add noise and apply the surge multiplier to the specific cluster
            cluster_mult = surge_mult if c <= 10 else 1.0  # Surge mainly affects the first 10 clusters
            
            people = int(zone_cap * base_curve * cluster_mult * random.uniform(0.8, 1.2))
            
            turnstile = int(_clamp(people - random.randint(0, 10), 0, people))
            ble = int(_clamp(np.random.normal(stats["ble_pings_mean"], stats["ble_pings_std"]) * (people/120 + 0.1), 50, 1000))
            pressure = int(people * 0.7)
            detected_heads = int(_clamp(people - random.randint(0, 8), 0, people))
            occupancy_prob = round(people / zone_cap, 2) if zone_cap > 0 else 0
            
            rows.append({
                "Event_ID": event_id,
                "Seat_ID": seat_id,
                "People_Count": people,
                "Turnstile_Count": turnstile,
                "BLE_Pings": ble,
                "Pressure_Mat_Activations": pressure,
                "Frame_ID": random.randint(1000, 5000),
                "Detected_Heads": detected_heads,
                "Seat_Occupancy_Prob": occupancy_prob,
                "Visibility_Score": round(random.uniform(0.65, 1.0), 2),
                "Seat_X": random.randint(5, 50),
                "Seat_Y": random.randint(5, 50),
                "Zone_Capacity": zone_cap,
            })
            
    return pd.DataFrame(rows)


def generate_movement_edges(events_df: pd.DataFrame, stats: Dict[str, Any]) -> pd.DataFrame:
    seat_ids = [f"C{c:02d}" for c in range(1, CLUSTERS_PER_EVENT + 1)]
    rows = []
    
    for _, event in events_df.iterrows():
        event_id = event["Event_ID"]
        surge_mult = event["_surge_multiplier"]
        num_edges = random.randint(EDGES_PER_EVENT_MIN, EDGES_PER_EVENT_MAX)
        
        for _ in range(num_edges):
            src, tgt = random.sample(seat_ids, 2)
            flow_cap = int(_clamp(np.random.normal(stats["flow_capacity_mean"], stats["flow_capacity_std"]), 80, 350))
            
            base_cong = random.uniform(0.2, 0.6)
            congestion = round(_clamp(base_cong * surge_mult, 0.1, 1.0), 2)
            current_flow = int(flow_cap * congestion)
            
            rows.append({
                "Event_ID": event_id,
                "Source_Seat": src,
                "Target_Seat": tgt,
                "Path_Type": random.choice(PATH_TYPES),
                "Distance": round(random.uniform(5.0, 30.0), 1),
                "Flow_Capacity": flow_cap,
                "Current_Flow": current_flow,
                "Congestion_Level": congestion,
            })
            
    return pd.DataFrame(rows)


def build_lagged_training_features(events_df: pd.DataFrame, seats_df: pd.DataFrame, edges_df: pd.DataFrame) -> pd.DataFrame:
    # 1. Aggregate seats per event
    seat_agg = seats_df.groupby("Event_ID").agg(
        avg_people=("People_Count", "mean"),
        max_people=("People_Count", "max"),
        std_people=("People_Count", "std"),
        avg_turnstile=("Turnstile_Count", "mean"),
        avg_ble_pings=("BLE_Pings", "mean"),
        avg_pressure_mat=("Pressure_Mat_Activations", "mean"),
        avg_detected_heads=("Detected_Heads", "mean"),
        avg_occupancy_prob=("Seat_Occupancy_Prob", "mean"),
        max_occupancy_prob=("Seat_Occupancy_Prob", "max"),
        avg_zone_capacity=("Zone_Capacity", "mean"),
    ).reset_index()

    # 2. Aggregate edges per event
    edge_agg = edges_df.groupby("Event_ID").agg(
        avg_congestion=("Congestion_Level", "mean"),
        max_congestion=("Congestion_Level", "max"),
        std_congestion=("Congestion_Level", "std"),
        avg_flow_capacity=("Flow_Capacity", "mean"),
        avg_current_flow=("Current_Flow", "mean"),
        num_edges=("Congestion_Level", "count"),
        high_congestion_edges=("Congestion_Level", lambda x: (x > 0.85).sum()),
    ).reset_index()

    # 3. Merge aggregates with events
    features = events_df.merge(seat_agg, on="Event_ID", how="left")
    features = features.merge(edge_agg, on="Event_ID", how="left")

    # 4. Calculate concurrent derived features
    features["turnstile_to_people_ratio"] = features["avg_turnstile"] / features["avg_people"].replace(0, 1)
    features["attendance_to_capacity_ratio"] = features["avg_people"] / features["avg_zone_capacity"].replace(0, 1)
    features["high_congestion_ratio"] = features["high_congestion_edges"] / features["num_edges"].replace(0, 1)
    
    # Define Target: A surge is happening AT TIME T
    features["target_surge_label"] = (features["max_occupancy_prob"] >= SURGE_THRESHOLD).astype(int)

    # 5. Build Lagged Dataset
    features.sort_values(by=["Match_ID", "Time_Step"], inplace=True)
    
    # We want to predict target_surge_label at T using features at T-LAG
    # So we shift the features forward by LAG_STEPS within each Match_ID
    
    feature_cols = [
        "Staff_On_Duty", "Total_Attendance", "Zone_Attendance", "Sellout_Rate(%)", "Evacuation_Time(min)",
        "avg_people", "max_people", "std_people", "avg_turnstile", "avg_ble_pings", "avg_pressure_mat",
        "avg_detected_heads", "avg_occupancy_prob", "max_occupancy_prob", "avg_zone_capacity",
        "avg_congestion", "max_congestion", "std_congestion", "avg_flow_capacity", "avg_current_flow",
        "num_edges", "high_congestion_edges", "turnstile_to_people_ratio", "attendance_to_capacity_ratio",
        "high_congestion_ratio"
    ]
    
    # Create shifted features DataFrame
    lagged_df = features.copy()
    
    # Keep the target from T
    target = lagged_df["target_surge_label"]
    
    for col in feature_cols:
        # Shift features forward by LAG_STEPS: row T will now have features from T-LAG
        lagged_df[col] = lagged_df.groupby("Match_ID")[col].shift(LAG_STEPS)
        # Also compute velocity (rate of change from T-LAG-1 to T-LAG) to help the model catch trends
        lagged_df[f"{col}_velocity"] = lagged_df[col] - lagged_df.groupby("Match_ID")[col].shift(1)
        
    # Drop rows that have NaNs due to shifting (i.e. the first LAG_STEPS+1 time steps of each match)
    lagged_df.dropna(subset=[f"{col}_velocity" for col in feature_cols], inplace=True)
    
    # Rename target column back to expected
    lagged_df.rename(columns={"target_surge_label": "surge_label"}, inplace=True)
    
    # Drop concurrent leakage cols
    drop_cols = ["Timestamp", "Drill_Timestamp", "Gate_ID", "Ticket_Class",
                 "Purchase_Type", "Gate_Status", "Alerts", "Congestion_Hotspot",
                 "_surge_multiplier"]
    training_clean = lagged_df.drop(columns=[c for c in drop_cols if c in lagged_df.columns])
    
    return training_clean

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("ArenaPulse Synthetic Data Generator (Temporal Lag)")
    print("=" * 60)

    stats = _load_archive_stats()

    print(f"\n[1/4] Generating {NUM_MATCHES} matches ({NUM_MATCHES * TIME_STEPS_PER_MATCH:,} total snapshots)...")
    events_df = generate_events(stats)

    print(f"\n[2/4] Generating seat clusters...")
    seats_df = generate_seat_clusters(events_df, stats)

    print(f"\n[3/4] Generating movement edges...")
    edges_df = generate_movement_edges(events_df, stats)

    print(f"\n[4/4] Building LAGGED training feature table (predicting {LAG_STEPS} steps ahead)...")
    training_df = build_lagged_training_features(events_df, seats_df, edges_df)
    
    surge_count = training_df["surge_label"].sum()
    print(f"  Training features: {len(training_df):,} rows, {len(training_df.columns)} columns")
    print(f"  Surge events: {surge_count:,} / {len(training_df):,} ({surge_count / len(training_df) * 100:.1f}%)")

    # Save
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
    events_save = events_df.drop(columns=["_surge_multiplier", "Match_ID", "Time_Step"], errors="ignore")
    events_save.to_csv(SYNTHETIC_DIR / "events.csv", index=False)
    seats_df.to_csv(SYNTHETIC_DIR / "seat_clusters.csv", index=False)
    edges_df.to_csv(SYNTHETIC_DIR / "movement_edges.csv", index=False)
    training_df.to_csv(SYNTHETIC_DIR / "training_features.csv", index=False)

    print(f"\n{'=' * 60}")
    print(f"All files written to: {SYNTHETIC_DIR}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()

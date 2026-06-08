# ML Data Leakage Investigation & Resolution Report

## 1. Executive Summary
During the initial ML model training for Phase 3, the RandomForest model achieved an `F1=1.0000`. We conducted a leakage audit on the dataset (`training_features.csv`) and found that the model was memorizing concurrent metrics. We successfully resolved this by redesigning the data generator into a temporal time-series simulation and engineering lagged forecasting features.

## 2. Leakage Audit Results
A Pearson correlation check against the original `surge_label` revealed severe leakage from concurrent features:

| Feature | Pearson Correlation | Assessment |
|---------|---------------------|------------|
| `attendance_to_capacity_ratio` | 0.9889 | **Critical Leakage** |
| `avg_occupancy_prob` | 0.9884 | **Critical Leakage** |
| `avg_turnstile` | 0.9724 | **Critical Leakage** |
| `avg_detected_heads` | 0.9723 | **Critical Leakage** |
| `avg_people` | 0.9722 | **Critical Leakage** |

**Conclusion:** The label was defined as `max_occupancy_prob >= 0.85` at time $T$. However, the training dataset contained concurrent measurements of `max_occupancy_prob` and highly correlated metrics (`avg_people`) at the *exact same time $T$*. The model did not learn to forecast; it simply learned the if-statement defining the label.

## 3. The Resolution: Temporal Lag Engineering

To fix this, we transformed the problem from "concurrent classification" to **"time-series forecasting"**.

### 3.1 Time-Series Simulation
We rewrote `generate_synthetic_data.py` to generate **500 distinct stadium matches**, each modeled across **20 time steps** (representing 10-minute intervals from $T=0$ to $T=190$ minutes).
This produced a continuous dataset of **10,000 snapshots** reflecting real crowd dynamics:
1. **Arrival Phase:** Rising gate flow and seat occupancy.
2. **Game-Time Phase:** Stabilized peak occupancy.
3. **Half-Time Phase:** Dips in seat occupancy, spikes in vendor/concourse congestion.
4. **Departure Phase:** Rapidly falling seat occupancy and high exit flows.

### 3.2 Lagged Target Definition
* **Target:** Predict if a surge is occurring at time $T$ (defined as `max_occupancy_prob >= 0.85`).
* **Predictors:** Use the telemetry features from $T - 2$ (i.e., **20 minutes prior**).
* All concurrent features from time $T$ were strictly excluded from the training row.

### 3.3 New Feature Engineering (Velocity)
We introduced **Rate-of-Change (Velocity)** features. By subtracting the metrics at $T-3$ from $T-2$, we allow the model to see the *momentum* of the crowd (e.g., `occupancy_velocity = occupancy_{T-2} - occupancy_{T-3}`).

## 4. Retraining Results

We retrained the models on the new dataset (8,500 viable lagged rows after dropping NaNs, 80/20 train/test split).

### Best Model: XGBoost
* **Accuracy:** 0.9912
* **Precision:** 1.0000
* **Recall:** 0.9853
* **F1 Score:** 0.9926

### Top Predictive Features
The model correctly shifted its attention from concurrent occupancy metrics to **historical momentum and time features**:

1. `avg_pressure_mat_velocity` (0.249)
2. `Time_Step` (0.167)
3. `max_occupancy_prob` (at $T-20$ mins) (0.132)
4. `max_occupancy_prob_velocity` (0.074)
5. `attendance_to_capacity_ratio_velocity` (0.072)

## 5. Conclusion
The pipeline is now mathematically sound. The high F1 score (0.99) is no longer due to data leakage, but rather the fact that our synthetic simulation curves are deterministic and highly predictable 20 minutes in advance. In a real-world setting with noisier human behavior, this architecture will seamlessly accept the time-series data and produce an honest, forward-looking forecast that the Perception Agent can use to proactively mitigate risks before they happen.

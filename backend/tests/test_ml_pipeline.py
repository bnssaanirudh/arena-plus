"""
Tests for the ML Pipeline
===========================
Tests synthetic data generation, model training, and prediction.
"""

import os
import sys
import pytest
import pandas as pd
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestSyntheticDataGeneration:
    """Tests for the synthetic data generator."""

    def setup_method(self):
        # Data is at project root: arena-plus/data/synthetic/
        self.synthetic_dir = Path(__file__).resolve().parents[2] / "data" / "synthetic"

    def test_synthetic_dir_exists(self):
        """Synthetic data directory should exist after generation."""
        assert self.synthetic_dir.exists(), f"Synthetic dir not found: {self.synthetic_dir}"

    def test_events_csv_exists(self):
        """events.csv should be generated."""
        assert (self.synthetic_dir / "events.csv").exists()

    def test_seat_clusters_csv_exists(self):
        """seat_clusters.csv should be generated."""
        assert (self.synthetic_dir / "seat_clusters.csv").exists()

    def test_movement_edges_csv_exists(self):
        """movement_edges.csv should be generated."""
        assert (self.synthetic_dir / "movement_edges.csv").exists()

    def test_training_features_csv_exists(self):
        """training_features.csv should be generated."""
        assert (self.synthetic_dir / "training_features.csv").exists()

    def test_events_row_count(self):
        """events.csv should have ~10,000 rows."""
        df = pd.read_csv(self.synthetic_dir / "events.csv")
        assert len(df) == 10_000, f"Expected 10000 events, got {len(df)}"

    def test_events_columns(self):
        """events.csv should have the expected columns."""
        df = pd.read_csv(self.synthetic_dir / "events.csv")
        expected_cols = {
            "Event_ID", "Timestamp", "Gate_ID", "Ticket_Class",
            "Total_Attendance", "Zone_Attendance"
        }
        assert expected_cols.issubset(set(df.columns)), \
            f"Missing columns: {expected_cols - set(df.columns)}"

    def test_seat_clusters_row_count(self):
        """seat_clusters.csv should have 50 × 10,000 = 500,000 rows."""
        df = pd.read_csv(self.synthetic_dir / "seat_clusters.csv")
        assert len(df) == 500_000, f"Expected 500000 rows, got {len(df)}"

    def test_seat_clusters_columns(self):
        """seat_clusters.csv should have sensor columns."""
        df = pd.read_csv(self.synthetic_dir / "seat_clusters.csv")
        expected_cols = {
            "Event_ID", "Seat_ID", "People_Count", "Turnstile_Count",
            "BLE_Pings", "Pressure_Mat_Activations", "Zone_Capacity"
        }
        assert expected_cols.issubset(set(df.columns))

    def test_training_features_has_surge_label(self):
        """training_features.csv should contain the surge_label column."""
        df = pd.read_csv(self.synthetic_dir / "training_features.csv")
        assert "surge_label" in df.columns

    def test_training_features_surge_distribution(self):
        """Surge events should be approx 40-70% of total due to temporal expansion."""
        df = pd.read_csv(self.synthetic_dir / "training_features.csv")
        surge_pct = df["surge_label"].mean()
        assert 0.40 <= surge_pct <= 0.70, \
            f"Surge percentage {surge_pct:.1%} is outside expected range [40%-70%]"


class TestModelTraining:
    """Tests for the trained model."""

    def setup_method(self):
        # Models are at project root: arena-plus/models/
        self.models_dir = Path(__file__).resolve().parents[2] / "models"

    def test_model_file_exists(self):
        """Trained model file should exist."""
        assert (self.models_dir / "surge_predictor.joblib").exists()

    def test_feature_importance_exists(self):
        """Feature importance CSV should exist."""
        assert (self.models_dir / "feature_importance.csv").exists()

    def test_evaluation_report_exists(self):
        """Evaluation report should exist."""
        assert (self.models_dir / "evaluation_report.txt").exists()

    def test_model_loads_correctly(self):
        """Model should load and have expected structure."""
        import joblib
        bundle = joblib.load(self.models_dir / "surge_predictor.joblib")
        assert "model" in bundle
        assert "model_name" in bundle
        assert "feature_names" in bundle
        assert "f1_score" in bundle
        assert bundle["f1_score"] > 0.8, \
            f"F1 score {bundle['f1_score']} is too low"


class TestPredictor:
    """Tests for the runtime predictor service."""

    def test_predict_surge_returns_valid_structure(self):
        """predict_surge should return risk_level, probability, model_used."""
        from app.ml.predictor import surge_predictor

        result = surge_predictor.predict_surge({
            "density_score": 5.0,
            "avg_occupancy_prob": 0.3,
        })
        assert "risk_level" in result
        assert "probability" in result
        assert "model_used" in result

    def test_predict_surge_probability_range(self):
        """Probability should be between 0 and 1."""
        from app.ml.predictor import surge_predictor

        result = surge_predictor.predict_surge({
            "density_score": 8.0,
            "avg_occupancy_prob": 0.9,
        })
        assert 0.0 <= result["probability"] <= 1.0

    def test_predict_surge_valid_risk_levels(self):
        """Risk level should be one of the expected values."""
        from app.ml.predictor import surge_predictor

        valid_levels = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        result = surge_predictor.predict_surge({
            "density_score": 3.0,
        })
        assert result["risk_level"] in valid_levels

"""
ArenaPulse ML Pre-filter
=========================
Fast triage layer that converts raw telemetry into a risk context signal.
The signal is fed to the Gemini reasoning layer (PerceptionAgent Stage 2)
rather than used as a final prediction.

**Why "pre-filter" and not "predictor"?**
The trained model (XGBoost/RF) expects 53 archival time-series features.
Live simulator events carry only 4 fields (event_type, location,
density_score, predicted_people), so runtime feature coverage is always
< 20 % and the model auto-falls back to the density heuristic.  The
heuristic is the honest runtime path; the trained model is an accurate
offline artifact that becomes more useful if richer telemetry (historical
lagged features) is ever wired up.  Either way, this module's job is to
produce a fast first-pass risk estimate — *not* to be the final answer.
The Gemini perception layer takes this signal and performs the real
multi-factor reasoning.
"""

from pathlib import Path
from typing import Dict, Any, Optional

import numpy as np
from loguru import logger

try:
    import joblib
except ImportError:
    from sklearn.externals import joblib  # type: ignore


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
DEFAULT_MODEL_PATH = MODELS_DIR / "surge_predictor.joblib"

# ---------------------------------------------------------------------------
# Telemetry → model feature adapter
# ---------------------------------------------------------------------------
# The trained model expects 53 archival/historical features. Live simulator
# events only carry: event_type, location, density_score, predicted_people.
# This map gives the best-effort approximation for each model feature.
# Features not listed stay at 0 (their default).
_TELEMETRY_FEATURE_MAP: Dict[str, Any] = {
    # density_score (0-10) is the closest proxy for occupancy/pressure metrics
    "max_occupancy_prob":  lambda e: e.get("density_score", 0) / 10.0,
    "avg_occupancy_prob":  lambda e: e.get("density_score", 0) / 10.0,
    "avg_pressure_mat":    lambda e: e.get("density_score", 0) / 10.0,
    "avg_congestion":      lambda e: e.get("density_score", 0) / 10.0,
    "max_congestion":      lambda e: e.get("density_score", 0) / 10.0,
    # high_congestion_ratio: fraction of zone above threshold (approx)
    "high_congestion_ratio": lambda e: max(0.0, (e.get("density_score", 0) - 5.0) / 5.0),
    # crowd volume
    "avg_people":      lambda e: float(e.get("predicted_people", 0)),
    "max_people":      lambda e: float(e.get("predicted_people", 0)),
    "Total_Attendance": lambda e: float(e.get("predicted_people", 0)),
    "Zone_Attendance":  lambda e: float(e.get("predicted_people", 0)) * 0.15,
}

# If fewer than this fraction of FEATURE IMPORTANCE is covered by the adapter,
# skip the model and use the heuristic (it's more accurate than all-zeros ML).
_MIN_COVERAGE_THRESHOLD = 0.20


class SurgePredictor:
    """
    Fast triage pre-filter for the Perception pipeline.

    Produces a quick risk-level + probability estimate from raw telemetry so
    the Gemini reasoning layer has a structured starting point.  The output
    is *context for Gemini*, not a final answer.

    Two internal paths:
      A. Trained model  — used when feature coverage ≥ 20 % (offline evaluation,
                          richer future telemetry)
      B. Density heuristic — the honest runtime path today; live events give
                             < 20 % coverage of the 53 model features
    Either path returns the same dict shape so callers are unaffected.
    """

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.model = None
        self.model_name: str = "heuristic_fallback"
        self.feature_names: list = []
        self._loaded = False
        self._load_model()

    def _load_model(self):
        """Attempt to load the model from disk."""
        if not self.model_path.exists():
            logger.warning(
                f"No trained model found at {self.model_path}. "
                "Using heuristic fallback."
            )
            return

        try:
            bundle = joblib.load(self.model_path)
            self.model = bundle["model"]
            self.model_name = bundle.get("model_name", "unknown")
            self.feature_names = bundle.get("feature_names", [])
            self._loaded = True
            logger.info(
                f"Loaded surge predictor: {self.model_name} "
                f"({len(self.feature_names)} features, "
                f"F1={bundle.get('f1_score', 'N/A')})"
            )
        except Exception as e:
            logger.error(f"Failed to load model: {e}. Using heuristic fallback.")

    def _adapt_telemetry(self, event: Dict[str, Any]) -> tuple[Dict[str, Any], float]:
        """
        Map a live telemetry event to the model's feature space.
        Returns (adapted_features, coverage_ratio) where coverage_ratio is
        the fraction of total feature importance that got a real value.
        """
        adapted = dict(event)  # start with raw fields (passthrough for any matching keys)

        for feat, fn in _TELEMETRY_FEATURE_MAP.items():
            try:
                adapted[feat] = fn(event)
            except Exception:
                pass  # leave at 0

        # Estimate coverage: count model features that got a non-zero value
        non_zero = sum(1 for f in self.feature_names if adapted.get(f, 0) != 0)
        coverage = non_zero / len(self.feature_names) if self.feature_names else 0.0
        return adapted, coverage

    def predict_surge(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the fast pre-filter on a raw telemetry event.

        Accepts the raw live telemetry event dict (density_score, predicted_people,
        event_type, location). Internally adapts it to the model's feature space
        and falls back to the density heuristic when coverage is too low (< 20 %,
        which is always the case for today's simulator events).

        The returned dict is used as *context* by PerceptionAgent before passing
        to Gemini — not as the final risk verdict.

        Returns
        -------
        dict with:
            - risk_level  : str   (LOW, MEDIUM, HIGH, CRITICAL) — fast estimate
            - probability : float (0-1, surge likelihood)
            - model_used  : str   ("heuristic_fallback" at runtime; trained model
                                   name if feature coverage is ever ≥ 20 %)
        """
        if not self._loaded or self.model is None:
            return self._heuristic_fallback(features)

        adapted, coverage = self._adapt_telemetry(features)

        if coverage < _MIN_COVERAGE_THRESHOLD:
            logger.warning(
                f"Feature coverage {coverage:.0%} below threshold "
                f"({_MIN_COVERAGE_THRESHOLD:.0%}) — using heuristic fallback."
            )
            return self._heuristic_fallback(features)

        try:
            # Build feature vector in the correct order using adapted fields
            X = np.array([[adapted.get(f, 0) for f in self.feature_names]])

            # Get probability (class 1 = surge)
            if hasattr(self.model, "predict_proba"):
                proba = self.model.predict_proba(X)[0]
                surge_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
            else:
                pred = self.model.predict(X)[0]
                surge_prob = float(pred)

            risk_level = self._prob_to_risk(surge_prob)
            logger.debug(
                f"ML prediction: {risk_level} ({surge_prob:.1%}) "
                f"| feature coverage {coverage:.0%}"
            )
            return {
                "risk_level": risk_level,
                "probability": round(surge_prob, 4),
                "model_used": self.model_name,
            }
        except Exception as e:
            logger.error(f"Prediction error: {e}. Falling back to heuristic.")
            return self._heuristic_fallback(features)

    @staticmethod
    def _prob_to_risk(prob: float) -> str:
        """Map a surge probability to a human-readable risk level."""
        if prob >= 0.85:
            return "CRITICAL"
        elif prob >= 0.60:
            return "HIGH"
        elif prob >= 0.35:
            return "MEDIUM"
        else:
            return "LOW"

    @staticmethod
    def _heuristic_fallback(features: Dict[str, Any]) -> Dict[str, Any]:
        """Simple rule-based fallback when no model is available."""
        density = features.get("density_score", 0)
        avg_occupancy = features.get("avg_occupancy_prob", 0)

        score = max(density / 10.0, avg_occupancy)

        if score > 0.9:
            risk = "CRITICAL"
        elif score > 0.75:
            risk = "HIGH"
        elif score > 0.5:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        return {
            "risk_level": risk,
            "probability": round(score, 4),
            "model_used": "heuristic_fallback",
        }


# Singleton instance
surge_predictor = SurgePredictor()

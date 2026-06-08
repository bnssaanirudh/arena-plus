"""
ArenaPulse ML Model Training
==============================
Loads the synthetic training_features.csv, performs feature engineering,
and trains XGBoost + RandomForest classifiers for crowd surge prediction.

Saves:
  - backend/models/surge_predictor.joblib        (best model)
  - backend/models/feature_importance.csv        (feature rankings)
  - backend/models/evaluation_report.txt         (metrics)
"""

import os
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)

try:
    import joblib
except ImportError:
    from sklearn.externals import joblib  # type: ignore

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️  xgboost not installed – falling back to sklearn GradientBoosting")


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[3]  # backend/
SYNTHETIC_DIR = PROJECT_ROOT / "data" / "synthetic"
MODELS_DIR = PROJECT_ROOT / "models"

TRAINING_FILE = SYNTHETIC_DIR / "training_features.csv"
MODEL_PATH = MODELS_DIR / "surge_predictor.joblib"
IMPORTANCE_PATH = MODELS_DIR / "feature_importance.csv"
REPORT_PATH = MODELS_DIR / "evaluation_report.txt"


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------
TARGET_COLUMN = "surge_label"

def load_and_prepare() -> tuple:
    """Load training features and split into X, y."""
    print(f"Loading training data from: {TRAINING_FILE}")
    df = pd.read_csv(TRAINING_FILE)

    available_features = [c for c in df.columns if c != TARGET_COLUMN]

    X = df[available_features].fillna(0)
    y = df[TARGET_COLUMN]

    print(f"  Features: {X.shape[1]}, Samples: {X.shape[0]}")
    print(f"  Surge distribution: {y.value_counts().to_dict()}")

    return X, y, available_features


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------
def train_and_evaluate():
    X, y, feature_names = load_and_prepare()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n  Train: {len(X_train)}, Test: {len(X_test)}")

    models = {}

    # XGBoost (or GradientBoosting fallback)
    if HAS_XGBOOST:
        xgb = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="logloss",
            use_label_encoder=False,
        )
        print("\n[Training] XGBoost...")
        xgb.fit(X_train, y_train)
        models["XGBoost"] = xgb
    else:
        gb = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42,
        )
        print("\n[Training] GradientBoosting (XGBoost fallback)...")
        gb.fit(X_train, y_train)
        models["GradientBoosting"] = gb

    # RandomForest
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
    )
    print("[Training] RandomForest...")
    rf.fit(X_train, y_train)
    models["RandomForest"] = rf

    # Evaluate all
    report_lines = []
    best_model_name = None
    best_f1 = -1

    for name, model in models.items():
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        cm = confusion_matrix(y_test, y_pred)

        print(f"\n--- {name} ---")
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1 Score:  {f1:.4f}")
        print(f"  Confusion Matrix:\n{cm}")

        report_lines.append(f"=== {name} ===")
        report_lines.append(f"Accuracy:  {acc:.4f}")
        report_lines.append(f"Precision: {prec:.4f}")
        report_lines.append(f"Recall:    {rec:.4f}")
        report_lines.append(f"F1 Score:  {f1:.4f}")
        report_lines.append(f"Confusion Matrix:\n{cm}\n")
        report_lines.append(classification_report(y_test, y_pred, zero_division=0))
        report_lines.append("")

        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name

    # Save best model
    best_model = models[best_model_name]
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump({
        "model": best_model,
        "model_name": best_model_name,
        "feature_names": feature_names,
        "f1_score": best_f1,
    }, MODEL_PATH)
    print(f"\n✅ Best model saved: {best_model_name} (F1={best_f1:.4f})")
    print(f"   Path: {MODEL_PATH}")

    # Save feature importance
    importances = best_model.feature_importances_
    importance_df = pd.DataFrame({
        "feature": feature_names,
        "importance": importances
    }).sort_values("importance", ascending=False)
    importance_df.to_csv(IMPORTANCE_PATH, index=False)
    print(f"\n📊 Feature importance saved to: {IMPORTANCE_PATH}")
    print(importance_df.head(10).to_string(index=False))

    # Save evaluation report
    with open(REPORT_PATH, "w") as f:
        f.write(f"Best Model: {best_model_name} (F1={best_f1:.4f})\n\n")
        f.write("\n".join(report_lines))
    print(f"\n📄 Full evaluation report saved to: {REPORT_PATH}")


def main():
    print("=" * 60)
    print("ArenaPulse ML Model Training")
    print("=" * 60)
    train_and_evaluate()
    print(f"\n{'=' * 60}")
    print("Training complete!")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()

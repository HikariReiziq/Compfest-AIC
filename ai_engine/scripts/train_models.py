"""Model Training & Anthropometric Calibration Script.

1. Trains Random Forest Classifier on Face Shape Geometric Dataset (5,000 samples)
2. Calibrates empirical anthropometric ratio distributions from ANSUR II (6,000+ records)
3. Exports weights to ai_engine/models/weights/
"""

import os
import sys
import json
import time
import csv
import numpy as np

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    import joblib
except ImportError:
    print("scikit-learn or joblib not installed in environment.")
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
WEIGHTS_DIR = os.path.join(BASE_DIR, "models", "weights")

os.makedirs(WEIGHTS_DIR, exist_ok=True)


def train_face_shape_random_forest():
    """Trains a Random Forest classifier on 5,000 geometric landmark ratio samples."""
    csv_path = os.path.join(DATA_RAW_DIR, "face_shapes_5k.csv")
    print(f"\n--- [1/2] Training Face Shape Random Forest from {csv_path} ---")
    start_time = time.time()

    # Load data
    features = []
    labels = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            features.append([float(x) for x in row[:4]])
            labels.append(row[4])

    X = np.array(features)
    y = np.array(labels)

    # 80/20 train test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # Train Random Forest (n_estimators=100, n_jobs=-1 utilizing all 32 logical CPU threads)
    rf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)

    y_pred = rf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    elapsed = time.time() - start_time

    print(f"Training completed in {elapsed:.3f}s on local multi-threaded CPU.")
    print(f"Test Accuracy: {accuracy * 100:.2f}%")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))

    # Save trained model artifact (< 5MB)
    output_weight_path = os.path.join(WEIGHTS_DIR, "face_shape_rf.joblib")
    joblib.dump(rf, output_weight_path, compress=3)
    file_size_kb = os.path.getsize(output_weight_path) / 1024
    print(f"Model weight saved to {output_weight_path} (Size: {file_size_kb:.1f} KB)")


def calibrate_ansur2_thresholds():
    """Computes empirical percentiles and thresholds from 6,000 ANSUR II subjects."""
    csv_path = os.path.join(DATA_RAW_DIR, "ansur2_anthropometry.csv")
    print(f"\n--- [2/2] Calibrating ANSUR II Anthropometric Thresholds from {csv_path} ---")

    sh_hip_ratios = []
    w_hip_ratios = []

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            sh_hip_ratios.append(float(row[5]))
            w_hip_ratios.append(float(row[6]))

    sh_hip = np.array(sh_hip_ratios)
    w_hip = np.array(w_hip_ratios)

    percentiles = {
        "dataset_name": "US Army ANSUR II Anthropometry Ground Truth",
        "sample_count": len(sh_hip),
        "shoulder_to_hip": {
            "p5": round(float(np.percentile(sh_hip, 5)), 3),
            "p25": round(float(np.percentile(sh_hip, 25)), 3),
            "p50": round(float(np.percentile(sh_hip, 50)), 3),
            "p75": round(float(np.percentile(sh_hip, 75)), 3),
            "p95": round(float(np.percentile(sh_hip, 95)), 3),
        },
        "waist_to_hip": {
            "p5": round(float(np.percentile(w_hip, 5)), 3),
            "p25": round(float(np.percentile(w_hip, 25)), 3),
            "p50": round(float(np.percentile(w_hip, 50)), 3),
            "p75": round(float(np.percentile(w_hip, 75)), 3),
            "p95": round(float(np.percentile(w_hip, 95)), 3),
        },
        "shape_decision_boundaries": {
            "Inverted_Triangle": {"min_shoulder_hip": round(float(np.percentile(sh_hip, 80)), 3)},
            "Pear": {"max_shoulder_hip": round(float(np.percentile(sh_hip, 20)), 3)},
            "Hourglass": {
                "min_shoulder_hip": round(float(np.percentile(sh_hip, 30)), 3),
                "max_shoulder_hip": round(float(np.percentile(sh_hip, 70)), 3),
                "max_waist_hip": round(float(np.percentile(w_hip, 25)), 3),
            },
            "Rectangle": {
                "min_shoulder_hip": round(float(np.percentile(sh_hip, 30)), 3),
                "max_shoulder_hip": round(float(np.percentile(sh_hip, 70)), 3),
                "min_waist_hip": round(float(np.percentile(w_hip, 30)), 3),
                "max_waist_hip": round(float(np.percentile(w_hip, 75)), 3),
            },
            "Apple": {"min_waist_hip": round(float(np.percentile(w_hip, 80)), 3)},
        }
    }

    output_threshold_path = os.path.join(WEIGHTS_DIR, "ansur_thresholds.json")
    with open(output_threshold_path, "w", encoding="utf-8") as f:
        json.dump(percentiles, f, indent=2)

    print(f"ANSUR II calibrated thresholds saved to {output_threshold_path}")
    print(f"Shoulder-to-Hip Medians (P50): {percentiles['shoulder_to_hip']['p50']}")
    print(f"Waist-to-Hip Medians (P50): {percentiles['waist_to_hip']['p50']}")


if __name__ == "__main__":
    print("=== COBA LOCAL MACHINE TRAINING & CALIBRATION PIPELINE ===")
    train_face_shape_random_forest()
    calibrate_ansur2_thresholds()
    print("=== MODEL WEIGHTS EXPORTED SUCCESSFULLY ===")

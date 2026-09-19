import sys
import json
import joblib
import numpy as np
import os

LABELS = {0: "Low", 1: "Moderate", 2: "High", 3: "Extreme"}

def predict(co, ch4, temp, hum, wind_speed):
    model_path = os.path.join(os.path.dirname(__file__), "model.pkl")

    if not os.path.exists(model_path):
        return {
            "error": "model.pkl tidak ditemukan, run train.py dahulu"
        }

    model = joblib.load(model_path)

    # [co, ch4, temp, hum, wind_speed]
    X = np.array([[co, ch4, temp, hum, wind_speed]])

    label_idx = int(model.predict(X)[0])
    proba     = model.predict_proba(X)[0]

    return {
        "ml_prediction":  LABELS[label_idx],
        "ml_label_idx":   label_idx,
        "ml_confidence":  round(float(proba[label_idx]) * 100, 1),
        "ml_proba": {
            "Low":      round(float(proba[0]) * 100, 1),
            "Moderate": round(float(proba[1]) * 100, 1),
            "High":     round(float(proba[2]) * 100, 1),
            "Extreme":  round(float(proba[3]) * 100, 1)
        }
    }

if __name__ == "__main__":
    try:
        raw    = sys.stdin.read().strip()
        data   = json.loads(raw)
        result = predict(
            co         = float(data["co"]),
            ch4        = float(data["ch4"]),
            temp       = float(data["temp"]),
            hum        = float(data["hum"]),
            wind_speed = float(data["wind_speed"])
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
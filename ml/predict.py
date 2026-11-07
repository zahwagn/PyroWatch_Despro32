
import json
import os
import math
import joblib
import numpy as np

from pathlib import Path
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "forecast_models.pkl"

HOST = "0.0.0.0"
PORT = 5000

bundle = None


# ============================================================
# MODEL LOADING
# ============================================================

def load_model():
    global bundle

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model belum tersedia: {MODEL_PATH}. "
            "Jalankan train.py terlebih dahulu."
        )

    bundle = joblib.load(MODEL_PATH)

    print(
        "Model loaded:",
        bundle.get("model_version")
    )

    print(
        "Forecast horizon:",
        bundle.get("horizon_minutes"),
        "minutes"
    )

    print(
        "Features:",
        bundle.get("feature_columns")
    )


# ============================================================
# FEATURE ENGINEERING
# ============================================================

def safe_float(value):
    try:
        if value is None or value == "":
            return np.nan

        result = float(value)

        if not np.isfinite(result):
            return np.nan

        return result

    except (TypeError, ValueError):
        return np.nan


def build_input_features(data):

    timestamp_value = data.get("timestamp")

    if timestamp_value:
        timestamp = datetime.fromisoformat(
            str(timestamp_value).replace("Z", "+00:00")
        )

        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

    else:
        timestamp = datetime.now(timezone.utc)

    timestamp = timestamp.astimezone(timezone.utc)

    hour = (
        timestamp.hour
        + timestamp.minute / 60.0
    )

    # Open-Meteo meteorological wind direction.
    direction = safe_float(
        data.get("wind_direction_deg")
    )

    if np.isfinite(direction):
        radians = math.radians(direction)

        direction_sin = math.sin(radians)
        direction_cos = math.cos(radians)

    else:
        direction_sin = np.nan
        direction_cos = np.nan

    # ESP32 local anemometer.
    wind_sensor = safe_float(
        data.get("wind_speed_sensor")
    )

    # Compatibility with old payload.
    if not np.isfinite(wind_sensor):
        wind_sensor = safe_float(
            data.get("wind_speed")
        )

    features = {

        "co": safe_float(data.get("co")),

        "ch4": safe_float(data.get("ch4")),

        "temp": safe_float(data.get("temp")),

        "hum": safe_float(data.get("hum")),

        "fri": safe_float(data.get("fri")),

        "wind_speed_sensor": wind_sensor,

        # Open-Meteo remains separate from ESP32.
        "wind_speed_weather": safe_float(
            data.get("wind_speed_weather")
        ),

        "wind_direction_sin": direction_sin,

        "wind_direction_cos": direction_cos,

        "hour_sin": math.sin(
            2 * math.pi * hour / 24
        ),

        "hour_cos": math.cos(
            2 * math.pi * hour / 24
        ),

        # Compatibility for an older model bundle.
        # New training should not use these features.
        "temp_mean_5m": safe_float(data.get("temp")),
        "hum_mean_5m": safe_float(data.get("hum")),
        "co_mean_5m": safe_float(data.get("co")),
        "ch4_mean_5m": safe_float(data.get("ch4")),
        "wind_sensor_mean_5m": wind_sensor,

        "temp_std_5m": np.nan,
        "hum_std_5m": np.nan
    }

    return features, timestamp


# ============================================================
# PREDICTION HELPERS
# ============================================================

def predict_value(model_key, features):

    model_info = bundle["models"].get(model_key)

    if not model_info:
        return None

    model = model_info["model"]

    columns = bundle["feature_columns"]

    X = np.array(
        [[features.get(col, np.nan) for col in columns]],
        dtype=float
    )

    prediction = float(
        model.predict(X)[0]
    )

    # Random Forest tree variation.
    # This is NOT calibrated probabilistic confidence.
    forest = model.named_steps["random_forest"]

    imputer = model.named_steps["imputer"]

    X_imputed = imputer.transform(X)

    tree_predictions = np.array([
        tree.predict(X_imputed)[0]
        for tree in forest.estimators_
    ])

    lower = float(
        np.percentile(tree_predictions, 10)
    )

    upper = float(
        np.percentile(tree_predictions, 90)
    )

    return {
        "value": prediction,
        "lower": lower,
        "upper": upper,
        "tree_std": float(
            np.std(tree_predictions)
        )
    }


# ============================================================
# FRI CLASSIFICATION
# ============================================================

def classify_fri(value):

    if value is None or not np.isfinite(value):
        return "UNKNOWN"

    # Must match the original Node-RED FRI function.
    if value < 0.4:
        return "Low"

    elif value <= 0.6:
        return "Moderate"

    elif value <= 0.8:
        return "High"

    else:
        return "Extreme"


def build_fri_result(fri_result):

    if fri_result is None:
        return {
            "value": None,
            "level": "UNKNOWN",
            "range": None
        }

    # FRI uses the original 0-1 scale.
    value = float(
        np.clip(fri_result["value"], 0.0, 1.0)
    )

    lower = float(
        np.clip(fri_result["lower"], 0.0, 1.0)
    )

    upper = float(
        np.clip(fri_result["upper"], 0.0, 1.0)
    )

    lower, upper = sorted([lower, upper])

    return {
        "value": value,
        "level": classify_fri(value),
        "range": f"{lower:.3f} - {upper:.3f}"
    }


# ============================================================
# WIND DIRECTION
# ============================================================

def compass_direction(degrees):

    directions = [
        "N",
        "NE",
        "E",
        "SE",
        "S",
        "SW",
        "W",
        "NW"
    ]

    index = int(
        round((degrees % 360) / 45)
    ) % 8

    return directions[index]


# ============================================================
# MAIN FORECAST
# ============================================================

def predict_forecast(data):

    if bundle is None:
        raise RuntimeError("Model belum dimuat.")

    features, sample_time = build_input_features(data)

    # --------------------------------------------------------
    # FUTURE FRI
    # --------------------------------------------------------

    fri_result = predict_value(
        "future_fri",
        features
    )

    fri_forecast = build_fri_result(
        fri_result
    )

    future_fri = fri_forecast["value"]

    future_fri_level = fri_forecast["level"]

    future_fri_range = fri_forecast["range"]

    # --------------------------------------------------------
    # FUTURE WIND SPEED
    # --------------------------------------------------------

    wind_result = predict_value(
        "future_wind_speed",
        features
    )

    future_wind_speed = None
    future_wind_range = None

    if wind_result is not None:

        future_wind_speed = max(
            0.0,
            wind_result["value"]
        )

        wind_lower = max(
            0.0,
            wind_result["lower"]
        )

        wind_upper = max(
            0.0,
            wind_result["upper"]
        )

        wind_lower, wind_upper = sorted(
            [wind_lower, wind_upper]
        )

        future_wind_range = (
            f"{wind_lower:.2f} - {wind_upper:.2f}"
        )

    # --------------------------------------------------------
    # FUTURE METEOROLOGICAL WIND DIRECTION
    # --------------------------------------------------------

    direction_sin_result = predict_value(
        "future_wind_dir_sin",
        features
    )

    direction_cos_result = predict_value(
        "future_wind_dir_cos",
        features
    )

    future_wind_direction = None

    if (
        direction_sin_result is not None
        and direction_cos_result is not None
    ):

        sin_value = direction_sin_result["value"]

        cos_value = direction_cos_result["value"]

        degrees = (
            math.degrees(
                math.atan2(sin_value, cos_value)
            ) + 360
        ) % 360

        future_wind_direction = compass_direction(
            degrees
        )

    # --------------------------------------------------------
    # FORECAST TIMESTAMP
    # --------------------------------------------------------

    horizon = int(
        bundle["horizon_minutes"]
    )

    forecast_time = sample_time + timedelta(
        minutes=horizon
    )

    # --------------------------------------------------------
    # FORECAST STATUS
    # --------------------------------------------------------

    available_outputs = [
        fri_result,
        wind_result,
        direction_sin_result,
        direction_cos_result
    ]

    available_count = sum(
        item is not None
        for item in available_outputs
    )

    if available_count >= 2:
        status = "OK"

    elif available_count > 0:
        status = "PARTIAL"

    else:
        status = "MODEL_UNAVAILABLE"

    # --------------------------------------------------------
    # CURRENT FRI
    # --------------------------------------------------------

    current_fri = safe_float(
        data.get("fri")
    )

    current_fri_value = (
        float(np.clip(current_fri, 0.0, 1.0))
        if np.isfinite(current_fri)
        else None
    )

    # --------------------------------------------------------
    # INTERPRETATION
    # --------------------------------------------------------

    interpretation = (
        f"Prediksi kondisi {horizon} menit ke depan. "
        f"FRI saat ini: "
        f"{current_fri_value if current_fri_value is not None else 'tidak tersedia'}. "
        f"FRI prediksi: "
        f"{future_fri if future_fri is not None else 'tidak tersedia'}. "
        f"Level risiko prediksi: {future_fri_level}. "
        "Prediksi merupakan estimasi model dari data historis, "
        "bukan kepastian terjadinya kebakaran."
    )

    # --------------------------------------------------------
    # FINAL RESPONSE
    # --------------------------------------------------------

    return {

        "forecast_status": status,

        "forecast_horizon_minutes": horizon,

        "node_id": data.get("node_id"),

        "sample_timestamp": sample_time.isoformat(),

        "forecast_timestamp": forecast_time.isoformat(),

        # CURRENT FRI
        "current_fri": current_fri_value,

        # FUTURE FRI
        "future_fri": future_fri,

        "future_fri_level": future_fri_level,

        "future_fri_range": future_fri_range,

        # FUTURE WIND SPEED
        "future_wind_speed": future_wind_speed,

        "future_wind_speed_range": future_wind_range,

        "future_wind_speed_source": "ESP32_ANEMOMETER",

        # FUTURE WIND DIRECTION
        "future_wind_direction": future_wind_direction,

        "future_wind_direction_source": "OPEN_METEO",

        # FIRE SPREAD
        # No validated observed labels available yet.
        "future_spread_rate_range": None,

        "future_spread_direction": None,

        "spread_direction_probability": None,

        "spread_forecast_status": (
            "INSUFFICIENT_OBSERVED_LABELS"
        ),

        # CONFIDENCE
        "forecast_confidence": None,

        "confidence_note": (
            "Belum dikalibrasi sebagai probabilitas. "
            "Rentang prediksi berasal dari variasi antar-tree "
            "Random Forest dan bukan interval prediksi terkalibrasi."
        ),

        # INTERPRETATION
        "forecast_interpretation": interpretation,

        "forecast_model_version": bundle.get(
            "model_version",
            "unknown"
        )
    }


# ============================================================
# HTTP API
# ============================================================

class PredictionHandler(BaseHTTPRequestHandler):

    def send_json(self, status_code, payload):

        response = json.dumps(
            payload,
            allow_nan=False
        ).encode("utf-8")

        self.send_response(status_code)

        self.send_header(
            "Content-Type",
            "application/json"
        )

        self.send_header(
            "Content-Length",
            str(len(response))
        )

        self.end_headers()

        self.wfile.write(response)

    def do_GET(self):

        if self.path == "/health":

            self.send_json(
                200,
                {
                    "status": "OK",
                    "model_loaded": bundle is not None,
                    "model_version": (
                        bundle.get("model_version")
                        if bundle else None
                    ),
                    "forecast_horizon_minutes": (
                        bundle.get("horizon_minutes")
                        if bundle else None
                    )
                }
            )

            return

        self.send_json(
            404,
            {
                "error": "Endpoint not found"
            }
        )

    def do_POST(self):

        if self.path != "/predict-forecast":

            self.send_json(
                404,
                {
                    "error": "Endpoint not found"
                }
            )

            return

        try:

            content_length = int(
                self.headers.get(
                    "Content-Length",
                    "0"
                )
            )

            if content_length <= 0 or content_length > 1_000_000:

                self.send_json(
                    400,
                    {
                        "error": "Invalid request body size"
                    }
                )

                return

            body = self.rfile.read(
                content_length
            )

            data = json.loads(
                body.decode("utf-8")
            )

            if not isinstance(data, dict):

                raise ValueError(
                    "Request harus berupa JSON object."
                )

            result = predict_forecast(data)

            self.send_json(
                200,
                result
            )

        except Exception as error:

            self.send_json(
                500,
                {
                    "forecast_status": "ERROR",
                    "error": str(error)
                }
            )

    def log_message(self, format, *args):

        print(
            "[ML API]",
            format % args
        )


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    load_model()

    server = ThreadingHTTPServer(
        (HOST, PORT),
        PredictionHandler
    )

    print(
        f"PyroWatch ML API berjalan di port {PORT}"
    )

    print(
        f"Forecast horizon: {bundle['horizon_minutes']} menit"
    )

    server.serve_forever()

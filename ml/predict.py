import json
import math
import joblib
import numpy as np

from pathlib import Path
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "forecast_models.pkl"

HOST = "0.0.0.0"
PORT = 5000

bundle = None


# ============================================================
# LOAD MODEL
# ============================================================

def load_model():
    global bundle

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model belum tersedia: {MODEL_PATH}. Jalankan train.py."
        )

    bundle = joblib.load(MODEL_PATH)

    print("Model loaded:", bundle.get("model_version"))
    print("Forecast horizon:", bundle.get("horizon_minutes"), "minutes")
    print("Features:", bundle.get("feature_columns"))


# ============================================================
# DATA UTILITIES
# ============================================================

def safe_float(value):
    try:
        if value is None or value == "":
            return np.nan

        value = float(value)

        return value if np.isfinite(value) else np.nan

    except (TypeError, ValueError):
        return np.nan


def get_timestamp(data):
    value = data.get("timestamp")

    if value:
        stamp = datetime.fromisoformat(
            str(value).replace("Z", "+00:00")
        )

        if stamp.tzinfo is None:
            stamp = stamp.replace(tzinfo=timezone.utc)

        return stamp.astimezone(timezone.utc)

    return datetime.now(timezone.utc)


# ============================================================
# FEATURE ENGINEERING
# ============================================================

def build_input_features(data, timestamp):

    wind = safe_float(
        data.get(
            "wind_speed_sensor",
            data.get("wind_speed")
        )
    )

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

    hour = timestamp.hour + timestamp.minute / 60.0

    return {

        "co": safe_float(data.get("co")),
        "ch4": safe_float(data.get("ch4")),

        "temp": safe_float(data.get("temp")),
        "hum": safe_float(data.get("hum")),

        "fri": safe_float(data.get("fri")),

        "wind_speed_sensor": wind,

        "spread_rate_cmph": safe_float(
            data.get("spread_rate_cmph")
        ),

        "wind_direction_sin": direction_sin,
        "wind_direction_cos": direction_cos,

        "hour_sin": math.sin(
            2 * math.pi * hour / 24
        ),

        "hour_cos": math.cos(
            2 * math.pi * hour / 24
        ),

        # Kompatibilitas model lama
        "wind_speed_weather": np.nan,

        "temp_mean_5m": safe_float(data.get("temp")),
        "hum_mean_5m": safe_float(data.get("hum")),
        "co_mean_5m": safe_float(data.get("co")),
        "ch4_mean_5m": safe_float(data.get("ch4")),

        "wind_sensor_mean_5m": wind,

        "temp_std_5m": np.nan,
        "hum_std_5m": np.nan
    }


# ============================================================
# MODEL PREDICTION
# ============================================================

def predict_value(model_key, features):

    info = bundle.get("models", {}).get(model_key)

    if not info:
        return None

    columns = bundle["feature_columns"]

    row = np.array(
        [[features.get(column, np.nan) for column in columns]],
        dtype=float
    )

    value = float(
        info["model"].predict(row)[0]
    )

    return value if np.isfinite(value) else None


# ============================================================
# FRI CLASSIFICATION
# ============================================================

def classify_fri(value):

    if value is None or not np.isfinite(value):
        return "UNKNOWN"

    if value < 0.4:
        return "Low"

    if value <= 0.6:
        return "Moderate"

    if value <= 0.8:
        return "High"

    return "Extreme"


# ============================================================
# FOUR OPERATIONAL RECOMMENDATIONS
# ============================================================

def build_recommendations(
    risk_level,
    trend,
    data,
    current_spread
):

    risk = str(
        risk_level or "UNKNOWN"
    ).upper()

    direction = str(
        data.get("wind_direction") or "UNKNOWN"
    ).upper()

    wind = safe_float(
        data.get(
            "wind_speed_sensor",
            data.get("wind_speed")
        )
    )

    soil = str(
        data.get("soil_condition") or "Tidak diketahui"
    )

    elevated = (
        risk in ("HIGH", "EXTREME")
        or trend == "RISING"
    )

    moderate = risk == "MODERATE"

    # --------------------------------------------------------
    # HIGH / EXTREME / RISING
    # --------------------------------------------------------

    if elevated:

        monitoring = (
            "Tingkatkan frekuensi pemantauan sensor dan "
            "lakukan verifikasi lapangan pada area sekitar node. "
            "Periksa apakah kenaikan indikator berulang pada "
            "sampel berikutnya."
        )

        early_response = (
            "Siagakan personel serta peralatan pemadaman awal "
            "sesuai SOP dan tingkat kesiapan setempat. "
            "Lakukan tindakan pemadaman hanya setelah indikasi "
            "di lapangan diverifikasi."
        )

        protection = (
            "Identifikasi permukiman, lahan, fasilitas, dan "
            "area rentan di sekitar lokasi pemantauan. "
            "Siapkan langkah perlindungan serta jalur evakuasi "
            "bila kondisi lapangan mengonfirmasi ancaman."
        )

        coordination = (
            "Sampaikan perubahan status kepada koordinator "
            "dan tim lapangan. Pastikan komunikasi, pembagian "
            "tugas, dan prosedur eskalasi berjalan sesuai SOP."
        )

    # --------------------------------------------------------
    # MODERATE
    # --------------------------------------------------------

    elif moderate:

        monitoring = (
            "Perketat pemantauan berkala dan bandingkan "
            "pembacaan sensor dengan sampel sebelumnya. "
            "Verifikasi anomali sebelum menetapkan adanya "
            "kejadian kebakaran."
        )

        early_response = (
            "Periksa kesiapan personel dan peralatan "
            "pemadaman awal. Belum perlu menyimpulkan adanya "
            "kebakaran tanpa konfirmasi kondisi lapangan."
        )

        protection = (
            "Petakan area rentan di sekitar node dan pastikan "
            "informasi akses serta jalur evakuasi tersedia "
            "apabila risiko meningkat."
        )

        coordination = (
            "Laporkan status Moderate kepada petugas terkait "
            "dan lanjutkan koordinasi pemantauan. Eskalasi "
            "jika tren risiko meningkat atau ditemukan "
            "indikasi lapangan."
        )

    # --------------------------------------------------------
    # LOW
    # --------------------------------------------------------

    elif risk == "LOW":

        monitoring = (
            "Lanjutkan pemantauan rutin dan pastikan "
            "pembacaan sensor tetap konsisten. Periksa kembali "
            "apabila terjadi perubahan data yang tidak wajar."
        )

        early_response = (
            "Pastikan peralatan dan prosedur penanganan awal "
            "tetap siap digunakan sesuai jadwal pemeriksaan."
        )

        protection = (
            "Pertahankan pemetaan area rentan dan akses petugas. "
            "Tidak ada dasar dari prediksi ini untuk menyatakan "
            "kondisi aman sepenuhnya."
        )

        coordination = (
            "Dokumentasikan hasil pemantauan dan teruskan "
            "laporan rutin kepada petugas yang bertanggung jawab."
        )

    # --------------------------------------------------------
    # UNKNOWN / DATA TIDAK LENGKAP
    # --------------------------------------------------------

    else:

        monitoring = (
            "Periksa kelengkapan data sensor, timestamp, "
            "dan status koneksi. Ulangi pembacaan setelah "
            "input utama tersedia."
        )

        early_response = (
            "Jangan menggunakan prediksi yang tidak lengkap "
            "sebagai dasar tunggal tindakan darurat. Pastikan "
            "personel mengetahui status data yang belum tersedia."
        )

        protection = (
            "Pertahankan prosedur keselamatan dan identifikasi "
            "area rentan berdasarkan informasi lapangan, "
            "bukan asumsi dari data yang hilang."
        )

        coordination = (
            "Informasikan bahwa prediksi belum dapat ditentukan "
            "dan koordinasikan pemeriksaan sensor dengan "
            "petugas teknis."
        )

    # --------------------------------------------------------
    # TAMBAHAN KONTEKS SENSOR
    # --------------------------------------------------------

    if direction != "UNKNOWN":

        coordination += (
            f" Arah angin Open-Meteo saat ini {direction}; "
            "gunakan sebagai informasi cuaca, bukan arah "
            "rambatan api terukur."
        )

    if np.isfinite(wind):

        monitoring += (
            f" Kecepatan angin anemometer saat ini "
            f"{wind:.2f} m/s."
        )

    if np.isfinite(current_spread):

        early_response += (
            f" Estimasi baseline rambatan saat ini "
            f"{current_spread:.2f} cm/jam, "
            "bukan pengukuran langsung."
        )

    if soil and soil != "Tidak diketahui":

        protection += (
            f" Kondisi tanah terpantau: {soil}."
        )

    return {

        "monitoring": monitoring,

        "early_response": early_response,

        "area_protection": protection,

        "coordination": coordination

    }


# ============================================================
# PREDICTION HIGHLIGHTS
# ============================================================

def build_highlights(
    current_level,
    future_level,
    trend,
    future_wind,
    direction,
    current_spread,
    future_spread
):

    if trend == "RISING":

        trend_value = "Meningkat"

        trend_detail = (
            "Indikator FRI hasil prediksi lebih tinggi "
            "daripada kondisi saat ini."
        )

    elif trend == "DECLINING":

        trend_value = "Menurun"

        trend_detail = (
            "Indikator FRI hasil prediksi lebih rendah "
            "daripada kondisi saat ini."
        )

    elif trend == "STABLE":

        trend_value = "Relatif stabil"

        trend_detail = (
            "Perubahan indikator FRI hasil prediksi "
            "relatif kecil."
        )

    else:

        trend_value = "Belum diketahui"

        trend_detail = (
            "Tren belum dapat ditentukan dari keluaran model."
        )

    # --------------------------------------------------------
    # RISK LEVEL
    # --------------------------------------------------------

    highlights = [

        {
            "key": "risk_level",

            "label": "Prediksi tingkat risiko",

            "value": (
                future_level
                if future_level != "UNKNOWN"
                else current_level
            ),

            "detail": (
                f"Level saat ini: {current_level}. "
                "Level prediksi diturunkan dari nilai FRI "
                "masa depan menggunakan ambang kategori FRI."
            ),

            "status": (
                "available"
                if future_level != "UNKNOWN"
                else "current_only"
            )
        },

        # ----------------------------------------------------
        # TREND
        # ----------------------------------------------------

        {
            "key": "trend",

            "label": "Tren risiko",

            "value": trend_value,

            "detail": trend_detail,

            "status": (
                "available"
                if trend != "UNKNOWN"
                else "unavailable"
            )
        },

        # ----------------------------------------------------
        # WIND
        # ----------------------------------------------------

        {
            "key": "wind",

            "label": "Kondisi angin",

            "value": (
                f"{future_wind:.2f} m/s"
                if future_wind is not None
                else "Prediksi belum tersedia"
            ),

            "detail": (
                (
                    "Prediksi kecepatan angin dari model "
                    "berbasis anemometer. Arah angin saat ini "
                    f"dari Open-Meteo: {direction}."
                )
                if future_wind is not None
                else (
                    f"Arah angin Open-Meteo saat ini: {direction}. "
                    "Kecepatan angin prediktif belum tersedia."
                )
            ),

            "status": (
                "available"
                if future_wind is not None
                else "partial"
            )
        },

        # ----------------------------------------------------
        # FIRE SPREAD
        # ----------------------------------------------------

        {
            "key": "spread",

            "label": "Potensi laju rambat",

            "value": (
                f"{max(0.0, future_spread):.2f} cm/jam"
                if future_spread is not None
                else (
                    f"Baseline {current_spread:.2f} cm/jam"
                    if np.isfinite(current_spread)
                    else "Belum tersedia"
                )
            ),

            "detail": (
                (
                    "Proyeksi model hanya tersedia jika model "
                    "spread berhasil dilatih dengan label "
                    "pengamatan aktual."
                )
                if future_spread is not None
                else (
                    "Belum ada proyeksi ML spread yang dapat "
                    "digunakan. Nilai baseline bukan hasil "
                    "prediksi ML dan bukan pengukuran langsung."
                )
            ),

            "status": (
                "model_forecast"
                if future_spread is not None
                else (
                    "baseline_only"
                    if np.isfinite(current_spread)
                    else "unavailable"
                )
            )
        }

    ]

    return highlights


# ============================================================
# MAIN INSIGHT
# ============================================================

def build_insight(
    data,
    future_fri,
    future_wind,
    future_spread
):

    current_fri = safe_float(data.get("fri"))

    current_wind = safe_float(
        data.get(
            "wind_speed_sensor",
            data.get("wind_speed")
        )
    )

    current_spread = safe_float(
        data.get("spread_rate_cmph")
    )

    direction = str(
        data.get("wind_direction") or "UNKNOWN"
    ).upper()

    current_level = str(
        data.get("fri_level")
        or classify_fri(current_fri)
    ).title()

    future_level = (
        classify_fri(future_fri)
        if future_fri is not None
        else "UNKNOWN"
    )

    # --------------------------------------------------------
    # TREND
    # --------------------------------------------------------

    trend = "UNKNOWN"

    if future_fri is not None and np.isfinite(current_fri):

        delta = future_fri - current_fri

        if delta >= 0.05:

            trend = "RISING"

        elif delta <= -0.05:

            trend = "DECLINING"

        else:

            trend = "STABLE"

    shown_level = (
        future_level
        if future_level != "UNKNOWN"
        else current_level
    )

    # --------------------------------------------------------
    # TREND DESCRIPTION
    # --------------------------------------------------------

    if trend == "RISING":

        trend_text = (
            "Indikator risiko diperkirakan meningkat"
        )

    elif trend == "DECLINING":

        trend_text = (
            "Indikator risiko diperkirakan menurun"
        )

    elif trend == "STABLE":

        trend_text = (
            "Indikator risiko diperkirakan relatif stabil"
        )

    else:

        trend_text = (
            "Tren risiko belum dapat ditentukan"
        )

    # --------------------------------------------------------
    # WIND DESCRIPTION
    # --------------------------------------------------------

    wind_text = (
        f"{future_wind:.2f} m/s"
        if future_wind is not None
        else (
            f"{current_wind:.2f} m/s saat ini"
            if np.isfinite(current_wind)
            else "belum tersedia"
        )
    )

    # --------------------------------------------------------
    # SPREAD DESCRIPTION
    # --------------------------------------------------------

    if future_spread is not None:

        spread_text = (
            "Proyeksi laju rambat model sekitar "
            f"{max(0.0, future_spread):.2f} cm/jam"
        )

    elif np.isfinite(current_spread):

        spread_text = (
            "baseline rambatan saat ini "
            f"{current_spread:.2f} cm/jam; "
            "belum ada proyeksi ML spread"
        )

    else:

        spread_text = (
            "estimasi laju rambat belum tersedia"
        )

    # --------------------------------------------------------
    # INSIGHT TEXT
    # --------------------------------------------------------

    insight = (

        f"Dalam {bundle.get('horizon_minutes', 15)} menit "
        f"ke depan, {trend_text.lower()} dengan prediksi "
        f"tingkat risiko {shown_level}. "

        f"Kecepatan angin anemometer: {wind_text}. "

        f"Arah angin Open-Meteo saat ini: {direction}. "

        f"{spread_text}."

    )

    return insight, shown_level, trend, current_level


# ============================================================
# COMPLETE FORECAST
# ============================================================

def predict_forecast(data):

    if bundle is None:
        raise RuntimeError("Model belum dimuat.")

    timestamp = get_timestamp(data)

    features = build_input_features(
        data,
        timestamp
    )

    horizon = int(
        bundle.get("horizon_minutes", 15)
    )

    forecast_time = timestamp + timedelta(
        minutes=horizon
    )

    current_fri = safe_float(
        data.get("fri")
    )

    current_wind = safe_float(
        data.get(
            "wind_speed_sensor",
            data.get("wind_speed")
        )
    )

    current_spread = safe_float(
        data.get("spread_rate_cmph")
    )

    current_level = str(
        data.get("fri_level")
        or classify_fri(current_fri)
    ).title()

    # --------------------------------------------------------
    # CHECK REQUIRED INPUTS
    # --------------------------------------------------------

    missing = []

    required_fields = [

        ("fri", current_fri),

        ("wind_speed_sensor", current_wind),

        ("spread_rate_cmph", current_spread)

    ]

    for field, value in required_fields:

        if not np.isfinite(value):

            missing.append(field)

    # --------------------------------------------------------
    # MODEL OUTPUTS
    # --------------------------------------------------------

    future_fri = predict_value(
        "future_fri",
        features
    )

    future_wind = predict_value(
        "future_wind_speed",
        features
    )

    future_spread = predict_value(
        "future_observed_spread_rate",
        features
    )

    direction = str(
        data.get("wind_direction") or "UNKNOWN"
    )

    # --------------------------------------------------------
    # INSUFFICIENT INPUTS
    # --------------------------------------------------------

    if missing:

        recommendations = build_recommendations(
            "UNKNOWN",
            "UNKNOWN",
            data,
            current_spread
        )

        highlights = build_highlights(
            current_level,
            "UNKNOWN",
            "UNKNOWN",
            future_wind,
            direction,
            current_spread,
            future_spread
        )

        return {

            "forecast_status": "INSUFFICIENT_INPUTS",

            "forecast_horizon_minutes": horizon,

            "node_id": data.get("node_id"),

            "sample_timestamp": timestamp.isoformat(),

            "forecast_timestamp": forecast_time.isoformat(),

            "insight_text": (
                "Prediksi belum dapat disusun karena fitur "
                "berikut belum tersedia: "
                + ", ".join(missing)
                + ". Periksa sensor dan perhitungan baseline spread."
            ),

            "risk_level": (
                current_level
                if current_level
                else "UNKNOWN"
            ),

            "trend": "UNKNOWN",

            "highlights": highlights,

            "recommendations": recommendations,

            "forecast_model_version": bundle.get(
                "model_version",
                "unknown"
            ),

            "input_status": (
                "MISSING: " + ", ".join(missing)
            )

        }

    # --------------------------------------------------------
    # BUILD INSIGHT
    # --------------------------------------------------------

    insight, risk_level, trend, current_level = build_insight(
        data,
        future_fri,
        future_wind,
        future_spread
    )

    # --------------------------------------------------------
    # BUILD RECOMMENDATIONS
    # --------------------------------------------------------

    recommendations = build_recommendations(
        risk_level,
        trend,
        data,
        current_spread
    )

    # --------------------------------------------------------
    # BUILD HIGHLIGHTS
    # --------------------------------------------------------

    highlights = build_highlights(

        current_level,

        classify_fri(future_fri),

        trend,

        future_wind,

        direction,

        current_spread,

        future_spread

    )

    # --------------------------------------------------------
    # MODEL STATUS
    # --------------------------------------------------------

    available = sum(

        value is not None

        for value in [
            future_fri,
            future_wind
        ]

    )

    status = (

        "OK"
        if available == 2

        else "PARTIAL"
        if available

        else "MODEL_UNAVAILABLE"

    )

    return {

        "forecast_status": status,

        "forecast_horizon_minutes": horizon,

        "node_id": data.get("node_id"),

        "sample_timestamp": timestamp.isoformat(),

        "forecast_timestamp": forecast_time.isoformat(),

        "insight_text": insight,

        "risk_level": risk_level,

        "trend": trend,

        "highlights": highlights,

        "recommendations": recommendations,

        "forecast_model_version": bundle.get(
            "model_version",
            "unknown"
        ),

        "input_status": "OK"

    }


# ============================================================
# HTTP HANDLER
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

    # --------------------------------------------------------
    # HEALTH CHECK
    # --------------------------------------------------------

    def do_GET(self):

        if self.path == "/health":

            return self.send_json(
                200,
                {

                    "status": "OK",

                    "model_loaded": bundle is not None,

                    "model_version": (
                        bundle.get("model_version")
                        if bundle
                        else None
                    ),

                    "forecast_horizon_minutes": (
                        bundle.get("horizon_minutes")
                        if bundle
                        else None
                    )

                }
            )

        self.send_json(
            404,
            {
                "error": "Endpoint not found"
            }
        )

    # --------------------------------------------------------
    # FORECAST ENDPOINT
    # --------------------------------------------------------

    def do_POST(self):

        if self.path != "/predict-forecast":

            return self.send_json(
                404,
                {
                    "error": "Endpoint not found"
                }
            )

        try:

            length = int(
                self.headers.get(
                    "Content-Length",
                    "0"
                )
            )

            if length <= 0 or length > 1_000_000:

                return self.send_json(
                    400,
                    {
                        "error": "Invalid request body size"
                    }
                )

            data = json.loads(
                self.rfile.read(length).decode("utf-8")
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

    # --------------------------------------------------------
    # LOG
    # --------------------------------------------------------

    def log_message(self, fmt, *args):

        print(
            "[ML API]",
            fmt % args
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
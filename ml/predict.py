import json, math, joblib, numpy as np
from pathlib import Path
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / 'models' / 'forecast_models.pkl'
HOST, PORT = '0.0.0.0', 5000
bundle = None

def load_model():
    global bundle
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f'Model belum tersedia: {MODEL_PATH}. Jalankan train.py.')
    bundle = joblib.load(MODEL_PATH)
    print('Loaded:', bundle.get('model_version'), 'horizon:', bundle.get('horizon_minutes'))

def num(value):
    try:
        if value is None or value == '': return np.nan
        value = float(value)
        return value if np.isfinite(value) else np.nan
    except (TypeError, ValueError):
        return np.nan

def timestamp_of(data):
    raw = data.get('timestamp')
    if not raw: return datetime.now(timezone.utc)
    stamp = datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
    if stamp.tzinfo is None: stamp = stamp.replace(tzinfo=timezone.utc)
    return stamp.astimezone(timezone.utc)

def build_features(data, ts):
    direction = num(data.get('wind_direction_deg'))
    radians = math.radians(direction) if np.isfinite(direction) else np.nan
    wind = num(data.get('wind_speed_sensor', data.get('wind_speed')))
    hour = ts.hour + ts.minute / 60
    return {
        'co': num(data.get('co')), 'ch4': num(data.get('ch4')),
        'temp': num(data.get('temp')), 'hum': num(data.get('hum')),
        'fri': num(data.get('fri')), 'wind_speed_sensor': wind,
        'spread_rate_cmph': num(data.get('spread_rate_cmph')),
        'wind_direction_sin': math.sin(radians) if np.isfinite(radians) else np.nan,
        'wind_direction_cos': math.cos(radians) if np.isfinite(radians) else np.nan,
        'hour_sin': math.sin(2 * math.pi * hour / 24),
        'hour_cos': math.cos(2 * math.pi * hour / 24),
        'wind_speed_weather': np.nan,
        'temp_mean_5m': num(data.get('temp')), 'hum_mean_5m': num(data.get('hum')),
        'co_mean_5m': num(data.get('co')), 'ch4_mean_5m': num(data.get('ch4')),
        'wind_sensor_mean_5m': wind, 'temp_std_5m': np.nan, 'hum_std_5m': np.nan
    }

def predict_value(key, features):
    info = (bundle or {}).get('models', {}).get(key)
    if not info: return None
    row = np.array([[features.get(c, np.nan) for c in bundle['feature_columns']]], dtype=float)
    value = float(info['model'].predict(row)[0])
    return value if np.isfinite(value) else None

def classify_fri(value):
    if value is None or not np.isfinite(value): return 'UNKNOWN'
    if value < .4: return 'Low'
    if value <= .6: return 'Moderate'
    if value <= .8: return 'High'
    return 'Extreme'

def get_trend(delta):
    if delta is None: return 'UNKNOWN'
    if delta >= .04: return 'RISING'
    if delta <= -.04: return 'DECLINING'
    return 'STABLE'

def recommendation_pack(data, trend, future_level, delta_fri, wind_future, current_spread, spread_future):
    risk = future_level.upper()
    wind_now = num(data.get('wind_speed_sensor', data.get('wind_speed')))
    wind_future = num(wind_future)
    wind_dir = str(data.get('wind_direction') or 'UNKNOWN').upper()
    soil = str(data.get('soil_condition') or 'Tidak diketahui')
    temp, hum = num(data.get('temp')), num(data.get('hum'))
    co, ch4 = num(data.get('co')), num(data.get('ch4'))
    gas_ok = data.get('gas_calibrated') is True
    gas_validated = data.get('gas_calibration_validated') is True and data.get('gas_calibration_status') == 'GAS_STANDARD_VALIDATED'
    triggers = []
    if trend == 'RISING': triggers.append(f'FRI diproyeksikan naik {delta_fri:+.3f} poin')
    if np.isfinite(wind_now) and wind_now >= 5: triggers.append(f'angin anemometer relatif kuat ({wind_now:.1f} m/s)')
    if np.isfinite(temp) and temp >= 40: triggers.append(f'suhu tinggi ({temp:.1f} °C)')
    if np.isfinite(hum) and hum <= 35: triggers.append(f'kelembapan rendah ({hum:.1f}%)')
    if gas_ok and np.isfinite(co) and co >= 100: triggers.append(f'CO estimasi {co:.0f} ppm')
    if gas_ok and np.isfinite(ch4) and ch4 >= 500: triggers.append(f'CH4 estimasi {ch4:.0f} ppm')
    if not gas_validated and gas_ok: triggers.append('data gas masih estimasi/provisional')
    if 'kering' in soil.lower(): triggers.append('kondisi tanah dilaporkan kering')
    if risk == 'EXTREME' or (risk == 'HIGH' and trend == 'RISING'):
        priority = 'URGENT'
        actions = [
            'Prioritaskan verifikasi lapangan pada sektor node pemantauan; cek asap, titik panas, bau terbakar, dan perubahan vegetasi sebelum menetapkan kejadian.',
            'Hubungi koordinator/pos pengendalian dan siagakan regu serta peralatan pemadaman awal sesuai SOP setempat; jangan mengirim personel ke area berbahaya tanpa penilaian keselamatan.',
            'Petakan aset/permukiman dan akses terdekat pada sektor yang perlu diverifikasi. Periksa jalur keluar dan arah angin sebagai konteks potensi paparan asap, bukan sebagai arah rambat api.',
            'Perbarui status kepada petugas dengan mencantumkan waktu sampel, node, tren FRI, faktor pemicu, kualitas kalibrasi gas, dan hasil verifikasi lapangan.'
        ]
    elif risk == 'HIGH' or trend == 'RISING':
        priority = 'ELEVATED'
        actions = [
            'Lakukan pengecekan lapangan terjadwal lebih rapat di sekitar node dan titik rawan; pastikan anomali sensor muncul kembali pada sampel berikutnya.',
            'Periksa kesiapan personel, pompa, sumber air, alat komunikasi, dan perlengkapan pelindung sesuai SOP; siapkan respons awal bila ditemukan indikasi nyata.',
            'Periksa kondisi tanah/lahan dan akses menuju sektor rawan. Bila arah angin tersedia, informasikan sektor yang mungkin menerima asap; jangan menyimpulkan arah api dari data angin.',
            'Laporkan tren dan nilai pemicu kepada koordinator; eskalasi bila tren terus meningkat atau temuan lapangan mengonfirmasi kebakaran.'
        ]
    elif risk == 'MODERATE':
        priority = 'WATCH'
        actions = [
            'Bandingkan pembacaan berikutnya dengan sampel ini; periksa sensor, konektor, dan kondisi sekitar node bila perubahan suhu, kelembapan, atau gas tidak konsisten.',
            'Lakukan pemeriksaan kesiapan peralatan pemadaman awal dan komunikasi regu; belum ada dasar dari prediksi ini saja untuk melakukan pemadaman.',
            'Tinjau lahan kering/vegetasi mudah terbakar dan akses petugas di sekitar titik pemantauan; catat sektor yang memerlukan pemeriksaan saat patroli.',
            'Masukkan hasil ke log pemantauan dan beritahu koordinator bila FRI meningkat ≥0,04 poin pada pembaruan berikutnya atau muncul indikasi visual/asap.'
        ]
    elif risk == 'LOW' and trend != 'RISING':
        priority = 'ROUTINE'
        actions = [
            'Lanjutkan interval pemantauan normal; pastikan sensor mengirim data dengan timestamp dan nilai dalam rentang wajar.',
            'Pertahankan jadwal pemeriksaan kesiapan peralatan dan personel sesuai prosedur rutin.',
            'Perbarui catatan kondisi lahan, kelembapan tanah, serta akses patroli agar perubahan dapat dibandingkan pada pemantauan berikutnya.',
            'Dokumentasikan hasil. Tetap lakukan verifikasi lapangan bila ada laporan masyarakat, asap, atau titik panas meskipun skor model rendah.'
        ]
    else:
        priority = 'DATA_CHECK'
        actions = [
            'Periksa sensor dan timestamp yang tidak tersedia; jangan mengartikan status UNKNOWN sebagai kondisi aman.',
            'Pertahankan kesiapan normal sesuai SOP; keputusan respons harus mengacu pada verifikasi petugas.',
            'Gunakan observasi lapangan untuk memetakan area rawan karena prediksi model belum cukup.',
            'Laporkan gangguan data kepada teknisi dan pulihkan pengiriman sebelum menggunakan analisis berikutnya.'
        ]
    rationale = 'Faktor yang memicu perhatian: ' + '; '.join(triggers) + '.' if triggers else 'Tidak ada ambang pemicu tambahan yang terdeteksi dari fitur yang tersedia; tetap ikuti tren dan hasil pengamatan lapangan.'
    if wind_dir != 'UNKNOWN': rationale += f' Arah angin Open-Meteo {wind_dir} adalah konteks meteorologi, bukan arah rambat api.'
    if soil != 'Tidak diketahui': rationale += f' Kondisi tanah dilaporkan: {soil}.'
    if np.isfinite(current_spread): rationale += f' Nilai spread {current_spread:.2f} cm/jam berasal dari baseline semi-empiris, bukan hasil pengukuran.'
    if spread_future is None: rationale += ' Proyeksi laju rambat ML tidak ditampilkan karena label pengamatan aktual belum memadai.'
    return {'priority':priority,'trigger_summary':rationale,'monitoring':actions[0],'early_response':actions[1],
        'area_protection':actions[2],'coordination':actions[3],
        'operational_caveat':'Ambang angin 5 m/s, kenaikan angin 1 m/s, suhu 40 °C, RH 35%, CO 100 ppm, dan CH4 500 ppm adalah pemicu awal untuk prioritas pemeriksaan, bukan standar bahaya universal; kalibrasikan dengan data lokasi dan SOP. Prediksi tidak membuktikan adanya api. Verifikasi lapangan dan keputusan pemadaman/evakuasi tetap menjadi kewenangan petugas.'}

def predict_forecast(data):
    if bundle is None: raise RuntimeError('Model belum dimuat.')
    ts = timestamp_of(data); horizon = int(bundle.get('horizon_minutes', 15)); target_ts = ts + timedelta(minutes=horizon)
    features = build_features(data, ts); current_fri = num(data.get('fri'))
    if not np.isfinite(current_fri):
        return {'forecast_status':'INSUFFICIENT_INPUTS','forecast_horizon_minutes':horizon,'node_id':data.get('node_id'),
            'sample_timestamp':ts.isoformat(),'forecast_timestamp':target_ts.isoformat(),'current_fri':None,
            'current_fri_level':'UNKNOWN','trend':'UNKNOWN','insight_text':'FRI aktual tidak tersedia; model tidak menjalankan prediksi tren risiko.',
            'highlights':[],'recommendations':None,'forecast_model_version':bundle.get('model_version'),'input_status':'MISSING_FRI'}
    predicted_fri_change = predict_value('fri_change_15m', features)
    future_fri = float(np.clip(current_fri + predicted_fri_change, 0.0, 1.0)) if predicted_fri_change is not None else None
    future_wind = predict_value('future_wind_speed', features)
    future_spread = predict_value('future_observed_spread_rate', features)
    current_level = str(data.get('fri_level') or classify_fri(current_fri)).title()
    future_level = classify_fri(future_fri)
    delta = (future_fri - current_fri) if future_fri is not None else None
    trend = get_trend(delta)
    direction = str(data.get('wind_direction') or 'UNKNOWN')
    cur_wind = num(data.get('wind_speed_sensor', data.get('wind_speed')))
    cur_spread = num(data.get('spread_rate_cmph'))
    recommendations = recommendation_pack(data, trend, future_level, delta, future_wind, cur_spread, future_spread)
    movement = 'tidak berubah secara berarti' if trend == 'STABLE' else 'meningkat' if trend == 'RISING' else 'menurun' if trend == 'DECLINING' else 'belum dapat ditentukan'
    delta_text = f'{delta:+.3f} poin' if delta is not None else 'tidak tersedia'
    parts = [f'Dalam {horizon} menit, model memperkirakan indikator FRI {movement} ({delta_text} dibanding nilai aktual {current_fri:.3f}, kategori saat ini {current_level}).']
    if future_wind is not None and np.isfinite(cur_wind): parts.append(f'Kecepatan angin anemometer diproyeksikan berubah dari {cur_wind:.2f} menjadi {future_wind:.2f} m/s.')
    elif np.isfinite(cur_wind): parts.append(f'Kecepatan angin anemometer saat ini {cur_wind:.2f} m/s; proyeksi angin belum tersedia.')
    if direction != 'UNKNOWN': parts.append(f'Arah angin Open-Meteo saat ini {direction}; ini bukan prediksi arah rambat api.')
    parts.append(recommendations['trigger_summary'])
    highlights = [
        {'key':'fri_change','label':'Perubahan indikator FRI','value':delta_text,'detail':f'Nilai FRI aktual {current_fri:.3f} ({current_level}); model memprediksi perubahan {movement} dalam {horizon} menit. Tidak menampilkan skor FRI masa depan kedua.','status':'available' if delta is not None else 'unavailable'},
        {'key':'trend','label':'Tren indikator','value':trend,'detail':'Tren dihitung dari selisih prediksi FRI terhadap FRI aktual; deadband ±0,04 untuk mengurangi perubahan kecil/noise.','status':'available' if trend!='UNKNOWN' else 'unavailable'},
        {'key':'wind_forecast','label':'Proyeksi kecepatan angin','value':f'{future_wind:.2f} m/s' if future_wind is not None else 'Belum tersedia','detail':f'Kecepatan angin aktual dari anemometer: {cur_wind:.2f} m/s.' if np.isfinite(cur_wind) else 'Data anemometer tidak tersedia.','status':'available' if future_wind is not None else 'unavailable'},
        {'key':'spread_forecast','label':'Proyeksi laju rambat api','value':f'{max(0.0,future_spread):.2f} cm/jam' if future_spread is not None else 'Belum tersedia','detail':'Hanya ditampilkan jika model terlatih dengan label laju rambat hasil observasi aktual; bukan baseline semi-empiris.','status':'available' if future_spread is not None else 'unavailable'}
    ]
    available = sum(v is not None for v in (future_fri, future_wind))
    status = 'OK' if available == 2 else 'PARTIAL' if available else 'MODEL_UNAVAILABLE'
    return {'forecast_status':status,'forecast_horizon_minutes':horizon,'node_id':data.get('node_id'),
        'sample_timestamp':ts.isoformat(),'forecast_timestamp':target_ts.isoformat(),'current_fri':float(current_fri),
        'current_fri_level':current_level,'fri_change':float(delta) if delta is not None else None,'trend':trend,
        'insight_text':' '.join(parts),'highlights':highlights,'recommendations':recommendations,
        'future_wind_speed':future_wind,'future_spread_rate_cmph':future_spread,'wind_direction_current':direction,
        'forecast_model_version':bundle.get('model_version','unknown'),'input_status':'OK' if available else 'NO_FORECAST_TARGETS'}

class Handler(BaseHTTPRequestHandler):
    def send_json(self,status,payload):
        body=json.dumps(payload,allow_nan=False).encode('utf-8'); self.send_response(status)
        self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        if self.path=='/health':
            return self.send_json(200,{'status':'OK','model_loaded':bundle is not None,'model_version':bundle.get('model_version') if bundle else None,'forecast_horizon_minutes':bundle.get('horizon_minutes') if bundle else None})
        self.send_json(404,{'error':'Endpoint not found'})
    def do_POST(self):
        if self.path!='/predict-forecast': return self.send_json(404,{'error':'Endpoint not found'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<=0 or length>1_000_000: return self.send_json(400,{'error':'Invalid request body size'})
            data=json.loads(self.rfile.read(length).decode('utf-8'))
            if not isinstance(data,dict): raise ValueError('Request harus berupa JSON object.')
            self.send_json(200,predict_forecast(data))
        except Exception as exc: self.send_json(500,{'forecast_status':'ERROR','error':str(exc)})
    def log_message(self,fmt,*args): print('[PyroWatch ML]',fmt % args)

if __name__=='__main__':
    load_model(); ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()

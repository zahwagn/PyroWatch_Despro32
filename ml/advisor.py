"""Analisis skenario dan rekomendasi tindakan mitigasi yang spesifik untuk petugas.

Rekomendasi disusun dari: skenario hasil klasifikasi ML, probabilitas eskalasi,
komponen pendorong FRI (gas/suhu/kelembapan), proyeksi komponen 15 menit, arah &
kecepatan angin, serta kualitas data. Dua kondisi dengan FRI yang sama dapat
menghasilkan rekomendasi yang berbeda bila komposisi komponennya berbeda.

Semua jarak/radius/laju rambat adalah estimasi heuristik untuk penentuan prioritas
dan HARUS dikalibrasi dengan observasi lapangan. Keputusan pemadaman/evakuasi tetap
mengikuti SOP pengendalian karhutla dan konfirmasi petugas.
"""
import numpy as np

import pyro_core as core

SAMPLING = {'Low': 'sesuai siklus normal (deep sleep)', 'Moderate': '5 menit', 'High': '1 menit', 'Extreme': '30 detik'}
PHASE_NOW, PHASE_NEXT, PHASE_AFTER = 'SEGERA (0–15 menit)', 'LANJUTAN (15–60 menit)', 'PASCA / PEMANTAUAN'


def _fmt(v, nd=1, unit=''):
    return f'{v:.{nd}f}{unit}' if v is not None and np.isfinite(v) else 'n/a'


def drivers_analysis(feats, reported_fri):
    contrib = {'gas': feats['c_gas'], 'suhu': feats['c_temp'], 'kelembapan': feats['c_hum']}
    valid = {k: v for k, v in contrib.items() if np.isfinite(v)}
    dominant = max(valid, key=valid.get) if valid else None
    gas_source = None
    if np.isfinite(feats['f_co']) and np.isfinite(feats['f_ch4']) and feats['f_gas'] > 0.05:
        gas_source = 'CO (MQ-7)' if feats['f_co'] >= feats['f_ch4'] else 'CH4/hidrokarbon (MQ-2)'
    weather = (feats['c_temp'] or 0) + (feats['c_hum'] or 0)
    residual = reported_fri - feats['fri_wsm'] if np.isfinite(reported_fri) and np.isfinite(feats['fri_wsm']) else np.nan
    total = sum(valid.values()) or 1.0
    notes = []
    if np.isfinite(feats['c_gas']) and feats['c_gas'] < 0.05 and np.isfinite(reported_fri) and reported_fri >= 0.3:
        notes.append(f'FRI didorong oleh cuaca (suhu+kelembapan = {weather:.2f}); tanpa gas, batas maksimum FRI '
                     f'dari cuaca hanya 0,50 sehingga belum ada indikasi pembakaran — fokus pencegahan.')
    co_low = not np.isfinite(feats['co']) or feats['co'] < core.CO_WARNING_PPM
    if np.isfinite(feats['c_gas']) and feats['c_gas'] >= 0.15:
        if gas_source and gas_source.startswith('CH4') and co_low:
            notes.append(f'Gas menyumbang {feats["c_gas"]:.2f} poin ({feats["c_gas"] / total:.0%}) dari FRI, tetapi hanya dari '
                         f'CH4 ({feats["ch4"]:.0f} ppm) sementara CO {feats["co"]:.0f} ppm < {core.CO_WARNING_PPM:.0f} ppm; '
                         f'smoldering gambut selalu menghasilkan CO, sehingga pola ini lebih mengarah ke gangguan sensor '
                         f'MQ-2 atau sumber hidrokarbon non-kebakaran.')
        else:
            notes.append(f'Gas pembakaran menyumbang {feats["c_gas"]:.2f} poin ({feats["c_gas"] / total:.0%}) dari FRI, '
                         f'sumber dominan {gas_source}; ini bukti fisik langsung kemungkinan smoldering.')
    if np.isfinite(residual) and abs(residual) >= 0.05:
        notes.append(f'FRI dari node ({reported_fri:.2f}) berbeda {residual:+.2f} dari rumus WSM proposal '
                     f'({feats["fri_wsm"]:.2f}); periksa versi firmware/faktor angin di node.')
    return {
        'contributions': {k: round(float(v), 3) for k, v in valid.items()},
        'contribution_share': {k: round(float(v / total), 3) for k, v in valid.items()},
        'dominant_driver': dominant, 'gas_source': gas_source,
        'fri_wsm_recomputed': round(float(feats['fri_wsm']), 3) if np.isfinite(feats['fri_wsm']) else None,
        'fri_residual_vs_wsm': round(float(residual), 3) if np.isfinite(residual) else None,
        'notes': notes,
    }


def spread_estimate(scenario, feats, wind_from_deg, reported_spread_cmph, p_surface):
    wind = feats['wind'] if np.isfinite(feats['wind']) else 0.0
    f_h = feats['f_hum'] if np.isfinite(feats['f_hum']) else 0.5
    f_t = feats['f_temp'] if np.isfinite(feats['f_temp']) else 0.3
    dryness = 0.6 * f_h + 0.4 * f_t
    has_dir = np.isfinite(wind_from_deg)
    downwind = (wind_from_deg + 180.0) % 360 if has_dir else np.nan
    out = {'mode': None, 'wind_from_deg': float(wind_from_deg) if has_dir else None,
           'downwind_deg': float(downwind) if has_dir else None,
           'source_search_sector': core.sector_text(wind_from_deg) if has_dir else 'arah angin tidak tersedia — periksa melingkar',
           'threat_sector': core.sector_text(downwind) if has_dir else 'arah angin tidak tersedia',
           'surface_transition_probability': round(float(p_surface), 3)}

    if scenario == 'WIND_DRIVEN_FIRE':
        ros = float(np.clip((0.2 + 0.5 * wind) * (0.4 + 0.6 * dryness), 0.2, 15.0))  # m/menit
        out.update({'mode': 'api permukaan', 'rate_m_per_min': round(ros, 2),
                    'rate_cmph': round(ros * 6000, 1),
                    'distance_m': {'15m': round(ros * 15), '30m': round(ros * 30), '60m': round(ros * 60)},
                    'inspection_radius_m': int(max(300, round(ros * 60, -1))),
                    'direction_confidence': 'tinggi' if wind >= 5 and has_dir else 'sedang'})
    elif scenario in ('EARLY_SMOLDERING', 'ACTIVE_SMOLDERING', 'DECAYING'):
        rate = reported_spread_cmph if np.isfinite(reported_spread_cmph) else (1.0 + 4.0 * dryness) * (1 + 0.08 * wind)
        out.update({'mode': 'smoldering bawah permukaan', 'rate_cmph': round(float(rate), 2),
                    'rate_m_per_min': round(float(rate) / 6000, 5),
                    'distance_m': {'6h': round(rate * 6 / 100, 2), '24h': round(rate * 24 / 100, 2)},
                    # sumber gas berada di hulu angin dari node: radius pencarian bertambah dengan angin
                    'inspection_radius_m': int(np.clip(50 + 30 * wind, 50, 300)),
                    'direction_confidence': 'rendah (rambat bawah tanah dipengaruhi kadar air gambut, bukan angin)'})
    else:
        out.update({'mode': 'tidak ada rambatan aktif terdeteksi', 'rate_cmph': None,
                    'inspection_radius_m': 25 if scenario == 'SENSOR_ANOMALY' else int(np.clip(100 + 20 * wind, 100, 300)),
                    'direction_confidence': 'n/a'})
    return out


def _ppe(co):
    if not np.isfinite(co):
        return 'Gunakan masker respirator standar; data CO tidak tersedia.'
    if co >= core.CO_CRITICAL_PPM:
        return (f'CO {co:.0f} ppm ≥ {core.CO_CRITICAL_PPM:.0f} ppm (alarm kritis): personel WAJIB memakai alat bantu '
                f'pernapasan (SCBA/respirator ber-filter CO) dan detektor CO personal, rotasi personel maks. 15–20 menit, '
                f'mendekat dari arah hulu angin. Bahaya langsung jiwa pada {core.CO_IDLH_PPM:.0f} ppm (IDLH).')
    if co >= core.CO_WARNING_PPM:
        return (f'CO {co:.0f} ppm ≥ {core.CO_WARNING_PPM:.0f} ppm: gunakan respirator (minimal N95 + detektor CO personal), '
                f'batasi paparan, dekati dari hulu angin, hentikan pekerjaan bila pusing/mual.')
    return 'APD standar pemadam (helm, kacamata, sarung tangan, sepatu boot) dan masker partikel.'


def recommend(ctx):
    """ctx: dict hasil analisis (lihat predict.analyze)."""
    sc = ctx['scenario']
    feats = ctx['features']
    level = ctx['current_fri_level']
    fri = ctx['current_fri']
    p_high, p_ext = ctx['p_high_30m'], ctx['p_extreme_30m']
    spread = ctx['spread']
    co, ch4 = feats['co'], feats['ch4']
    hum, temp, wind = feats['hum'], feats['temp'], feats['wind']
    proj = ctx['component_projection_15m']
    radius = spread.get('inspection_radius_m')
    src, threat = spread['source_search_sector'], spread['threat_sector']
    gas_validated = ctx['gas_validated']
    plan = []

    def add(phase, cat, action, why):
        plan.append({'phase': phase, 'category': cat, 'action': action, 'reason': why})

    co_slope, ch4_slope = feats['slope_co'], feats['slope_ch4']
    co15 = proj.get('co')

    # ---------------- prioritas
    if sc in ('WIND_DRIVEN_FIRE', 'ACTIVE_SMOLDERING') or p_ext >= 0.5 or (np.isfinite(fri) and fri >= 0.8):
        priority = 'URGENT'
    elif sc == 'EARLY_SMOLDERING' or p_high >= 0.5 or (np.isfinite(fri) and fri >= 0.6):
        priority = 'ELEVATED'
    elif sc == 'SENSOR_ANOMALY':
        priority = 'DATA_CHECK'
    elif sc in ('FUEL_DRYING', 'DECAYING') or p_high >= 0.2 or level == 'Moderate':
        priority = 'WATCH'
    else:
        priority = 'ROUTINE'
    # pengaman: anomali sensor tidak boleh menurunkan prioritas bila CO kritis dan menetap
    critical_override = (sc == 'SENSOR_ANOMALY' and np.isfinite(co) and co >= core.CO_CRITICAL_PPM
                         and feats['co_persist'] >= 0.6)
    if critical_override:
        priority = 'ELEVATED'

    # ---------------- aksi spesifik per skenario
    if sc == 'NORMAL':
        add(PHASE_NOW, 'monitoring', f'Pertahankan interval sampling {SAMPLING["Low"]}.',
            f'FRI {fri:.2f}, CO {_fmt(co, 0)} ppm, kelembapan {_fmt(hum, 0)}% — tidak ada pemicu.')
        add(PHASE_AFTER, 'early_response', 'Lakukan pengecekan rutin kesiapan pompa, selang, dan nozzle tusuk sesuai jadwal mingguan.',
            'Kesiapan alat menentukan kecepatan respons bila kondisi berubah.')
        add(PHASE_AFTER, 'area_protection', 'Catat tinggi muka air kanal/sumur pantau terdekat sebagai data pembanding musim kering.',
            'Gambut sulit terbakar selama kadar airnya tinggi; penurunan muka air adalah indikator dini.')
        add(PHASE_AFTER, 'coordination', 'Laporkan status hijau pada laporan harian pos.', 'Dokumentasi untuk evaluasi tren musiman.')

    elif sc == 'FUEL_DRYING':
        add(PHASE_NOW, 'monitoring', f'Naikkan interval sampling ke {SAMPLING["Moderate"]} dan pantau khusus sensor CO/CH4.',
            f'Suhu {_fmt(temp)} °C dan kelembapan {_fmt(hum, 0)}% (tren {feats["slope_hum"] * 60:+.1f} %/jam) membuat bahan bakar '
            f'kering, tetapi gas masih rendah (CO {_fmt(co, 0)} ppm) sehingga belum ada pembakaran.')
        add(PHASE_NEXT, 'area_protection', f'Patroli pencegahan radius ±{radius} m dari node: cari aktivitas pembakaran lahan, '
            f'puntung/api unggun, dan tumpukan serasah kering; prioritaskan sektor {threat} (hilir angin) karena api yang muncul '
            f'akan merambat ke arah itu.', 'Pada fase ini penyalaan biasanya dipicu aktivitas manusia; mencegah lebih murah daripada memadamkan.')
        add(PHASE_NEXT, 'early_response', 'Pastikan sumber air (kanal, embung, sumur bor) dapat diakses; periksa sekat kanal '
            'dan bila memungkinkan lakukan pembasahan sekat bakar di sekitar titik rawan.',
            'Menjaga muka air gambut tinggi adalah pencegahan utama smoldering.')
        add(PHASE_NEXT, 'coordination', 'Informasikan status SIAGA pencegahan kepada pos/MPA terdekat dan sosialisasikan larangan '
            'membakar kepada warga sekitar.', f'Probabilitas FRI mencapai High dalam 30 menit: {p_high:.0%}.')

    elif sc == 'EARLY_SMOLDERING':
        add(PHASE_NOW, 'monitoring', f'Naikkan interval sampling ke {SAMPLING["High"]}; konfirmasi kenaikan CO pada 3 pembacaan berikutnya.',
            f'CO {_fmt(co, 0)} ppm (tren {co_slope:+.1f} ppm/menit, proyeksi 15 menit ≈ {_fmt(co15, 0)} ppm) melewati ambang '
            f'gejala awal {core.CO_SMOLDER_PPM:.0f} ppm.' if np.isfinite(co) and co >= core.CO_SMOLDER_PPM else
            f'CO {_fmt(co, 0)} ppm naik {co_slope:+.1f} ppm/menit; CH4 {_fmt(ch4, 0)} ppm ({ch4_slope:+.1f} ppm/menit).')
        add(PHASE_NOW, 'early_response', f'Kirim 1 regu kecil (2–3 orang) untuk verifikasi: cari sumber asap putih/bau gambut terbakar '
            f'di sektor {src} (hulu angin) dalam radius ±{radius} m, gunakan termometer tusuk/kamera termal pada kedalaman 10–30 cm.',
            'Gas terbawa angin dari sumber ke node, sehingga sumber smoldering berada di arah datang angin; deteksi dini memungkinkan '
            'pemadaman dengan air sedikit sebelum bara meluas.')
        add(PHASE_NEXT, 'early_response', 'Bila titik panas ditemukan: siapkan pompa portabel + nozzle tusuk (penetrator) dan '
            'lakukan pembasahan sampai lapisan gambut jenuh, lalu ukur ulang suhu tanah.',
            'Smoldering gambut berada di bawah permukaan; penyiraman permukaan saja tidak memadamkan bara.')
        add(PHASE_NEXT, 'area_protection', f'Tandai area {threat} (hilir angin) sebagai zona paparan asap; batasi akses warga bila CO > '
            f'{core.CO_WARNING_PPM:.0f} ppm.', _ppe(co))
        add(PHASE_NEXT, 'coordination', 'Laporkan ke koordinator pos sebagai "dugaan smoldering" lengkap dengan node, waktu, CO/CH4, '
            'tren, dan sektor pencarian; siagakan regu kedua.', f'Probabilitas eskalasi ke High ≤30 menit: {p_high:.0%}'
            + (f', ETA ±{ctx["eta_high_min"]:.0f} menit.' if ctx.get('eta_high_min') is not None else '.'))

    elif sc == 'ACTIVE_SMOLDERING':
        add(PHASE_NOW, 'early_response', f'Mobilisasi regu pemadam dengan pompa + nozzle tusuk ke sektor {src} (hulu angin) radius '
            f'±{radius} m dari node; lakukan pemetaan batas bara dengan termometer tusuk setiap 5–10 m.',
            f'CO {_fmt(co, 0)} ppm dan CH4 {_fmt(ch4, 0)} ppm bertahan tinggi (persistensi CO {feats["co_persist"]:.0%}) — '
            f'pola pembakaran bawah permukaan aktif.')
        add(PHASE_NOW, 'area_protection', f'Buat sekat bakar/parit isolasi hingga lapisan basah mengelilingi area bara, prioritaskan '
            f'sisi {threat}; amankan akses keluar regu di sisi hulu angin.',
            f'Laju rambat smoldering ±{_fmt(spread.get("rate_cmph"), 1)} cm/jam lambat, tetapi bara dapat muncul ke permukaan '
            f'(probabilitas transisi ke api permukaan {spread["surface_transition_probability"]:.0%}).')
        add(PHASE_NOW, 'monitoring', f'Sampling {SAMPLING["Extreme"] if level == "Extreme" else SAMPLING["High"]}; pantau kecepatan angin '
            f'(saat ini {_fmt(wind)} m/s) — angin ≥ 5 m/s menaikkan risiko api permukaan.', _ppe(co))
        add(PHASE_NEXT, 'coordination', 'Eskalasi ke BPBD/Manggala Agni/Daops setempat; minta dukungan air (truk tangki/sumur bor) '
            'dan laporkan perkiraan luas area pemeriksaan.', f'Luas pemeriksaan awal ±{np.pi * radius ** 2 / 10000:.1f} ha.')
        add(PHASE_AFTER, 'monitoring', 'Setelah dipadamkan, pantau titik tersebut minimal 3×24 jam untuk penyalaan kembali.',
            'Bara gambut sering menyala ulang dari lapisan dalam.')

    elif sc == 'WIND_DRIVEN_FIRE':
        d = spread.get('distance_m', {})
        add(PHASE_NOW, 'area_protection', f'Peringatkan dan siapkan evakuasi permukiman/aset di sektor {threat} (hilir angin) dalam '
            f'jarak ±{d.get("60m", "?")} m; tetapkan jalur evakuasi dan titik kumpul di sisi hulu angin/samping arah rambat.',
            f'Estimasi laju rambat api permukaan ±{spread["rate_m_per_min"]} m/menit (≈{d.get("15m")} m dalam 15 menit, '
            f'{d.get("30m")} m dalam 30 menit) dengan angin {_fmt(wind)} m/s.')
        add(PHASE_NOW, 'early_response', 'Serang dari sisi samping (flank) dan belakang api, JANGAN dari depan arah rambat; '
            'buat sekat bakar/jalur basah di depan arah rambat dengan jarak aman.',
            'Kepala api pada angin kencang terlalu berbahaya untuk serangan langsung.')
        add(PHASE_NOW, 'coordination', 'Aktifkan alarm darurat dan eskalasi segera ke BPBD/Manggala Agni/Daops; minta dukungan '
            'armada tambahan dan, bila tersedia, water bombing.', f'Probabilitas FRI Extreme ≤30 menit: {p_ext:.0%}.')
        add(PHASE_NOW, 'monitoring', f'Sampling {SAMPLING["Extreme"]}; pantau perubahan arah angin setiap pembaruan karena '
            f'perubahan arah memindahkan sektor ancaman.', _ppe(co))

    elif sc == 'DECAYING':
        add(PHASE_NOW, 'monitoring', f'Pertahankan sampling {SAMPLING["Moderate"]} hingga CO < {core.CO_WARNING_PPM:.0f} ppm selama 1 jam.',
            f'CO turun {co_slope:+.1f} ppm/menit dan kelembapan naik {feats["slope_hum"] * 60:+.1f} %/jam — api cenderung mereda.')
        add(PHASE_NEXT, 'early_response', 'Lakukan mop-up: tusuk dan basahi ulang titik bekas bara, cek suhu tanah 10–30 cm di '
            f'radius ±{radius} m.', 'Gas yang turun di permukaan tidak menjamin bara di lapisan dalam sudah padam.')
        add(PHASE_AFTER, 'area_protection', 'Pasang penanda area bekas terbakar dan larang aktivitas pembakaran di sekitarnya.',
            'Area bekas terbakar rawan menyala kembali (re-ignition) 24–72 jam.')
        add(PHASE_AFTER, 'coordination', 'Laporkan status "dalam pendinginan" ke koordinator; turunkan status hanya setelah '
            'verifikasi lapangan.', f'Probabilitas naik kembali ke High ≤30 menit: {p_high:.0%}.')

    elif sc == 'SENSOR_ANOMALY':
        reason = []
        if feats['co_minus_ch4'] < -0.3 and (not np.isfinite(co) or co < core.CO_WARNING_PPM):
            reason.append(f'CH4 tinggi ({_fmt(ch4, 0)} ppm) tanpa CO dan tanpa kenaikan suhu — tipikal sensitivitas silang MQ-2 '
                          f'atau sumber hidrokarbon (genset, BBM, kendaraan, rawa) bukan kebakaran')
        if feats['has_trend'] and abs(feats['co_jump']) >= 80 and feats['co_persist'] < 0.3:
            reason.append(f'lonjakan CO sesaat ({feats["co_jump"]:+.0f} ppm terhadap median) yang tidak bertahan')
        if feats['has_trend'] and feats['co_rel_std'] < 0.01 and np.isfinite(co) and co > core.CO_SMOLDER_PPM:
            reason.append('nilai CO identik/konstan (indikasi sensor macet)')
        if np.isfinite(hum) and hum >= 90:
            reason.append(f'kelembapan sangat tinggi ({hum:.0f}%) yang tidak mendukung pembakaran')
        why = '; '.join(reason) or 'pola gas tidak konsisten dengan dinamika pembakaran'
        add(PHASE_NOW, 'monitoring', 'Tandai data node sebagai "perlu verifikasi"; bandingkan dengan 3 pembacaan berikutnya dan node '
            'terdekat sebelum menaikkan status.', why[0].upper() + why[1:] + '.')
        add(PHASE_NEXT, 'early_response', f'Teknisi memeriksa node: kondisi heater MQ-2/MQ-7, kabel/konektor, kalibrasi R0, dan '
            f'sumber gas non-kebakaran dalam radius ±{radius} m.', 'Menghindari alarm palsu yang menghabiskan sumber daya regu.')
        add(PHASE_NEXT, 'area_protection', 'Tetap lakukan pengamatan visual singkat (asap/bau terbakar) saat teknisi di lokasi.',
            'Model tidak boleh menjadi satu-satunya dasar menyatakan aman.')
        add(PHASE_AFTER, 'coordination', 'Catat kejadian di log pemeliharaan sensor dan kirim ke tim teknis.',
            'Data ini dipakai untuk melatih ulang model dengan label nyata.')
        if critical_override:
            add(PHASE_NOW, 'early_response', f'Walaupun pola terindikasi anomali, CO {co:.0f} ppm menetap di atas ambang kritis: '
                f'kirim regu verifikasi (2–3 orang, ber-APD pernapasan) ke sektor {src} (hulu angin) radius ±{max(radius, 100)} m '
                f'dan cek suhu tanah 10–30 cm.', 'Smoldering bawah permukaan tidak selalu menaikkan suhu udara di node; '
                'kemungkinan kebakaran nyata tidak boleh diabaikan.')
            add(PHASE_NOW, 'area_protection', 'Batasi akses warga di sekitar node sampai hasil verifikasi diketahui.', _ppe(co))

    if not gas_validated and sc not in ('NORMAL', 'FUEL_DRYING'):
        add(PHASE_NOW, 'monitoring', 'Perlakukan nilai ppm sebagai estimasi (kalibrasi gas belum tervalidasi standar).',
            'Ambang ppm proposal berlaku untuk sensor terkalibrasi; konfirmasi dengan detektor gas portabel.')

    legacy = {}
    for cat in ('monitoring', 'early_response', 'area_protection', 'coordination'):
        items = [f'[{p["phase"]}] {p["action"]}' for p in plan if p['category'] == cat]
        legacy[cat] = ' '.join(items) if items else 'Tidak ada tindakan khusus; ikuti prosedur rutin.'

    return {
        'priority': priority,
        'scenario': sc,
        **legacy,
        'action_plan': plan,
        'sampling_interval': SAMPLING.get(level if priority != 'URGENT' else 'Extreme', SAMPLING['Moderate']),
        'source_search_sector': src,
        'threat_sector': threat,
        'inspection_radius_m': radius,
        'ppe': _ppe(co),
        'operational_caveat': 'Rekomendasi adalah alat bantu prioritas berbasis model dan heuristik yang perlu dikalibrasi '
                              'lapangan. Tindakan pemadaman/evakuasi tetap mengikuti SOP dan konfirmasi petugas.',
    }

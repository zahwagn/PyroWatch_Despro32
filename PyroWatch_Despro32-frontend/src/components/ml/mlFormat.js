// Utilitas format & konfigurasi tampilan hasil ML PyroWatch.

export const SCENARIOS = {
  NORMAL: { short: 'Normal', hint: 'Tidak ada pemicu. Pantau rutin.' },
  FUEL_DRYING: { short: 'Pengeringan bahan bakar', hint: 'Cuaca panas-kering, tidak ada gas pembakaran. Fokus pencegahan.' },
  EARLY_SMOLDERING: { short: 'Smoldering awal', hint: 'Gas pembakaran mulai naik. Verifikasi sumber di hulu angin.' },
  ACTIVE_SMOLDERING: { short: 'Smoldering aktif', hint: 'Pembakaran bawah permukaan menetap. Mobilisasi pemadaman.' },
  WIND_DRIVEN_FIRE: { short: 'Api permukaan terdorong angin', hint: 'Rambat cepat ke hilir angin. Amankan area ancaman.' },
  DECAYING: { short: 'Mereda', hint: 'Gas turun / kelembapan naik. Mop-up & pantau nyala ulang.' },
  SENSOR_ANOMALY: { short: 'Anomali sensor', hint: 'Pola gas tidak konsisten dengan pembakaran. Cek perangkat.' },
};

export const PRIORITIES = {
  URGENT: { label: 'Mendesak', desc: 'Tindakan segera', tone: 'red' },
  ELEVATED: { label: 'Siaga', desc: 'Siaga, verifikasi lapangan', tone: 'green' },
  WATCH: { label: 'Waspada', desc: 'Waspada, tingkatkan pemantauan', tone: 'green' },
  DATA_CHECK: { label: 'Periksa data', desc: 'Periksa perangkat/data', tone: 'slate' },
  ROUTINE: { label: 'Rutin', desc: 'Pemantauan rutin', tone: 'green' },
};

export const PRIORITY_STYLE = {
  red: 'text-red-700',
  slate: 'text-gray-600',
  green: 'text-forest-700',
};

export const PHASE_ORDER = ['SEGERA (0–15 menit)', 'LANJUTAN (15–60 menit)', 'PASCA / PEMANTAUAN'];

export const CATEGORY_LABEL = {
  monitoring: 'Pemantauan',
  early_response: 'Respons awal',
  area_protection: 'Perlindungan area',
  coordination: 'Koordinasi',
};

export function isNum(v) {
  return v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
}

export function pct(v, digits = 0) {
  return isNum(v) ? `${(Number(v) * 100).toFixed(digits)}%` : '--';
}

export function fmt(v, digits = 1, unit = '') {
  return isNum(v) ? `${Number(v).toFixed(digits)}${unit}` : '--';
}

export function signed(v, digits = 2) {
  if (!isNum(v)) return '--';
  const n = Number(v);
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
}

export function scenarioInfo(code) {
  return SCENARIOS[code] || { short: code || 'Belum diketahui', hint: '' };
}

export function priorityInfo(code) {
  return PRIORITIES[code] || PRIORITIES.DATA_CHECK;
}

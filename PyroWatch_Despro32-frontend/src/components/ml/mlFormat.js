// Utilitas format & konfigurasi tampilan hasil ML PyroWatch.

export const SCENARIOS = {
  NORMAL: { short: 'Normal', tone: 'green', hint: 'Tidak ada pemicu. Pantau rutin.' },
  FUEL_DRYING: { short: 'Pengeringan bahan bakar', tone: 'amber', hint: 'Cuaca panas-kering, tidak ada gas pembakaran. Fokus pencegahan.' },
  EARLY_SMOLDERING: { short: 'Smoldering awal', tone: 'orange', hint: 'Gas pembakaran mulai naik. Verifikasi sumber di hulu angin.' },
  ACTIVE_SMOLDERING: { short: 'Smoldering aktif', tone: 'red', hint: 'Pembakaran bawah permukaan menetap. Mobilisasi pemadaman.' },
  WIND_DRIVEN_FIRE: { short: 'Api permukaan terdorong angin', tone: 'red', hint: 'Rambat cepat ke hilir angin. Amankan area ancaman.' },
  DECAYING: { short: 'Mereda', tone: 'sky', hint: 'Gas turun / kelembapan naik. Mop-up & pantau nyala ulang.' },
  SENSOR_ANOMALY: { short: 'Anomali sensor', tone: 'slate', hint: 'Pola gas tidak konsisten dengan pembakaran. Cek perangkat.' },
};

export const TONES = {
  green: { chip: 'bg-forest-100 text-forest-800', bar: 'bg-forest-500', soft: 'bg-forest-50 border-forest-100', text: 'text-forest-800' },
  amber: { chip: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500', soft: 'bg-amber-50 border-amber-100', text: 'text-amber-900' },
  orange: { chip: 'bg-orange-100 text-orange-800', bar: 'bg-orange-500', soft: 'bg-orange-50 border-orange-100', text: 'text-orange-900' },
  red: { chip: 'bg-red-100 text-red-800', bar: 'bg-red-500', soft: 'bg-red-50 border-red-100', text: 'text-red-900' },
  sky: { chip: 'bg-sky-100 text-sky-800', bar: 'bg-sky-500', soft: 'bg-sky-50 border-sky-100', text: 'text-sky-900' },
  slate: { chip: 'bg-slate-200 text-slate-700', bar: 'bg-slate-500', soft: 'bg-slate-50 border-slate-200', text: 'text-slate-800' },
  violet: { chip: 'bg-violet-100 text-violet-800', bar: 'bg-violet-500', soft: 'bg-violet-50 border-violet-100', text: 'text-violet-900' },
};

export const PRIORITIES = {
  URGENT: { label: 'URGENT', desc: 'Tindakan segera', tone: 'red' },
  ELEVATED: { label: 'ELEVATED', desc: 'Siaga, verifikasi lapangan', tone: 'orange' },
  WATCH: { label: 'WATCH', desc: 'Waspada, tingkatkan pemantauan', tone: 'amber' },
  DATA_CHECK: { label: 'DATA CHECK', desc: 'Periksa perangkat/data', tone: 'slate' },
  ROUTINE: { label: 'ROUTINE', desc: 'Pemantauan rutin', tone: 'green' },
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
  return SCENARIOS[code] || { short: code || 'Belum diketahui', tone: 'slate', hint: '' };
}

export function priorityInfo(code) {
  return PRIORITIES[code] || PRIORITIES.DATA_CHECK;
}

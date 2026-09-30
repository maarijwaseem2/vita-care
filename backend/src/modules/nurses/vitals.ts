/**
 * Vital-sign red flags for home nursing visits (adults).
 *
 * Every time a nurse records vitals, these rules run on the server. A reading
 * in the "emergency" band tells the nurse, the patient and the treating doctor
 * immediately; "soon" means the doctor should review within a day.
 *
 * Thresholds follow widely used adult early-warning cut-offs (hypertensive
 * crisis ≥180/120, SpO2 < 92%, level-2 hypoglycaemia < 54 mg/dL, etc.).
 * They are conservative screening rules, not a diagnosis, and must be reviewed
 * by the clinical lead before real use (children and pregnancy need their own).
 */
export interface Vitals {
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  pulse?: number | null;
  temperatureC?: number | null;
  spo2?: number | null;
  bloodSugar?: number | null; // mg/dL
  respiratoryRate?: number | null;
}

export interface VitalAlert {
  vital: keyof Vitals;
  level: 'soon' | 'emergency';
  message: string;
}

const has = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);

export function checkVitals(v: Vitals): VitalAlert[] {
  const a: VitalAlert[] = [];
  const add = (vital: keyof Vitals, level: VitalAlert['level'], message: string) => a.push({ vital, level, message });

  if (has(v.bpSystolic) || has(v.bpDiastolic)) {
    const s = v.bpSystolic ?? 0;
    const d = v.bpDiastolic ?? 0;
    if (s >= 180 || d >= 120) add('bpSystolic', 'emergency', `Blood pressure ${s}/${d}: hypertensive crisis range`);
    else if (has(v.bpSystolic) && s < 90) add('bpSystolic', 'emergency', `Blood pressure ${s}/${d}: too low`);
    else if (s >= 160 || d >= 100) add('bpSystolic', 'soon', `Blood pressure ${s}/${d}: high, doctor should review`);
  }
  if (has(v.spo2)) {
    if (v.spo2 < 92) add('spo2', 'emergency', `Oxygen saturation ${v.spo2}%: low`);
    else if (v.spo2 < 95) add('spo2', 'soon', `Oxygen saturation ${v.spo2}%: below normal`);
  }
  if (has(v.pulse)) {
    if (v.pulse > 130 || v.pulse < 40) add('pulse', 'emergency', `Pulse ${v.pulse}/min: dangerously ${v.pulse > 130 ? 'fast' : 'slow'}`);
    else if (v.pulse > 110 || v.pulse < 50) add('pulse', 'soon', `Pulse ${v.pulse}/min: ${v.pulse > 110 ? 'fast' : 'slow'}`);
  }
  if (has(v.temperatureC)) {
    if (v.temperatureC >= 40 || v.temperatureC < 35) add('temperatureC', 'emergency', `Temperature ${v.temperatureC}°C: ${v.temperatureC < 35 ? 'too low' : 'very high'}`);
    else if (v.temperatureC >= 38.5) add('temperatureC', 'soon', `Temperature ${v.temperatureC}°C: fever`);
  }
  if (has(v.bloodSugar)) {
    if (v.bloodSugar < 54) add('bloodSugar', 'emergency', `Blood sugar ${v.bloodSugar} mg/dL: dangerously low`);
    else if (v.bloodSugar < 70) add('bloodSugar', 'soon', `Blood sugar ${v.bloodSugar} mg/dL: low`);
    else if (v.bloodSugar > 400) add('bloodSugar', 'emergency', `Blood sugar ${v.bloodSugar} mg/dL: very high`);
    else if (v.bloodSugar > 250) add('bloodSugar', 'soon', `Blood sugar ${v.bloodSugar} mg/dL: high`);
  }
  if (has(v.respiratoryRate)) {
    if (v.respiratoryRate >= 30 || v.respiratoryRate < 8) add('respiratoryRate', 'emergency', `Breathing rate ${v.respiratoryRate}/min`);
    else if (v.respiratoryRate > 22) add('respiratoryRate', 'soon', `Breathing rate ${v.respiratoryRate}/min: fast`);
  }
  return a;
}

export function alertLevel(alerts: VitalAlert[]): 'soon' | 'emergency' | null {
  if (alerts.some((x) => x.level === 'emergency')) return 'emergency';
  if (alerts.length) return 'soon';
  return null;
}

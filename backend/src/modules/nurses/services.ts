/** Home-nursing services a patient or doctor can request. */
export const HOME_SERVICES = [
  { id: 'injection', label: 'Injection / IV drip', skill: 'injection' },
  { id: 'wound_care', label: 'Wound dressing', skill: 'wound_care' },
  { id: 'vitals', label: 'BP, sugar & vitals check', skill: 'vitals' },
  { id: 'elderly_care', label: 'Elderly / bedridden care', skill: 'elderly_care' },
  { id: 'post_op', label: 'Post-surgery care', skill: 'post_op' },
  { id: 'catheter', label: 'Catheter / NG tube care', skill: 'catheter' },
  { id: 'mother_baby', label: 'Mother & newborn care', skill: 'mother_baby' },
  { id: 'sample', label: 'Blood sample collection', skill: 'sample' },
] as const;

export type HomeServiceId = (typeof HOME_SERVICES)[number]['id'];
export const SERVICE_IDS = HOME_SERVICES.map((s) => s.id) as string[];
export const NURSE_QUALIFICATIONS = ['BSN (Registered Nurse)', 'Diploma RN', 'Post-RN BSN', 'Midwife', 'Lady Health Visitor (LHV)', 'Licensed Practical Nurse'];
export const TIME_WINDOWS = ['morning', 'afternoon', 'evening'] as const;

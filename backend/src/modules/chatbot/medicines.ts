/**
 * Over-the-counter (OTC) medicine suggestions for MINOR, routine illness.
 *
 * Safety design:
 *  - The model may only pick medicine IDS from this fixed formulary; anything
 *    else is ignored. Doses always come from this file, never from the model.
 *  - Server rules then remove a medicine when the patient's record or words
 *    make it unsafe (e.g. no ibuprofen with fever in dengue country, kidney
 *    disease, ulcer, high BP, pregnancy).
 *  - Nothing is suggested for emergencies, children under 12 or pregnancy:
 *    those patients are told to ask a doctor or pharmacist.
 *  - Antibiotics, steroids and other prescription medicines are never listed.
 *
 * Doses follow standard adult label directions. IMPORTANT: a pharmacist or
 * doctor must review this list before real-world use.
 */

export interface OtcMedicine {
  id: string;
  name: string;
  /** Common examples in Pakistan (generic name is what matters). */
  examples: string[];
  usedFor: string;
  adultDose: string;
  maxDose: string;
  cautions: string[];
}

export interface MedicinePick {
  id: string;
  reason: string;
}

export interface MedicineAdvice extends OtcMedicine {
  reason: string;
}

export const FORMULARY: OtcMedicine[] = [
  {
    id: 'paracetamol',
    name: 'Paracetamol 500 mg',
    examples: ['Panadol', 'Calpol'],
    usedFor: 'fever, headache, body ache, sore throat pain',
    adultDose: '1–2 tablets (500 mg–1 g) every 4–6 hours if needed',
    maxDose: 'Not more than 8 tablets (4 g) in 24 hours',
    cautions: ['Do not take with other medicines that also contain paracetamol', 'Avoid if you have liver disease or drink alcohol regularly'],
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen 200–400 mg',
    examples: ['Brufen'],
    usedFor: 'muscle, joint, back or period pain without fever',
    adultDose: '200–400 mg every 6–8 hours, after food',
    maxDose: 'Not more than 1,200 mg in 24 hours without a doctor',
    cautions: ['Do not use if dengue is possible', 'Avoid with stomach ulcer, kidney disease, high blood pressure, asthma or blood thinners'],
  },
  {
    id: 'ors',
    name: 'ORS (oral rehydration salts)',
    examples: ['ORS sachet'],
    usedFor: 'loose motions, vomiting, dehydration, heat exhaustion',
    adultDose: '1 sachet in 1 litre of boiled and cooled water; sip after every loose stool',
    maxDose: 'Make a fresh solution every 24 hours',
    cautions: ['Use the exact amount of water written on the sachet'],
  },
  {
    id: 'cetirizine',
    name: 'Cetirizine 10 mg',
    examples: ['Rigix', 'Zyrtec'],
    usedFor: 'sneezing, runny nose, itchy eyes or skin from allergy',
    adultDose: '1 tablet (10 mg) once a day, preferably at night',
    maxDose: 'Not more than 10 mg in 24 hours',
    cautions: ['Can cause drowsiness: do not drive if sleepy'],
  },
  {
    id: 'loratadine',
    name: 'Loratadine 10 mg',
    examples: ['Softin', 'Claritin'],
    usedFor: 'allergy symptoms when you need to stay alert',
    adultDose: '1 tablet (10 mg) once a day',
    maxDose: 'Not more than 10 mg in 24 hours',
    cautions: ['Less drowsy than cetirizine; do not take both together'],
  },
  {
    id: 'saline_nasal',
    name: 'Saline nasal drops or spray',
    examples: ['Saline nasal drops'],
    usedFor: 'blocked or runny nose, sinus congestion',
    adultDose: '2–3 drops or sprays in each nostril, 3–4 times a day',
    maxDose: 'Safe for regular use',
    cautions: ['Plain salt water only; medicated decongestant sprays should not be used for more than 3 days'],
  },
  {
    id: 'lozenges',
    name: 'Throat lozenges',
    examples: ['Strepsils'],
    usedFor: 'sore or scratchy throat',
    adultDose: 'Dissolve 1 lozenge slowly in the mouth every 2–3 hours',
    maxDose: 'Not more than 12 in 24 hours',
    cautions: ['Not for children under 6'],
  },
  {
    id: 'antacid',
    name: 'Antacid suspension (aluminium / magnesium hydroxide)',
    examples: ['Gaviscon', 'Maalox'],
    usedFor: 'acidity, heartburn, burning in the upper stomach',
    adultDose: '10–20 mL after meals and at bedtime',
    maxDose: 'Not more than 4 times a day',
    cautions: ['Avoid with kidney disease', 'Take 2 hours apart from other medicines'],
  },
  {
    id: 'omeprazole',
    name: 'Omeprazole 20 mg',
    examples: ['Risek'],
    usedFor: 'repeated acidity or heartburn',
    adultDose: '1 capsule (20 mg) once a day, 30 minutes before breakfast',
    maxDose: 'Up to 14 days without seeing a doctor',
    cautions: ['See a doctor if heartburn continues after 2 weeks or you have trouble swallowing'],
  },
  {
    id: 'loperamide',
    name: 'Loperamide 2 mg',
    examples: ['Imodium'],
    usedFor: 'simple loose motions in adults (with ORS)',
    adultDose: '2 capsules (4 mg) after the first loose stool, then 1 capsule after each loose stool',
    maxDose: 'Not more than 4 capsules (8 mg) in 24 hours, for up to 2 days',
    cautions: ['Do not use if there is blood in the stool or fever'],
  },
  {
    id: 'clotrimazole',
    name: 'Clotrimazole 1% cream',
    examples: ['Canesten'],
    usedFor: 'ring-shaped itchy fungal rash (groin, feet, skin folds)',
    adultDose: 'Apply a thin layer 2–3 times a day',
    maxDose: 'Continue 2 weeks after the rash clears',
    cautions: ['Do not use steroid-mixed creams on fungal rashes'],
  },
  {
    id: 'calamine',
    name: 'Calamine lotion',
    examples: ['Calamine lotion'],
    usedFor: 'itchy skin, heat rash, insect bites',
    adultDose: 'Apply to the itchy area as needed',
    maxDose: 'For external use only',
    cautions: ['Not on broken or weeping skin'],
  },
  {
    id: 'simethicone',
    name: 'Simethicone 40–125 mg',
    examples: ['Simethicone tablets or drops'],
    usedFor: 'gas, bloating, wind pain',
    adultDose: 'After meals and at bedtime, as written on the pack',
    maxDose: 'As written on the pack',
    cautions: ['See a doctor if pain is severe or keeps coming back'],
  },
  {
    id: 'honey',
    name: 'Honey with warm water',
    examples: ['Shehad'],
    usedFor: 'dry cough and sore throat',
    adultDose: '1–2 teaspoons in warm water or tea, up to 4 times a day',
    maxDose: 'Never for babies under 1 year',
    cautions: ['Not suitable for diabetics'],
  },
];

const BY_ID = new Map(FORMULARY.map((m) => [m.id, m]));

/** The list shown to the model (ids + uses only; no doses). */
export function formularyForPrompt(): string {
  return FORMULARY.map((m) => `${m.id}: ${m.usedFor}`).join('\n');
}

export interface MedicineContext {
  /** Everything the patient wrote. */
  text: string;
  /** Known conditions and medicines from the record (lower-cased is fine). */
  record?: string | null;
  age?: number | null;
  urgency: 'routine' | 'soon' | 'emergency';
}

const FEVER = /fever|bukhar|bukhaar|بخار|temperature|garam/i;
const PREGNANT = /pregnan|hamal|حمل|umeed se|امید سے|breastfeed|doodh pila/i;
const CHILD = /\b(baby|infant|toddler|my (son|daughter|child|kid))\b|bach(a|i|ay|e|ey)\b|بچ/i;
const KIDNEY = /kidney|renal|gurd[ae]|گرد/i;
const LIVER = /liver|hepatitis|jigar|یرقان|جگر/i;
const ULCER = /ulcer|gastritis|stomach bleed|zakhm/i;
const BP = /hypertension|high blood pressure|\bbp\b|blood pressure/i;
const ASTHMA = /asthma|dama|دمہ/i;
const THINNER = /warfarin|blood thinner|clopidogrel|aspirin/i;
const DIABETES = /diabet|sugar|ذیابیطس/i;
const BLOODY = /blood in (the )?stool|khoon.*(latrine|potty|pakhana)|bloody/i;

/**
 * Turn the model's (or offline rules') picks into safe advice.
 * Returns the medicines plus an optional note explaining why none were given.
 */
export function resolveMedicines(picks: MedicinePick[], ctx: MedicineContext): { medicines: MedicineAdvice[]; note: string | null } {
  if (ctx.urgency === 'emergency') return { medicines: [], note: null };
  const all = `${ctx.text}\n${ctx.record ?? ''}`;
  if (PREGNANT.test(all)) {
    return { medicines: [], note: 'In pregnancy or while breastfeeding, please take medicines only on a doctor\'s or pharmacist\'s advice.' };
  }
  if ((ctx.age != null && ctx.age < 12) || CHILD.test(ctx.text)) {
    return { medicines: [], note: 'Children need doses by weight. Please ask a doctor or pharmacist before giving any medicine.' };
  }

  const seen = new Set<string>();
  const out: MedicineAdvice[] = [];
  // If ibuprofen is unsafe for this patient, offer paracetamol for the pain instead.
  const ibuprofenBlocked = FEVER.test(ctx.text) || KIDNEY.test(all) || ULCER.test(all) || BP.test(all) || ASTHMA.test(all) || THINNER.test(all);
  const wanted = picks.some((p) => String(p?.id ?? '').toLowerCase() === 'ibuprofen') && ibuprofenBlocked && !LIVER.test(all)
    ? [...picks, { id: 'paracetamol', reason: 'Safer pain relief for you than ibuprofen' }]
    : picks;
  for (const p of wanted) {
    const id = String(p?.id ?? '').trim().toLowerCase();
    const med = BY_ID.get(id);
    if (!med || seen.has(id)) continue; // unknown ids (anything outside the formulary) are dropped
    if (id === 'ibuprofen' && ibuprofenBlocked) continue;
    if (id === 'paracetamol' && LIVER.test(all)) continue;
    if (id === 'antacid' && KIDNEY.test(all)) continue;
    if (id === 'loperamide' && (FEVER.test(ctx.text) || BLOODY.test(ctx.text))) continue;
    if (id === 'honey' && DIABETES.test(all)) continue;
    seen.add(id);
    out.push({ ...med, reason: String(p?.reason ?? '').slice(0, 200) || med.usedFor });
    if (out.length === 3) break;
  }
  return { medicines: out, note: null };
}

/** Rule-based picks used when the AI is offline (and as a safety net). */
export function offlineMedicinePicks(text: string): MedicinePick[] {
  const t = text.toLowerCase();
  const picks: MedicinePick[] = [];
  const add = (id: string, reason: string) => picks.push({ id, reason });
  if (/throat|gala|گلا|tonsil/.test(t)) {
    add('lozenges', 'Soothes the sore throat');
    add('paracetamol', 'For throat pain and fever');
  }
  if (FEVER.test(t) || /body ache|jism (me|mein) dard|headache|(sar|sir) (me|mein)? ?dard|سر درد/.test(t)) add('paracetamol', 'For fever and aches');
  if (/diarrh|loose motion|dast|دست|vomit|ulti|الٹی/.test(t)) add('ors', 'Replaces water and salts lost');
  if (/sneez|allerg|runny nose|naak beh|chheenk|zukam|زکام/.test(t)) add('cetirizine', 'Eases sneezing and runny nose');
  if (/blocked nose|naak band|sinus|ناک بند/.test(t)) add('saline_nasal', 'Clears a blocked nose');
  if (/acidity|heartburn|tezabiyat|seene (me|mein) jalan|pait (me|mein) jalan|تیزابیت/.test(t)) add('antacid', 'Neutralises stomach acid');
  if (/ring|fungal|groin|daad|داد/.test(t)) add('clotrimazole', 'Treats fungal skin infection');
  else if (/itch|kharish|خارش|rash/.test(t)) add('calamine', 'Soothes itchy skin');
  if (/\bgas\b|bloat|aphara|اپھارہ/.test(t)) add('simethicone', 'Relieves gas and bloating');
  if (/cough|khansi|کھانسی/.test(t)) add('honey', 'Soothes a dry cough');
  if (/back pain|kamar|neck pain|muscle|sprain|moch|period pain/.test(t) && !FEVER.test(t)) add('ibuprofen', 'For muscle or joint pain');
  return picks;
}

import { FORMULARY, offlineMedicinePicks, resolveMedicines } from './medicines';

const ids = (r: ReturnType<typeof resolveMedicines>) => r.medicines.map((m) => m.id);
const base = { urgency: 'routine' as const };

describe('OTC medicine safety rules', () => {
  it('every formulary entry has a dose, a maximum and cautions', () => {
    for (const m of FORMULARY) {
      expect(m.adultDose.length).toBeGreaterThan(5);
      expect(m.maxDose.length).toBeGreaterThan(5);
      expect(Array.isArray(m.cautions)).toBe(true);
    }
  });

  it('drops anything that is not in the formulary (no antibiotics)', () => {
    const r = resolveMedicines([{ id: 'amoxicillin', reason: 'x' }, { id: 'PARACETAMOL', reason: 'fever' }], { ...base, text: 'fever' });
    expect(ids(r)).toEqual(['paracetamol']);
    expect(r.medicines[0].adultDose).toMatch(/every 4–6 hours/); // dose comes from the formulary
  });

  it('never gives ibuprofen with fever (dengue), kidney disease, ulcer, high BP or asthma', () => {
    const pick = [{ id: 'ibuprofen', reason: 'pain' }];
    expect(ids(resolveMedicines(pick, { ...base, text: 'bukhar aur jism mein dard' }))).toEqual(['paracetamol']);
    // ibuprofen is swapped for paracetamol when it is unsafe for this patient
    expect(ids(resolveMedicines(pick, { ...base, text: 'back pain', record: 'Known conditions: Hypertension' }))).toEqual(['paracetamol']);
    expect(ids(resolveMedicines(pick, { ...base, text: 'back pain', record: 'chronic kidney disease' }))).toEqual(['paracetamol']);
    expect(ids(resolveMedicines(pick, { ...base, text: 'back pain', record: 'kidney disease and hepatitis' }))).toEqual([]);
    expect(ids(resolveMedicines(pick, { ...base, text: 'back pain' }))).toEqual(['ibuprofen']);
  });

  it('gives nothing in emergencies, pregnancy or for children', () => {
    const pick = [{ id: 'paracetamol', reason: 'x' }];
    expect(resolveMedicines(pick, { urgency: 'emergency', text: 'chest pain' }).medicines).toEqual([]);
    const preg = resolveMedicines(pick, { ...base, text: 'I am pregnant and have a headache' });
    expect(preg.medicines).toEqual([]);
    expect(preg.note).toMatch(/pregnan/i);
    expect(resolveMedicines(pick, { ...base, text: 'bachay ko bukhar hai' }).note).toMatch(/Children/);
    expect(resolveMedicines(pick, { ...base, text: 'fever', age: 8 }).medicines).toEqual([]);
  });

  it('respects the record: no honey for diabetics, no paracetamol with liver disease', () => {
    expect(ids(resolveMedicines([{ id: 'honey', reason: '' }], { ...base, text: 'cough', record: 'Type 2 diabetes' }))).toEqual([]);
    expect(ids(resolveMedicines([{ id: 'paracetamol', reason: '' }], { ...base, text: 'fever', record: 'hepatitis B' }))).toEqual([]);
  });

  it('caps the list at 3 and removes duplicates', () => {
    const many = ['paracetamol', 'paracetamol', 'cetirizine', 'saline_nasal', 'lozenges'].map((id) => ({ id, reason: '' }));
    expect(ids(resolveMedicines(many, { ...base, text: 'cold' }))).toEqual(['paracetamol', 'cetirizine', 'saline_nasal']);
  });

  it('offline picks match common minor illnesses', () => {
    expect(offlineMedicinePicks('sore throat and fever').map((p) => p.id)).toEqual(expect.arrayContaining(['lozenges', 'paracetamol']));
    expect(offlineMedicinePicks('dast lag gaye hain').map((p) => p.id)).toContain('ors');
    expect(offlineMedicinePicks('chheenk aur naak beh rahi hai').map((p) => p.id)).toContain('cetirizine');
    expect(offlineMedicinePicks('groin mein ring jaisa daad').map((p) => p.id)).toContain('clotrimazole');
    expect(offlineMedicinePicks('kamar mein dard hai').map((p) => p.id)).toContain('ibuprofen');
  });
});

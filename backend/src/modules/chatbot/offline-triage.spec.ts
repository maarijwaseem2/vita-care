import { guessSpecialty, offlineConsult, refineSpecialty } from './offline-triage';
import { Specialty } from '../../common/enums';

describe('offline triage', () => {
  it('routes by keyword in all three languages', () => {
    expect(guessSpecialty('severe headache and dizziness')).toBe(Specialty.NEUROLOGY);
    expect(guessSpecialty('mere ghutnon aur kamar mein dard')).toBe(Specialty.OSTEOPOROSIS);
    expect(guessSpecialty('knee arthritis, swollen joint')).toBe(Specialty.OSTEOPOROSIS);
    expect(guessSpecialty('جلد پر خارش')).toBe(Specialty.DERMATOLOGY);
    expect(guessSpecialty('kaan mein dard hai')).toBe(Specialty.ENT);
    expect(guessSpecialty('feeling tired')).toBe(Specialty.GENERAL);
  });

  it('interviews for three turns, then assesses', () => {
    const msgs: { role: 'user' | 'assistant'; content: string }[] = [];
    const say = (text: string) => {
      msgs.push({ role: 'user', content: text });
      const r = offlineConsult(msgs, 'en');
      msgs.push({ role: 'assistant', content: r.reply });
      return r;
    };
    expect(say('I have itchy skin rash on my arms').quickReplies).toHaveLength(4);
    expect(say('More than 2 weeks').stage).toBe('interviewing');
    expect(say('Moderate').stage).toBe('interviewing');
    const final = say('None of these');
    expect(final.stage).toBe('assessment');
    expect(final.recommendedSpecialty).toBe(Specialty.DERMATOLOGY);
    expect(final.urgency).toBe('soon'); // > 2 weeks
    expect(final.summary?.chiefComplaint).toMatch(/rash/);
  });

  it('answers in Urdu script when asked', () => {
    const r = offlineConsult([{ role: 'user', content: 'سر میں درد' }], 'ur');
    expect(r.reply).toMatch(/[\u0600-\u06FF]/);
  });

  it('sharpens a vague department using the patient\'s words', () => {
    expect(refineSpecialty(Specialty.GENERAL, 'sore throat and fever since 2 days')).toBe(Specialty.ENT);
    expect(refineSpecialty(Specialty.GENERAL, 'gala kharab hai aur bukhar')).toBe(Specialty.ENT);
    // NICE NG59: new back pain → GP (pain relief, keep active); persistent or recurring → physiotherapy
    expect(refineSpecialty(Specialty.PHYSIOTHERAPY, 'kamar mein dard hai bhari cheez uthane se')).toBe(Specialty.GENERAL);
    expect(refineSpecialty(Specialty.GENERAL, 'teen mahine se kamar mein dard hai')).toBe(Specialty.PHYSIOTHERAPY);
    expect(refineSpecialty(Specialty.GENERAL, 'back pain keeps coming back, bar bar hota hai')).toBe(Specialty.PHYSIOTHERAPY);
    expect(refineSpecialty(Specialty.NEUROLOGY, 'abbu ko falij ke baad chalne mein mushkil hai')).toBe(Specialty.PHYSIOTHERAPY);
    expect(refineSpecialty(Specialty.GENERAL, 'abbu ko falij ke baad chalne mein mushkil hai')).toBe(Specialty.PHYSIOTHERAPY);
    expect(refineSpecialty(Specialty.GENERAL, 'accident ke baad tang mein akdan hai')).toBe(Specialty.PHYSIOTHERAPY);
    expect(refineSpecialty(Specialty.RADIOLOGY, 'my knee x-ray')).toBe(Specialty.RADIOLOGY);
    expect(refineSpecialty(Specialty.OSTEOPOROSIS, 'neck pain and stiffness from laptop work')).toBe(Specialty.PHYSIOTHERAPY);
    expect(refineSpecialty(null, 'ankle sprain while playing cricket')).toBe(Specialty.PHYSIOTHERAPY);
  });

  it('keeps a specific department the words support', () => {
    expect(refineSpecialty(Specialty.HEART_CARE, 'chest pain and palpitations')).toBe(Specialty.HEART_CARE);
    expect(refineSpecialty(Specialty.OSTEOPOROSIS, 'fell and my wrist bone may be fractured')).toBe(Specialty.OSTEOPOROSIS);
    expect(refineSpecialty(Specialty.GENERAL, 'fever and body ache')).toBe(Specialty.GENERAL);
  });

  it('ignores denied and past mentions when choosing a department', () => {
    expect(refineSpecialty(Specialty.GENERAL, 'Mujhe chest pain nahi hai, sirf khansi hai')).toBe(Specialty.GENERAL);
    expect(refineSpecialty(Specialty.GENERAL, 'No chest pain, just a sore throat for two days')).toBe(Specialty.ENT);
    expect(refineSpecialty(Specialty.GENERAL, 'Ammi ko 5 saal pehle falij hua tha, ab mujhe sar dard hai')).toBe(Specialty.NEUROLOGY);
    expect(refineSpecialty(Specialty.GENERAL, 'Neend nahi aati aur udaas rehta hoon')).toBe(Specialty.PSYCHIATRY);
    expect(refineSpecialty(Specialty.GENERAL, 'Beta khana nahi khata aur wazan kam hai')).toBe(Specialty.PEDIATRICS);
    expect(refineSpecialty(Specialty.GENERAL, 'I feel anxious and my heart races before exams')).toBe(Specialty.PSYCHIATRY);
    expect(refineSpecialty(Specialty.GENERAL, 'Lower back pain for three months')).toBe(Specialty.PHYSIOTHERAPY);
  });
});

import { guessSpecialty, offlineConsult } from './offline-triage';
import { Specialty } from '../../common/enums';

describe('offline triage', () => {
  it('routes by keyword in all three languages', () => {
    expect(guessSpecialty('severe headache and dizziness')).toBe(Specialty.NEUROLOGY);
    expect(guessSpecialty('mere ghutnon aur kamar mein dard')).toBe(Specialty.OSTEOPOROSIS);
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
});

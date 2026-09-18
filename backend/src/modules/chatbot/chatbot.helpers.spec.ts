import { mapSpecialty, parseStructuredReply } from './chatbot.helpers';
import { Specialty } from '../../common/enums';

/**
 * Pure unit tests — no database, no network, no Nest container.
 * These verify the two trickiest pieces of the AI Doctor: turning the model's
 * free-text department into our enum, and safely parsing the model's JSON.
 */
describe('chatbot.helpers', () => {
  describe('mapSpecialty()', () => {
    it('returns null for null / empty input', () => {
      expect(mapSpecialty(null)).toBeNull();
      expect(mapSpecialty('')).toBeNull();
    });

    it('maps neurology synonyms', () => {
      expect(mapSpecialty('Neurology')).toBe(Specialty.NEUROLOGY);
      expect(mapSpecialty('brain specialist')).toBe(Specialty.NEUROLOGY);
      expect(mapSpecialty('nerve pain clinic')).toBe(Specialty.NEUROLOGY);
    });

    it('maps heart / cardiology synonyms', () => {
      expect(mapSpecialty('Heart Care')).toBe(Specialty.HEART_CARE);
      expect(mapSpecialty('cardiology')).toBe(Specialty.HEART_CARE);
      expect(mapSpecialty('cardiac unit')).toBe(Specialty.HEART_CARE);
    });

    it('maps bone / osteoporosis / orthopaedic synonyms', () => {
      expect(mapSpecialty('Osteoporosis')).toBe(Specialty.OSTEOPOROSIS);
      expect(mapSpecialty('bone density')).toBe(Specialty.OSTEOPOROSIS);
      expect(mapSpecialty('orthopedics')).toBe(Specialty.OSTEOPOROSIS);
      expect(mapSpecialty('joint pain')).toBe(Specialty.OSTEOPOROSIS);
    });

    it('maps ENT synonyms', () => {
      expect(mapSpecialty('ENT')).toBe(Specialty.ENT);
      expect(mapSpecialty('ear nose and throat')).toBe(Specialty.ENT);
    });

    it('maps general physician synonyms', () => {
      expect(mapSpecialty('General Physician')).toBe(Specialty.GENERAL);
      expect(mapSpecialty('GP')).toBe(Specialty.GENERAL);
      expect(mapSpecialty('family medicine')).toBe(Specialty.GENERAL);
    });

    it('is case-insensitive', () => {
      expect(mapSpecialty('HEART')).toBe(Specialty.HEART_CARE);
      expect(mapSpecialty('nEuRo')).toBe(Specialty.NEUROLOGY);
    });

    it('returns null when nothing matches', () => {
      expect(mapSpecialty('dermatology')).toBeNull();
      expect(mapSpecialty('random text')).toBeNull();
    });
  });

  describe('parseStructuredReply()', () => {
    it('parses a clean JSON object', () => {
      const raw = JSON.stringify({
        reply: 'Please rest and stay hydrated.',
        recommendedSpecialty: 'General Physician',
        urgency: 'routine',
      });
      const result = parseStructuredReply(raw);
      expect(result.reply).toBe('Please rest and stay hydrated.');
      expect(result.recommendedSpecialty).toBe('General Physician');
      expect(result.urgency).toBe('routine');
    });

    it('strips ```json code fences before parsing', () => {
      const raw =
        '```json\n{"reply":"See a cardiologist.","recommendedSpecialty":"Heart Care","urgency":"soon"}\n```';
      const result = parseStructuredReply(raw);
      expect(result.reply).toBe('See a cardiologist.');
      expect(result.recommendedSpecialty).toBe('Heart Care');
      expect(result.urgency).toBe('soon');
    });

    it('falls back to routine urgency for an invalid urgency value', () => {
      const raw = JSON.stringify({
        reply: 'ok',
        recommendedSpecialty: null,
        urgency: 'critical', // not one of our allowed values
      });
      expect(parseStructuredReply(raw).urgency).toBe('routine');
    });

    it('defaults recommendedSpecialty to null when missing or wrong type', () => {
      const raw = JSON.stringify({ reply: 'ok', urgency: 'routine' });
      expect(parseStructuredReply(raw).recommendedSpecialty).toBeNull();
    });

    it('uses raw text as the reply when the output is not valid JSON', () => {
      const raw = 'I think you should drink water and rest today.';
      const result = parseStructuredReply(raw);
      expect(result.reply).toBe(raw);
      expect(result.recommendedSpecialty).toBeNull();
      expect(result.urgency).toBe('routine');
    });

    it('returns a friendly fallback for empty input', () => {
      const result = parseStructuredReply('');
      expect(result.reply).toMatch(/describe your symptoms/i);
      expect(result.urgency).toBe('routine');
    });

    it('recognises an emergency urgency', () => {
      const raw = JSON.stringify({
        reply: 'Call emergency services now.',
        recommendedSpecialty: 'Heart Care',
        urgency: 'emergency',
      });
      expect(parseStructuredReply(raw).urgency).toBe('emergency');
    });
  });
});

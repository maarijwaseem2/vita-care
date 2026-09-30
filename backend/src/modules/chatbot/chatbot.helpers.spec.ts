import { mapSpecialty, parseConsultReply, parseStructuredReply } from './chatbot.helpers';
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
      expect(mapSpecialty('random text')).toBeNull();
      expect(mapSpecialty('   ')).toBeNull();
    });

    it('maps the newer departments', () => {
      expect(mapSpecialty('Dermatology')).toBe(Specialty.DERMATOLOGY);
      expect(mapSpecialty('skin clinic')).toBe(Specialty.DERMATOLOGY);
      expect(mapSpecialty('paediatrician')).toBe(Specialty.PEDIATRICS);
      expect(mapSpecialty('Obstetrics & Gynaecology')).toBe(Specialty.GYNECOLOGY);
      expect(mapSpecialty('Psychiatry')).toBe(Specialty.PSYCHIATRY);
    });

    it('does not confuse "mental" or "patient" with ENT', () => {
      expect(mapSpecialty('mental health')).toBe(Specialty.PSYCHIATRY);
      expect(mapSpecialty('outpatient general clinic')).toBe(Specialty.GENERAL);
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

  describe('parseConsultReply()', () => {
    it('parses the full interview shape and caps list sizes', () => {
      const raw = JSON.stringify({
        reply: 'How long have you had it?',
        stage: 'interviewing',
        urgency: 'routine',
        recommendedSpecialty: null,
        quickReplies: ['Today', '2-3 days', 'A week', 'Longer', 'Extra'],
        possibleConditions: [],
      });
      const r = parseConsultReply(raw);
      expect(r.stage).toBe('interviewing');
      expect(r.quickReplies).toHaveLength(4);
      expect(r.summary).toBeNull();
    });

    it('parses an assessment with conditions and a clinical summary', () => {
      const raw = 'Here you go: ' + JSON.stringify({
        reply: 'This sounds like a tension headache.',
        stage: 'assessment',
        urgency: 'soon',
        recommendedSpecialty: 'Neurology',
        possibleConditions: [
          { name: 'Tension headache', likelihood: 'more likely', why: 'Band-like pain' },
          { name: 'Migraine', likelihood: 'weird', why: 'Light sensitivity' },
          { name: '' },
        ],
        summary: { chiefComplaint: 'Headache x3 days', associatedSymptoms: ['nausea'] },
      });
      const r = parseConsultReply(raw);
      expect(r.stage).toBe('assessment');
      expect(r.possibleConditions).toHaveLength(2);
      expect(r.possibleConditions[1].likelihood).toBe('possible');
      expect(r.summary?.chiefComplaint).toBe('Headache x3 days');
      expect(r.summary?.associatedSymptoms).toEqual(['nausea']);
    });

    it('survives garbage', () => {
      const r = parseConsultReply('not json at all');
      expect(r.reply).toBe('not json at all');
      expect(r.quickReplies).toEqual([]);
      expect(r.stage).toBe('interviewing');
    });
  });
});

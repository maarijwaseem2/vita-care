import { knowledgeForPrompt, retrieveKnowledge } from './knowledge';

describe('triage knowledge retrieval', () => {
  it('finds the right cards across languages', () => {
    expect(retrieveKnowledge('mujhe 3 din se bukhar hai')[0].id).toBe('fever_adult');
    expect(retrieveKnowledge('severe headache since morning')[0].id).toBe('headache');
    expect(retrieveKnowledge('bachay ko dast lag gaye hain').map((c) => c.id)).toEqual(
      expect.arrayContaining(['child_fever', 'diarrhoea']),
    );
    expect(retrieveKnowledge('hello')).toEqual([]);
  });
  it('formats cards for the prompt', () => {
    const text = knowledgeForPrompt(retrieveKnowledge('chest pain'));
    expect(text).toMatch(/Red flags/);
    expect(text).toMatch(/Heart Care/);
  });

  it('routes musculoskeletal and throat complaints to the right cards', () => {
    expect(retrieveKnowledge('kamar mein dard hai')[0].department).toMatch(/^General Physician for new pain.*Physiotherapy if it lasts over 6 weeks/);
    expect(retrieveKnowledge('falij ke baad chalne mein mushkil')[0].id).toBe('rehab');
    expect(retrieveKnowledge('sore throat, pain on swallowing')[0].department).toBe('ENT');
    expect(retrieveKnowledge('rehab after stroke, walk again')[0].id).toBe('rehab');
  });
});

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
});

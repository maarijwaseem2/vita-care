import { analyseRedFlags, detectRedFlags, maxUrgency, urgencyFromFlags, emergencyInfo } from './safety';
import { detectLanguage } from './language';

const ids = (text: string) => detectRedFlags(text).map((f) => f.id);

describe('red-flag safety guard', () => {
  it.each([
    ['I have crushing chest pain and sweating', 'chest_pain'],
    ['mere seene mein dard ho raha hai', 'chest_pain'],
    ['میرے سینے میں درد ہے', 'chest_pain'],
    ["I can't breathe properly", 'breathing'],
    ['saans nahi aa rahi', 'breathing'],
    ['سانس لینے میں مشکل ہے', 'breathing'],
    ['my father has slurred speech and his face is drooping', 'stroke'],
    ['ammi ko falij ka hamla laga', 'stroke'],
    ['she fainted in the kitchen', 'unconscious'],
    ['bhai be hosh ho gaya', 'unconscious'],
    ['vomiting blood since morning', 'bleeding'],
    ['khoon nahi ruk raha', 'bleeding'],
    ['my son had a seizure', 'seizure'],
    ['I want to end my life', 'self_harm'],
    ['khudkushi ke khayal aate hain', 'self_harm'],
    ['میں خودکشی کے بارے میں سوچتا ہوں', 'self_harm'],
    ['my lips are swollen after eating nuts', 'anaphylaxis'],
    ['he swallowed bleach', 'poisoning'],
    ['bhai ne neend ki goliyon ka pura patta kha liya', 'poisoning'],
    ['ammi ne bohat saari tablets ek saath kha li', 'poisoning'],
    ['I am pregnant and bleeding', 'pregnancy_bleeding'],
    ['high fever and stiff neck', 'meningitis_signs'],
    ['bachay ko bukhar hai', 'high_fever_infant'],
    // spelling variants and heart phrasing
    ['seenay mein dard ho raha hai', 'chest_pain'],
    ['chesst pain since an hour', 'chest_pain'],
    ['dil mein dard hai', 'chest_pain'],
    ['دل میں درد ہو رہا ہے', 'chest_pain'],
    // "won't stop" is not a denial
    ['seene ka dard nahi ja raha', 'chest_pain'],
    // someone else, happening now
    ['abbu ko abhi falij ka hamla hua hai', 'stroke'],
    ['sir par chot lagi hai', 'head_injury'],
    // "after eating" must NOT hide chest pain
    ['khana khane ke baad seene mein dard ho raha hai', 'chest_pain'],
    ['chest pain after walking up the stairs', 'chest_pain'],
    // added after the first evaluation run
    ['mere seene mein bohat dard hai aur paseena aa raha hai', 'chest_pain'],
    ['sudden worst headache of my life', 'thunderclap_headache'],
    ['my baby is 2 months old and has fever', 'young_infant_fever'],
    ['bachay ko tez bukhar hai aur doodh nahi pee raha', 'child_danger_signs'],
    ['my father is confused after being in the heat all day', 'heatstroke'],
    ['abbu ko loo lag gayi hai', 'heatstroke'],
  ])('flags "%s" as %s', (text, id) => {
    expect(ids(text)).toContain(id);
  });

  it.each([
    'I have a mild headache since yesterday',
    'sore throat and runny nose',
    'mujhe halka sa zukam hai',
    'knee pain when I climb stairs',
    'I am pregnant, is it safe to eat mango?',
    'I have a fever',
    // negated
    'mujhe chest pain nahi hai, sirf khansi hai',
    'I have no chest pain, just a cough',
    'no difficulty breathing, only a runny nose',
    'seene mein dard nahi, pait mein dard hai',
    'سینے میں درد نہیں ہے، صرف کھانسی ہے',
    // in the past
    'meri ammi ko 5 saal pehle falij hua tha, ab mujhe sar dard hai',
    'history of seizure in childhood, now I have a cold',
    // stroke rehabilitation is past history, not a new stroke
    'abbu ko falij ke baad chalne mein mushkil hai, physio chahiye',
    'after his stroke he needs help walking',
    'I read about stroke, how to prevent it?',
    'my 2 year old son is teething',
    'baby is drinking milk well, just a runny nose',
  ])('does not flag routine text "%s"', (text) => {
    expect(detectRedFlags(text).filter((f) => f.urgency === 'emergency')).toEqual([]);
  });

  it('keeps negated and historical mentions for the doctor', () => {
    const neg = analyseRedFlags('no chest pain');
    expect(neg[0]).toMatchObject({ id: 'chest_pain', status: 'negated' });
    const hist = analyseRedFlags('ammi ko 5 saal pehle falij hua tha');
    expect(hist[0]).toMatchObject({ id: 'stroke', status: 'historical' });
  });

  it('a question plus a real symptom still counts', () => {
    expect(ids('what are the symptoms of a heart attack? I have chest pain right now')).toContain('chest_pain');
  });

  it('an active mention in one clause wins over a negated one elsewhere', () => {
    expect(ids('no fever. but now chest pain is getting worse')).toContain('chest_pain');
    expect(ids('pehle chest pain nahi tha, ab seene mein dard hai')).toContain('chest_pain');
  });

  it('can only escalate urgency', () => {
    expect(maxUrgency('routine', 'emergency')).toBe('emergency');
    expect(maxUrgency('emergency', 'routine')).toBe('emergency');
    expect(maxUrgency('soon', 'routine')).toBe('soon');
    expect(urgencyFromFlags([])).toBe('routine');
    expect(urgencyFromFlags(detectRedFlags('chest pain'))).toBe('emergency');
  });

  it('adds the mental-health helpline for self-harm', () => {
    const info = emergencyInfo(detectRedFlags('I want to die'), 'en');
    expect(info.contacts[0].number).toBe('03117786264');
    expect(info.contacts.map((c) => c.number)).toContain('1122');
  });
});

describe('language detection', () => {
  it('detects the three input styles', () => {
    expect(detectLanguage('I have a headache since morning')).toBe('en');
    expect(detectLanguage('mujhe kal se bukhar hai aur sar mein dard')).toBe('roman-ur');
    expect(detectLanguage('مجھے بخار ہے')).toBe('ur');
  });
});

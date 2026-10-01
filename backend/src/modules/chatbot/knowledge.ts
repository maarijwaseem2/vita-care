/**
 * Curated triage knowledge base (retrieval-augmented generation).
 *
 * Short, structured guidance per presenting complaint, adapted from standard
 * primary-care triage practice (history questions, red flags, department).
 * The most relevant 2–3 cards are placed in the model's prompt so its
 * questions and warnings are grounded rather than improvised.
 *
 * A 2026 benchmark found adding guideline retrieval significantly improved
 * accuracy of open-weight models including Qwen3 (Diagnostics 16:2456).
 *
 * IMPORTANT: demo content. A clinician must review and extend these cards
 * (ideally from national guidelines) before real-world use.
 */
export interface KnowledgeCard {
  id: string;
  title: string;
  match: RegExp;
  askAbout: string[];
  redFlags: string[];
  department: string;
  selfCare: string;
}

export const KNOWLEDGE: KnowledgeCard[] = [
  {
    id: 'chest_pain', title: 'Chest pain',
    match: /chest|seen[ae]|sine|chhati|سینے|dil|heart|palpitat|dhadkan/,
    askAbout: ['onset and duration', 'pressure vs sharp pain', 'spread to arm, jaw or back', 'sweating, breathlessness, nausea', 'worse on exertion', 'diabetes, BP, smoking'],
    redFlags: ['pressure-like pain > 5 minutes', 'pain spreading to arm/jaw', 'sweating or breathlessness', 'fainting'],
    department: 'Heart Care',
    selfCare: 'None until cardiac causes are excluded; if red flags, emergency now.',
  },
  {
    id: 'headache', title: 'Headache',
    match: /headache|(sar|sir) ?(me|mein|main)? ?dard|migraine|سر/,
    askAbout: ['sudden or gradual onset', 'one side or both', 'throbbing vs pressure', 'nausea, light sensitivity', 'fever, neck stiffness', 'weakness, speech or vision change', 'BP history'],
    redFlags: ['sudden worst-ever headache', 'fever with stiff neck', 'weakness, confusion or speech change', 'after head injury', 'new headache over age 50'],
    department: 'Neurology',
    selfCare: 'Rest in a dark room, fluids, paracetamol as labelled; keep a headache diary.',
  },
  {
    id: 'fever_adult', title: 'Fever in adults',
    match: /fever|bukhar|bukhaar|بخار|temperature|garam/,
    askAbout: ['how many days', 'highest temperature', 'chills and rigors', 'rash, bleeding gums (dengue)', 'cough, urinary burning, diarrhoea', 'recent travel or flood water'],
    redFlags: ['bleeding or severe abdominal pain (dengue)', 'confusion', 'breathing difficulty', 'fever > 3 days without improvement', 'stiff neck'],
    department: 'General Physician',
    selfCare: 'Fluids and paracetamol; avoid aspirin/ibuprofen until dengue is excluded.',
  },
  {
    id: 'child_fever', title: 'Sick child (IMCI-style danger signs)',
    match: /baby|infant|child|bach(a|i|ay|e)|بچ|beta|beti|son|daughter/,
    askAbout: ['age in months', 'feeding and drinking', 'urine output', 'breathing speed', 'rash', 'fits', 'activity level'],
    redFlags: ['not able to drink or breastfeed', 'vomits everything', 'convulsions', 'lethargic or unconscious', 'fast or difficult breathing', 'fever under 3 months of age'],
    department: 'Pediatrics',
    selfCare: 'Frequent fluids or breastfeeds; paracetamol by weight; no aspirin for children.',
  },
  {
    id: 'breathing', title: 'Cough and breathlessness',
    match: /cough|khansi|کھانسی|breath|saa?ns|سانس|wheez|asthma|dama/,
    askAbout: ['duration of cough', 'phlegm or blood', 'fever', 'breathless at rest or on walking', 'wheeze', 'smoking', 'TB contact'],
    redFlags: ['breathless at rest', 'blue lips', 'coughing blood', 'chest pain', 'cough > 2 weeks with weight loss (TB)'],
    department: 'General Physician',
    selfCare: 'Warm fluids, steam, rest; seek care if breathing worsens.',
  },
  {
    id: 'abdominal', title: 'Abdominal pain',
    match: /stomach|abdom|pait|pet|پیٹ|belly|acidity|gas/,
    askAbout: ['location of pain', 'constant or cramping', 'vomiting, diarrhoea, constipation', 'blood in stool or vomit', 'fever', 'pregnancy possibility', 'relation to food'],
    redFlags: ['severe constant pain', 'rigid abdomen', 'blood in vomit or black stool', 'pain in pregnancy', 'unable to pass stool or gas'],
    department: 'General Physician',
    selfCare: 'Small light meals, fluids; avoid painkillers until assessed if pain is severe.',
  },
  {
    id: 'diarrhoea', title: 'Diarrhoea and vomiting',
    match: /diarrh|loose motion|dast|دست|vomit|ulti|qay|الٹی/,
    askAbout: ['number of episodes per day', 'blood in stool', 'urine output', 'able to keep fluids down', 'fever', 'others ill (food/water)'],
    redFlags: ['very little urine', 'blood in stool', 'unable to keep any fluid down', 'confusion or extreme weakness'],
    department: 'General Physician',
    selfCare: 'ORS in small frequent sips; continue normal food when possible.',
  },
  {
    id: 'musculoskeletal', title: 'Back, neck and muscle pain, sprains',
    match: /back ?pain|backache|kamar|کمر|neck|gardan|sprain|moch|موچ|strain|stiff|akdan|posture|sciatica|slip ?disc|muscle|pathon|sports injury|ligament/,
    askAbout: ['where exactly and since when', 'injury, lifting or long sitting', 'pain spreading down the leg or arm', 'numbness or weakness', 'bladder or bowel changes', 'fever or weight loss', 'job and daily posture'],
    redFlags: ['leg weakness or numbness', 'loss of bladder or bowel control', 'back pain with fever', 'severe pain after a fall or accident (possible fracture)', 'unexplained weight loss'],
    department: 'General Physician for new pain (most settles in 2–6 weeks with pain relief and staying active); Physiotherapy if it lasts over 6 weeks, keeps coming back, follows an injury, or there is sciatica, a sprain or stiffness',
    selfCare: 'Stay gently active (no bed rest), warm compress, short walks, correct sitting posture; simple pain relief.',
  },
  {
    id: 'rehab', title: 'Rehabilitation after stroke (falij), accident, surgery or fracture',
    match: /rehab|physio|after (surgery|operation|stroke|fracture|accident)|(falij|stroke|accident|operation|fracture) (ke|kay) ba+d|paraly|falij|فالج|plaster|frozen shoulder|walk again|chalne (me|mein) (mushkil|dikkat)|recovery exercise/,
    askAbout: ['what happened and when', 'what movements are hard now', 'pain level', 'walking aid used', 'falls at home'],
    redFlags: ['new weakness or confusion', 'calf swelling or pain after surgery', 'wound redness with fever'],
    department: 'Physiotherapy',
    selfCare: 'Follow the exercises given at discharge; keep the home safe from falls.',
  },
  {
    id: 'bones_joints', title: 'Joints, bones and fractures',
    match: /joint|jor\b|جوڑ|knee|ghutn|گھٹن|bone|haddi|ہڈی|fracture|arthrit|osteopor|gout|swollen joint/,
    askAbout: ['which joints', 'swelling, redness or warmth', 'morning stiffness duration', 'injury or fall', 'age and menopause (bone density)'],
    redFlags: ['hot swollen joint with fever', 'unable to bear weight after an injury', 'deformity after a fall'],
    department: 'Osteoporosis',
    selfCare: 'Rest the joint for a day or two, cold pack for swelling, then gentle movement.',
  },
  {
    id: 'skin', title: 'Skin rash and itching',
    match: /rash|itch|kharish|خارش|skin|jild|جلد|daane|pimple|acne|eczema/,
    askAbout: ['where on the body', 'ring-shaped or spreading', 'itching', 'new medicine or food', 'fever', 'creams already used (steroids?)'],
    redFlags: ['rash with fever and feeling very unwell', 'blistering or peeling skin', 'swelling of lips or tongue', 'rash that does not fade on pressure'],
    department: 'Dermatology',
    selfCare: 'Keep skin dry, loose cotton clothes; avoid steroid-mixed creams without advice.',
  },
  {
    id: 'ent', title: 'Ear, nose and throat (including sore throat with fever)',
    match: /ear|kaan|کان|throat|gala|گلا|nose|naak|ناک|sinus|tonsil|hearing|swallow|nigal/,
    askAbout: ['duration', 'fever', 'ear discharge or hearing loss', 'difficulty swallowing', 'facial pain', 'dizziness'],
    redFlags: ['unable to swallow saliva', 'drooling or muffled voice', 'swelling behind the ear', 'sudden hearing loss'],
    department: 'ENT',
    selfCare: 'Warm salt-water gargles 3–4 times a day, warm fluids, rest; keep ears dry.',
  },
  {
    id: 'urinary', title: 'Urinary symptoms',
    match: /urin|peshab|پیشاب|burning|jalan|kidney|gurda/,
    askAbout: ['burning or frequency', 'blood in urine', 'fever', 'back or side pain', 'pregnancy', 'diabetes'],
    redFlags: ['fever with back pain', 'unable to pass urine', 'blood clots in urine', 'symptoms in pregnancy'],
    department: 'General Physician',
    selfCare: 'Drink more water; see a doctor for testing before antibiotics.',
  },
  {
    id: 'pregnancy', title: 'Pregnancy concerns',
    match: /pregnan|hamal|حمل|umeed se|period|mahwari|ماہواری|pcos/,
    askAbout: ['weeks of pregnancy or last period date', 'bleeding', 'abdominal pain', 'baby movements', 'headache or swelling', 'fever'],
    redFlags: ['bleeding in pregnancy', 'severe abdominal pain', 'severe headache with blurred vision or swelling', 'reduced baby movements', 'fits'],
    department: 'Gynecology',
    selfCare: 'Keep antenatal appointments; do not take new medicines without advice.',
  },
  {
    id: 'dizziness', title: 'Dizziness and fainting',
    match: /dizz|chakkar|چکر|faint|behosh|vertigo|lightheaded/,
    askAbout: ['spinning vs light-headed', 'fainted fully', 'palpitations', 'chest pain', 'recent diarrhoea or poor intake', 'diabetes medicines'],
    redFlags: ['fainting during exertion', 'fainting with chest pain or palpitations', 'weakness or speech change', 'low sugar in a diabetic'],
    department: 'General Physician',
    selfCare: 'Sit or lie down, fluids; diabetics check sugar.',
  },
  {
    id: 'mental', title: 'Anxiety, low mood, sleep',
    match: /anxi|ghabrahat|گھبراہٹ|depress|udaas|اداس|sleep|neend|نیند|stress|panic|tension/,
    askAbout: ['how long', 'effect on work, study, family', 'sleep and appetite', 'panic attacks', 'thoughts of self-harm', 'substance use'],
    redFlags: ['thoughts of self-harm or suicide', 'hearing voices or severe confusion', 'not eating or drinking'],
    department: 'Psychiatry',
    selfCare: 'Regular sleep times, limit caffeine, talk to someone trusted; Umang 0311 7786264.',
  },
  {
    id: 'diabetes', title: 'Diabetes symptoms or high sugar',
    match: /diabet|sugar|shugar|ذیابیطس|thirst|pyaas/,
    askAbout: ['known diabetic or new symptoms', 'recent readings', 'thirst and urination', 'vomiting', 'medicines missed', 'foot wounds'],
    redFlags: ['vomiting with very high sugar', 'drowsiness or confusion', 'very low sugar with sweating or shaking', 'infected foot wound'],
    department: 'General Physician',
    selfCare: 'Fluids, regular medicines; check sugar more often when unwell.',
  },
  {
    id: 'blood_pressure', title: 'High blood pressure',
    match: /\bbp\b|blood pressure|hypertension|فشار|pressure high/,
    askAbout: ['recent readings', 'headache', 'chest pain or breathlessness', 'vision change', 'medicines taken today'],
    redFlags: ['reading ≥ 180/120 with symptoms', 'chest pain', 'weakness or speech change', 'severe headache with vision change'],
    department: 'Heart Care',
    selfCare: 'Rest and recheck after 5 minutes; take prescribed medicines; reduce salt.',
  },
  {
    id: 'heat', title: 'Heat illness',
    match: /heat|loo|garmi|گرمی|sunstroke|dhoop/,
    askAbout: ['time in heat', 'confusion', 'sweating stopped', 'vomiting', 'fluid intake'],
    redFlags: ['confusion or fainting', 'very hot dry skin', 'seizure'],
    department: 'General Physician',
    selfCare: 'Shade, cool water sponging, ORS; emergency if confused.',
  },
];

/** Pick the most relevant cards for the conversation (keyword retrieval). */
export function retrieveKnowledge(text: string, max = 3): KnowledgeCard[] {
  const t = text.toLowerCase();
  return KNOWLEDGE.map((card) => ({ card, hits: (t.match(new RegExp(card.match.source, 'g')) ?? []).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, max)
    .map((x) => x.card);
}

export function knowledgeForPrompt(cards: KnowledgeCard[]): string {
  if (!cards.length) return '';
  return cards
    .map(
      (c) =>
        `[${c.title}] Ask about: ${c.askAbout.join('; ')}. Red flags: ${c.redFlags.join('; ')}. ` +
        `Usual department: ${c.department}. Safe self-care: ${c.selfCare}`,
    )
    .join('\n');
}

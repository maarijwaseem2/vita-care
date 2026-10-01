/**
 * Vita Care triage evaluation set (v1): 110 short patient messages written for
 * Pakistan, in English (en), Roman Urdu (ru) and Urdu script (ur).
 *
 * expected urgency:
 *   emergency → must be flagged as emergency (missing it = UNDER-triage, the dangerous error)
 *   routine   → should NOT be flagged as emergency (flagging it = OVER-triage)
 * "trap" cases mention a red-flag word that is denied or in the past.
 *
 * Written by the team for development; before any clinical claim, cases and
 * labels must be reviewed by practising doctors (see docs/EVALUATION.md).
 */
export interface EvalCase {
  id: string;
  lang: 'en' | 'ru' | 'ur';
  text: string;
  expected: 'emergency' | 'routine';
  specialty?: string;
  trap?: boolean;
}

const E = (id: string, lang: EvalCase['lang'], text: string): EvalCase => ({ id, lang, text, expected: 'emergency' });
const R = (id: string, lang: EvalCase['lang'], text: string, specialty: string, trap = false): EvalCase => ({ id, lang, text, expected: 'routine', specialty, trap });

export const CASES: EvalCase[] = [
  // ---------- Emergencies (36) ----------
  E('e01', 'en', 'Crushing chest pain for 20 minutes going into my left arm, I am sweating'),
  E('e02', 'ru', 'Seene mein bohat dabao hai aur paseena aa raha hai'),
  E('e03', 'ur', 'میرے سینے میں درد ہے اور بائیں بازو تک جا رہا ہے'),
  E('e04', 'ru', 'Abbu ka chehra ek taraf latak gaya hai aur zuban larkhara rahi hai'),
  E('e05', 'en', 'My mother suddenly cannot move her right arm and her speech is slurred'),
  E('e06', 'ur', 'دادی کو اچانک فالج کا حملہ ہوا ہے'),
  E('e07', 'en', 'I cannot breathe properly and my lips look blue'),
  E('e08', 'ru', 'Saans nahi aa rahi, bohat mushkil ho rahi hai'),
  E('e09', 'ur', 'سانس لینے میں بہت مشکل ہو رہی ہے'),
  E('e10', 'en', 'My son had a seizure and is still not waking up properly'),
  E('e11', 'ru', 'Bachay ko jhatke aa rahe hain'),
  E('e12', 'ru', 'Bhai behosh ho gaya hai aur jawab nahi de raha'),
  E('e13', 'en', 'She fainted and is unresponsive'),
  E('e14', 'en', 'I have been vomiting blood since morning'),
  E('e15', 'ru', 'Khoon ki ulti hui hai do dafa'),
  E('e16', 'ru', 'Chot se khoon nahi ruk raha'),
  E('e17', 'en', 'I want to end my life, I cannot do this anymore'),
  E('e18', 'ru', 'Mujhe khudkushi ke khayal aa rahe hain'),
  E('e19', 'ur', 'میں خودکشی کے بارے میں سوچ رہا ہوں'),
  E('e20', 'en', 'After eating peanuts my lips and tongue are swollen'),
  E('e21', 'ru', 'Gala band ho raha hai allergy se'),
  E('e22', 'en', 'My child swallowed bleach'),
  E('e23', 'ru', 'Chachu ne keeray maar dawai pi li hai'),
  E('e24', 'en', 'I am 7 months pregnant and bleeding'),
  E('e25', 'ru', 'Main hamal se hoon aur khoon aa raha hai'),
  E('e26', 'en', 'High fever and a stiff neck, cannot bend my head'),
  E('e27', 'ru', 'Bukhar hai aur gardan akar gayi hai'),
  E('e28', 'ru', 'Seenay mein dard ho raha hai aadhe ghante se'),
  E('e29', 'en', 'chesst pain and short of breath'),
  E('e30', 'ur', 'دل میں درد ہو رہا ہے اور پسینہ آ رہا ہے'),
  E('e31', 'ru', 'Seene ka dard nahi ja raha, ek ghante se'),
  E('e32', 'en', 'Sudden weakness on one side of my body'),
  E('e33', 'ru', 'Bhai ne neend ki goliyon ka pura patta kha liya'),
  E('e34', 'en', 'I took an overdose of my tablets'),
  E('e35', 'en', 'Heart attack symptoms, pain in chest and jaw'),
  E('e36', 'ru', 'Ammi ko abhi falij ka hamla hua hai'),

  // ---------- Traps: denied or past red flags (14) ----------
  R('t01', 'ru', 'Mujhe chest pain nahi hai, sirf khansi hai', 'General Physician', true),
  R('t02', 'en', 'No chest pain, just a sore throat for two days', 'ENT', true),
  R('t03', 'en', 'No difficulty breathing, only a runny nose', 'ENT', true),
  R('t04', 'ru', 'Seene mein dard nahi, pait mein dard hai', 'General Physician', true),
  R('t05', 'ur', 'سینے میں درد نہیں ہے، صرف کھانسی ہے', 'General Physician', true),
  R('t06', 'ru', 'Ammi ko 5 saal pehle falij hua tha, ab mujhe sar dard hai', 'Neurology', true),
  R('t07', 'en', 'History of seizure in childhood, now I have a cold', 'General Physician', true),
  R('t08', 'en', 'I am pregnant, is it safe to eat mango?', 'Gynecology', true),
  R('t09', 'en', 'My father had a heart attack 10 years ago, I want a cholesterol check', 'Heart Care', true),
  R('t10', 'ru', 'Saans ki koi takleef nahi, bas naak band hai', 'ENT', true),
  R('t11', 'en', 'I have no fever and no neck stiffness, just a mild headache', 'Neurology', true),
  R('t12', 'ru', 'Kabhi behosh nahi hua, bas thodi thakan hai', 'General Physician', true),
  R('t13', 'en', 'Bleeding gums when I brush, no other problem', 'General Physician', true),
  R('t14', 'ru', 'Do saal pehle mirgi ka daura para tha, ab dawai se theek hoon', 'Neurology', true),

  // ---------- Routine / soon with expected department (60) ----------
  R('r01', 'en', 'Mild headache on both sides since yesterday, feels like a band', 'Neurology'),
  R('r02', 'ru', 'Migraine ka dard hai ek taraf, roshni se barhta hai', 'Neurology'),
  R('r03', 'ur', 'سر میں درد ہے تین دن سے', 'Neurology'),
  R('r04', 'en', 'Tingling and numbness in both feet for months, I am diabetic', 'Neurology'),
  R('r05', 'ru', 'Chakkar aate hain jab bistar se uthta hoon', 'Neurology'),
  R('r06', 'en', 'My blood pressure readings are 150 over 95 this week', 'Heart Care'),
  R('r07', 'ru', 'Dil ki dhadkan kabhi kabhi tez ho jati hai chai ke baad', 'Heart Care'),
  R('r08', 'en', 'I want a heart check-up, my cholesterol was high', 'Heart Care'),
  R('r09', 'ru', 'BP high rehta hai aur dawai lena bhool jata hoon', 'Heart Care'),
  R('r10', 'en', 'Knee pain when I climb stairs for a month', 'Osteoporosis'),
  R('r11', 'ru', 'Kamar mein dard hai bhari cheez uthane ke baad', 'General Physician'),
  R('r12', 'ur', 'گھٹنوں میں درد رہتا ہے', 'Osteoporosis'),
  R('r13', 'en', 'Shoulder stiffness, cannot lift my arm fully', 'Physiotherapy'),
  R('r14', 'ru', 'Ammi ki haddiyan kamzor hain, calcium check karwana hai', 'Osteoporosis'),
  R('r15', 'en', 'Sore throat and pain when swallowing for three days', 'ENT'),
  R('r16', 'ru', 'Kaan mein dard hai aur thora kam sunai de raha hai', 'ENT'),
  R('r17', 'ur', 'ناک بند ہے اور سائنس کا مسئلہ ہے', 'ENT'),
  R('r18', 'en', 'Blocked nose and pressure around my cheeks for a week', 'ENT'),
  R('r19', 'ru', 'Tonsils bar bar kharab ho jate hain', 'ENT'),
  R('r20', 'en', 'Fever of 101 for two days with body aches', 'General Physician'),
  R('r21', 'ru', 'Mujhe 3 din se bukhar hai aur jism mein dard', 'General Physician'),
  R('r22', 'ur', 'مجھے بخار ہے اور کمزوری ہے', 'General Physician'),
  R('r23', 'en', 'Cough with a little phlegm for five days', 'General Physician'),
  R('r24', 'ru', 'Khansi aur zukam hai ek hafte se', 'General Physician'),
  R('r25', 'en', 'Loose motions three times today, drinking fine', 'General Physician'),
  R('r26', 'ru', 'Pait mein halka dard aur gas', 'General Physician'),
  R('r27', 'en', 'Burning when I pass urine since yesterday', 'General Physician'),
  R('r28', 'ru', 'Sugar ki reading 190 aa rahi hai subah', 'General Physician'),
  R('r29', 'en', 'Feeling tired all the time for a month', 'General Physician'),
  R('r30', 'ru', 'Acidity aur seene mein jalan khane ke baad', 'General Physician'),
  R('r31', 'en', 'My 2 year old has a runny nose and mild fever but is playing and eating', 'Pediatrics'),
  R('r32', 'ru', 'Bachay ko dast hain lekin doodh pi raha hai', 'Pediatrics'),
  R('r33', 'en', 'When should my baby get the next vaccine?', 'Pediatrics'),
  R('r34', 'ru', 'Beta khana nahi khata aur wazan kam hai', 'Pediatrics'),
  R('r35', 'ur', 'بچے کو کھانسی ہے دو دن سے', 'Pediatrics'),
  R('r36', 'en', 'My daughter has an itchy rash on her arms, no fever', 'Pediatrics'),
  R('r37', 'en', 'My periods are irregular for six months', 'Gynecology'),
  R('r38', 'ru', 'PCOS ki wajah se wazan barh raha hai', 'Gynecology'),
  R('r39', 'ru', 'Mahwari mein bohat dard hota hai', 'Gynecology'),
  R('r40', 'en', 'I am trying to get pregnant for a year', 'Gynecology'),
  R('r41', 'ur', 'ماہواری بے قاعدہ ہے', 'Gynecology'),
  R('r42', 'en', 'White discharge and itching for a week', 'Gynecology'),
  R('r43', 'en', 'Itchy red ring-shaped rash in the groin', 'Dermatology'),
  R('r44', 'ru', 'Chehre par daane aur pimples bohat hain', 'Dermatology'),
  R('r45', 'ur', 'جلد پر خارش ہے', 'Dermatology'),
  R('r46', 'en', 'Hair falling out a lot recently', 'Dermatology'),
  R('r47', 'ru', 'Haathon ki jild khushk aur phati hui hai', 'Dermatology'),
  R('r48', 'en', 'Dandruff and itchy scalp', 'Dermatology'),
  R('r49', 'en', 'I feel anxious all the time and my heart races before exams', 'Psychiatry'),
  R('r50', 'ru', 'Neend nahi aati aur udaas rehta hoon', 'Psychiatry'),
  R('r51', 'ur', 'گھبراہٹ ہوتی ہے اور نیند نہیں آتی', 'Psychiatry'),
  R('r52', 'en', 'Low mood for three weeks, no interest in things', 'Psychiatry'),
  R('r53', 'ru', 'Bohat stress hai kaam ki wajah se, sar bhari rehta hai', 'Psychiatry'),
  R('r54', 'en', 'Panic attacks in crowded places', 'Psychiatry'),
  R('r55', 'en', 'Mild dizziness after standing up quickly, otherwise fine', 'Neurology'),
  R('r56', 'ru', 'Ghutne mein sujan aur dard, chalne mein takleef', 'Osteoporosis'),
  R('r57', 'en', 'Ear wax, cannot hear well from the left ear', 'ENT'),
  R('r58', 'ru', 'Halki khansi aur gala kharab', 'ENT'),
  R('r59', 'en', 'Sunburn and redness after a day outdoors', 'Dermatology'),
  R('r60', 'ru', 'Pairon mein sujan shaam ko hoti hai', 'General Physician'),
  // Department routing added 1 Oct 2026: throat → ENT; new back pain → GP; persistent pain and rehab → Physiotherapy
  R('r61', 'ru', 'Gala kharab hai aur halka bukhar 2 din se', 'ENT'),
  R('r62', 'en', 'Sore throat and fever since yesterday', 'ENT'),
  R('r63', 'ru', 'Kal se kamar mein dard hai, bhari cheez uthai thi', 'General Physician'),
  R('r64', 'en', 'Lower back pain for three months, keeps coming back', 'Physiotherapy'),
  R('r65', 'ru', 'Abbu ko 4 mahine pehle falij hua tha, ab chalne mein mushkil hai', 'Physiotherapy', true),
  R('r66', 'en', 'Twisted my ankle playing cricket, sprain', 'Physiotherapy'),
  R('r67', 'ru', 'Accident ke baad ghutne mein akdan hai', 'Physiotherapy'),
  R('r68', 'en', 'Frozen shoulder, cannot lift my arm for 2 months', 'Physiotherapy'),
  R('r69', 'ru', 'Abbu ko falij ke baad physio chahiye ghar par', 'Physiotherapy', true),
];

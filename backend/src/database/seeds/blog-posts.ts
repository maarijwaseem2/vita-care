/**
 * Seed articles. General health education only, written for the demo;
 * a clinician should review them before a real launch.
 */
export interface SeedPost {
  title: string;
  slug: string;
  category: string;
  author: string;
  image: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  daysAgo: number;
}

export const BLOG_POSTS: SeedPost[] = [
  {
    title: 'Heart Attack Warning Signs Every Pakistani Family Should Know',
    slug: 'heart-attack-warning-signs',
    category: 'Heart Care',
    author: 'Dr. Ghufran Ali',
    image: '/images/blog/covers/heart.svg',
    metaTitle: 'Heart Attack Warning Signs: When to Call 1122',
    metaDescription: 'Chest pressure, pain spreading to the arm or jaw, sweating and breathlessness. Learn the signs of a heart attack and what to do in the first minutes.',
    excerpt: 'Chest pressure, sweating and pain that spreads to the arm or jaw are not "gas". Knowing the signs and acting in minutes saves heart muscle.',
    daysAgo: 2,
    content: `<p>Many heart attacks in Pakistan are first treated at home as "gas" or acidity. Every minute of delay damages more heart muscle, so recognising the signs early matters.</p>
<h2>Common warning signs</h2>
<ul><li>Pressure, tightness or heaviness in the centre of the chest lasting more than a few minutes</li><li>Pain spreading to the left arm, both arms, jaw, neck or back</li><li>Cold sweat, nausea or vomiting</li><li>Shortness of breath, dizziness or sudden weakness</li></ul>
<p>Women, older people and people with diabetes may have milder or unusual symptoms such as tiredness, breathlessness or upper-stomach discomfort.</p>
<h2>What to do</h2>
<ol><li>Call <strong>1122</strong> or go to the nearest emergency department immediately.</li><li>Do not drive yourself.</li><li>Sit down and stay calm while help arrives.</li></ol>
<blockquote>If you are not sure, treat it as a heart attack until a doctor says otherwise.</blockquote>`,
  },
  {
    title: 'Stroke: Remember BE FAST and Act Within Minutes',
    slug: 'stroke-be-fast',
    category: 'Neurology',
    author: 'Dr. Saif Ur Rehman',
    image: '/images/blog/covers/brain.svg',
    metaTitle: 'Stroke Symptoms: BE FAST Checklist in Urdu and English',
    metaDescription: 'Balance, eyes, face, arm, speech, time. The BE FAST checklist helps you spot a stroke early. Treatment works best in the first hours.',
    excerpt: 'Sudden face droop, arm weakness or slurred speech is an emergency. Many stroke treatments only work in the first few hours.',
    daysAgo: 5,
    content: `<p>A stroke happens when blood supply to part of the brain is blocked or a vessel bursts. Brain cells start dying within minutes, and the most effective treatments are time-limited.</p>
<h2>BE FAST</h2>
<ul><li><strong>B</strong>alance: sudden loss of balance or dizziness</li><li><strong>E</strong>yes: sudden loss of vision in one or both eyes</li><li><strong>F</strong>ace: one side of the face droops (<em>chehra tehra hona</em>)</li><li><strong>A</strong>rm: one arm or leg is weak or numb</li><li><strong>S</strong>peech: slurred or confused speech (<em>zuban larkharana</em>)</li><li><strong>T</strong>ime: call 1122 immediately and note the time symptoms started</li></ul>
<h2>What not to do</h2>
<p>Do not give food, water or medicines by mouth, and do not wait to "see if it passes". Symptoms that go away can be a warning of a bigger stroke.</p>`,
  },
  {
    title: 'Type 2 Diabetes: A Practical Starter Guide',
    slug: 'type-2-diabetes-starter-guide',
    category: 'General Health',
    author: 'Dr. Fatima Iqbal',
    image: '/images/blog/covers/drop.svg',
    metaTitle: 'Type 2 Diabetes Guide: Symptoms, Tests and Daily Habits',
    metaDescription: 'Thirst, frequent urination and tiredness can signal diabetes. Learn which tests confirm it and the daily habits that keep sugar under control.',
    excerpt: 'Diabetes is common in Pakistan and often silent for years. Here is what the tests mean and which daily habits make the biggest difference.',
    daysAgo: 9,
    content: `<p>Type 2 diabetes develops slowly, and many people have it for years before diagnosis. Early control prevents damage to the eyes, kidneys, nerves and heart.</p>
<h2>Symptoms to notice</h2>
<ul><li>Excessive thirst and frequent urination</li><li>Tiredness and blurred vision</li><li>Slow-healing wounds and frequent infections</li></ul>
<h2>Tests your doctor may order</h2>
<table><thead><tr><th>Test</th><th>What it shows</th></tr></thead><tbody><tr><td>Fasting blood sugar</td><td>Sugar level after an overnight fast</td></tr><tr><td>HbA1c</td><td>Average sugar over about three months</td></tr></tbody></table>
<h2>Daily habits</h2>
<p>Walk for 30 minutes most days, reduce sugary drinks and white rice or flour, keep follow-up appointments, and check your feet regularly. Never stop or change medicines without your doctor.</p>`,
  },
  {
    title: 'High Blood Pressure: The Silent Risk',
    slug: 'high-blood-pressure-silent-risk',
    category: 'Heart Care',
    author: 'Dr. Sana Malik',
    image: '/images/blog/covers/heart.svg',
    metaTitle: 'High Blood Pressure: Causes, Readings and How to Control It',
    metaDescription: 'Most people with high blood pressure feel fine. Learn what the numbers mean, how to measure at home and which changes lower your risk.',
    excerpt: 'Most people with high blood pressure feel completely well. Regular checks are the only way to know.',
    daysAgo: 13,
    content: `<p>High blood pressure rarely causes symptoms, yet it is a leading cause of stroke, heart attack and kidney disease.</p>
<h2>Measuring at home</h2>
<ol><li>Sit quietly for five minutes with your back supported.</li><li>Keep the arm at heart level and do not talk.</li><li>Take two readings a minute apart and write them down.</li></ol>
<h2>Changes that help</h2>
<ul><li>Less salt: limit pickles (achar), papad and packaged snacks</li><li>Regular walking and a healthy weight</li><li>No smoking or naswar</li><li>Take prescribed medicines every day, even when you feel fine</li></ul>
<p>A very high reading with headache, chest pain, breathlessness or confusion needs urgent care.</p>`,
  },
  {
    title: 'Dengue Fever: Warning Signs That Need Hospital Care',
    slug: 'dengue-warning-signs',
    category: 'Public Health',
    author: 'Vita Care Editorial',
    image: '/images/blog/covers/shield.svg',
    metaTitle: 'Dengue Fever Warning Signs and Home Care',
    metaDescription: 'Most dengue cases recover at home, but abdominal pain, vomiting and bleeding are danger signs. Know when to go to hospital.',
    excerpt: 'Most people recover from dengue at home, but a few warning signs mean you must go to hospital straight away.',
    daysAgo: 16,
    content: `<p>Dengue spreads through mosquito bites and peaks after the monsoon. The dangerous phase often begins as the fever settles, around days 3 to 7.</p>
<h2>Go to hospital if you notice</h2>
<ul><li>Severe stomach pain or persistent vomiting</li><li>Bleeding from gums or nose, or blood in vomit or stool</li><li>Restlessness, extreme tiredness or cold, clammy skin</li><li>Very little urine</li></ul>
<h2>Home care</h2>
<p>Drink plenty of fluids and use paracetamol for fever. Avoid aspirin and ibuprofen-type painkillers, which can increase bleeding. Remove standing water around the home to stop mosquitoes breeding.</p>`,
  },
  {
    title: 'Heatstroke: Staying Safe in Pakistani Summers',
    slug: 'heatstroke-safety',
    category: 'Public Health',
    author: 'Vita Care Editorial',
    image: '/images/blog/covers/sun.svg',
    metaTitle: 'Heatstroke Symptoms and First Aid in Extreme Heat',
    metaDescription: 'Confusion, very hot skin and fainting in the heat are an emergency. Learn heatstroke first aid and how to protect elderly people and children.',
    excerpt: 'Heatstroke is a medical emergency. Confusion and very hot skin in the heat mean you should cool the person and call 1122.',
    daysAgo: 20,
    content: `<p>During heatwaves, older people, young children, outdoor workers and people with chronic illness are at highest risk.</p>
<h2>Heat exhaustion vs heatstroke</h2>
<table><thead><tr><th>Heat exhaustion</th><th>Heatstroke (emergency)</th></tr></thead><tbody><tr><td>Heavy sweating, weakness, headache</td><td>Confusion, fainting or seizures</td></tr><tr><td>Cool, clammy skin</td><td>Very hot skin, may stop sweating</td></tr></tbody></table>
<h2>First aid for heatstroke</h2>
<ol><li>Call 1122.</li><li>Move the person to shade and remove extra clothing.</li><li>Cool with water and fanning; place cool cloths on the neck and armpits.</li><li>Do not give drinks if they are confused.</li></ol>`,
  },
  {
    title: 'Fever in Children: When to Worry',
    slug: 'fever-in-children-when-to-worry',
    category: 'Pediatrics',
    author: 'Dr. Maryam Siddiqui',
    image: '/images/blog/covers/child.svg',
    metaTitle: 'Child Fever Guide for Parents: Danger Signs',
    metaDescription: 'Most childhood fevers are mild. Babies under three months, a stiff neck, a rash that does not fade or drowsiness need a doctor urgently.',
    excerpt: 'Most fevers in children are from mild infections. These danger signs mean your child should see a doctor today.',
    daysAgo: 24,
    content: `<p>Fever is the body's normal response to infection. How your child looks and behaves matters more than the exact temperature.</p>
<h2>See a doctor urgently if</h2>
<ul><li>Your baby is under 3 months old and has any fever</li><li>The child is unusually drowsy, hard to wake or very irritable</li><li>There is a stiff neck, fits, or a rash that does not fade when pressed</li><li>Breathing is fast or difficult</li><li>Signs of dehydration: no urine for 8 hours, dry mouth, no tears</li></ul>
<h2>At home</h2>
<p>Offer fluids often, dress the child lightly, and use paracetamol at the dose for their weight. Do not give aspirin to children.</p>`,
  },
  {
    title: 'Understanding Your CBC Blood Report',
    slug: 'understanding-cbc-report',
    category: 'Lab Reports',
    author: 'Vita Care Editorial',
    image: '/images/blog/covers/lab.svg',
    metaTitle: 'CBC Blood Test Explained: Hb, WBC and Platelets',
    metaDescription: 'What haemoglobin, white cells and platelets mean on a complete blood count, and why a slightly abnormal value is not always a problem.',
    excerpt: 'Haemoglobin, WBC, platelets: what the main numbers on a complete blood count mean and when to discuss them with your doctor.',
    daysAgo: 28,
    content: `<p>The complete blood count (CBC) is one of the most common tests. It looks at three main types of blood cells.</p>
<h2>The main values</h2>
<table><thead><tr><th>Value</th><th>What it tells you</th></tr></thead><tbody><tr><td>Haemoglobin (Hb)</td><td>Oxygen-carrying capacity; low values suggest anaemia</td></tr><tr><td>WBC</td><td>Infection-fighting cells; high in many infections</td></tr><tr><td>Platelets</td><td>Clotting cells; watched closely in dengue</td></tr><tr><td>MCV</td><td>Size of red cells; small cells often point to iron deficiency</td></tr></tbody></table>
<p>Normal ranges differ by age, sex and laboratory, so always compare with the range printed on your report. A single slightly abnormal value is often not significant; your doctor looks at the whole picture.</p>
<p>You can upload a photo of your report to the Vita Care report explainer for a plain-language summary to discuss with your doctor.</p>`,
  },
  {
    title: 'Anxiety and Sleep: Small Steps That Help',
    slug: 'anxiety-and-sleep',
    category: 'Mental Health',
    author: 'Dr. Sadia Aslam',
    image: '/images/blog/covers/mind.svg',
    metaTitle: 'Anxiety and Poor Sleep: Practical Steps and When to Get Help',
    metaDescription: 'Racing thoughts and poor sleep feed each other. Practical routines that help, and signs that it is time to talk to a professional.',
    excerpt: 'Worry and poor sleep feed each other. A few steady routines help, and talking to a professional is a sign of strength.',
    daysAgo: 33,
    content: `<p>Anxiety is common and treatable. It often shows up in the body as a racing heart, tight chest, stomach upset or trouble sleeping.</p>
<h2>Steps you can start tonight</h2>
<ul><li>Keep the same sleep and wake time, even on weekends</li><li>Put the phone away 30 minutes before bed</li><li>Limit tea and coffee after the afternoon</li><li>Try slow breathing: in for 4, hold for 4, out for 6</li></ul>
<h2>When to seek help</h2>
<p>If worry stops you from working, studying or enjoying life for more than two weeks, speak to a doctor or psychologist. If you ever have thoughts of harming yourself, call the Umang helpline (0311 7786264) or 1122 immediately.</p>`,
  },
  {
    title: 'Fungal Skin Infections in Humid Weather',
    slug: 'fungal-skin-infections',
    category: 'Dermatology',
    author: 'Dr. Imran Khattak',
    image: '/images/blog/covers/skin.svg',
    metaTitle: 'Fungal Skin Infection: Causes, Prevention and Treatment',
    metaDescription: 'Itchy, ring-shaped rashes are common in hot, humid weather. Why steroid creams make them worse and how to prevent them coming back.',
    excerpt: 'Itchy, ring-shaped rashes are very common in hot weather. Avoid steroid-mixed creams, which can make them spread.',
    daysAgo: 38,
    content: `<p>Fungal infections thrive on warm, moist skin such as the groin, underarms, feet and under the breasts.</p>
<h2>Prevention</h2>
<ul><li>Dry skin well after bathing, especially folds</li><li>Wear loose cotton clothing and change sweaty clothes quickly</li><li>Do not share towels</li></ul>
<h2>A common mistake</h2>
<p>Many over-the-counter creams contain a steroid mixed with an antifungal. Steroids can temporarily reduce itching but let the fungus spread and become harder to treat. See a doctor if a rash keeps returning or covers a large area.</p>`,
  },
  {
    title: 'Migraine or Ordinary Headache? Know the Difference',
    slug: 'migraine-vs-headache',
    category: 'Neurology',
    author: 'Dr. Ayesha Khan',
    image: '/images/blog/covers/brain.svg',
    metaTitle: 'Migraine vs Tension Headache: Symptoms and Red Flags',
    metaDescription: 'One-sided throbbing pain with nausea or light sensitivity suggests migraine. Learn the red-flag headaches that need urgent care.',
    excerpt: 'Throbbing one-sided pain with nausea or sensitivity to light often means migraine. Some headaches need urgent care.',
    daysAgo: 44,
    content: `<p>Most headaches are tension-type or migraine, and both can be managed well.</p>
<table><thead><tr><th>Tension-type</th><th>Migraine</th></tr></thead><tbody><tr><td>Band-like pressure on both sides</td><td>Throbbing, often one-sided</td></tr><tr><td>Mild to moderate</td><td>Moderate to severe, with nausea</td></tr><tr><td>Normal activity possible</td><td>Light and sound sensitivity</td></tr></tbody></table>
<h2>Red flags: get urgent care</h2>
<ul><li>A sudden, extremely severe "worst ever" headache</li><li>Headache with fever and stiff neck</li><li>Headache with weakness, confusion or trouble speaking</li><li>A new headache after a head injury</li></ul>`,
  },
  {
    title: 'Protecting Your Bones as You Age',
    slug: 'protecting-your-bones',
    category: 'Bone Health',
    author: 'Dr. Bilal Ahmed',
    image: '/images/blog/covers/bone.svg',
    metaTitle: 'Osteoporosis Prevention: Calcium, Vitamin D and Exercise',
    metaDescription: 'Vitamin D deficiency is common in Pakistan. Learn how calcium, sunlight, exercise and fall prevention protect your bones.',
    excerpt: 'Weak bones cause no pain until a fracture. Vitamin D, calcium, exercise and fall prevention keep them strong.',
    daysAgo: 52,
    content: `<p>Osteoporosis makes bones thin and fragile, and it is often found only after a fracture. Women after menopause are at highest risk.</p>
<h2>Building stronger bones</h2>
<ul><li>Calcium from milk, yoghurt, lassi and leafy greens</li><li>Vitamin D from safe sunlight; deficiency is common, so ask your doctor about testing</li><li>Weight-bearing exercise such as walking and stair climbing</li></ul>
<h2>Preventing falls at home</h2>
<p>Good lighting, non-slip mats in the bathroom and removing loose rugs prevent many fractures in older people. Ask your doctor whether a bone density scan is right for you.</p>`,
  },
];

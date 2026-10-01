# Vita Care — Mukammal report (kya bana, kyun bana, kaise test hua)

Tareekh: 1 October 2026 · Alibaba Cloud AI Hackathon 2026 (Alkhidmat Bano Qabil)
Chalane ke steps: `README.md` · Test checklist: `docs/TESTING.md` · Viva: `docs/VIVA-GUIDE.md`

---

## 1. Vita Care ek line mein

Mareez apni zabaan mein (Urdu, Roman Urdu, English — likh kar ya bol kar) takleef batata hai. AI ek-ek sawal poochta hai,
emergency pakadta hai, choti bimari pe OTC dawa batata hai, sahi department ke **verified** doctor tak le jata hai, aur
zaroorat ho to **verified nurse ya physiotherapist ghar** bhejta hai — aur har reading wapas doctor tak pohanchti hai.

---

## 2. Doosron se kya alag hai — aur kyun

| Kaun | Wo kya karte hain | Kya kami hai | Vita Care kya alag karta hai |
| --- | --- | --- | --- |
| Marham, Oladoc | Doctor directory aur online booking | Mareez ko khud department chunna padta hai; AI interview nahi | AI pehle interview karta hai, department khud chunta hai, summary doctor tak bhejta hai |
| Sehat Kahani | Online female doctors, e-clinics | Har baat ke liye doctor ka waqt; self-service AI nahi | AI pehle hi complaint, duration, severity, history tayyar kar deta hai |
| Ilaaj AI, Mashwara AI (AI chat) | Roman Urdu mein AI se sawal | Emergency ka alag safety layer nahi; asli doctor tak handoff nahi | 3 zabanon mein rules + alag AI safety check; booking ke saath summary |
| ChatGPT jaisa general AI | Har sawal ka jawab | Pakistan ka context, mareez ka record, doctor, nurse kuch nahi | Mareez ka record, Pakistani doctors/nurses, 1122/Edhi, Urdu |
| Home nursing companies (Holistic, Z Care, PlanCare, eShifa) | Call karo, agent nurse bhejta hai | Nurse ka licence public verify nahi; reading doctor tak nahi jaati | PNC licence verify; doctor khud order karta hai; har vitals reading doctor ke panel mein; khatarnak reading pe foran alert |

**Wajah (kyun ye zaroori hai):**
- Pakistan mein ~1,300 logon pe ek doctor, aur har doctor ke liye sirf ~0.4 nurse — doctor ka waqt sab se qeemti hai, isliye AI pehle ka kaam (history lena) karta hai.
- 2026 ki Nature Medicine study: AI mukammal kahani se bimari pehchan leta hai, lekin aam log adhoori baat karte hain — isliye hamara AI **khud sawal poochta** hai.
- Emergency miss hona sab se khatarnak ghalti hai, isliye **AI ke alawa rules** bhi hain jo sirf urgency barha sakte hain.
- Bina licence ke nurse/doctor ka khatra: PMDC, PNMC (Act §23) aur AHPC (Act 2022) ke number admin verify karta hai.

---

## 3. Features (mukammal list)

### AI Doctor
- Ek-ek sawal, tap wale jawab, 3 zabanein, mic se bolna aur jawab sunna (OpenAI voice).
- **Safety guard (rules):** chest pain, stroke, saans, dora, khoon, khudkushi, allergy, zeher, pregnancy mein khoon… teeno zabanon mein.
  "Chest pain **nahi** hai" ko emergency nahi maanta; "5 saal pehle falij hua tha" aur "falij ke baad physio" ko purani history maanta hai;
  lekin "khana khane ke **baad** seene mein dard" emergency hi rehta hai.
- **AI ki doosri safety rai** — alag sawal "kya ye emergency hai?"; sirf urgency barha sakti hai.
- AI pehle **English mein sochta** hai, phir mareez ki zabaan mein jawab deta hai.
- Mareez ka record (umar, bimariyan, dawaiyan) AI ko jata hai; **naam aur phone kabhi nahi**.
- AI ka provider/model naam ab kahin nahi dikhta (sirf "Offline mode" agar AI band ho).

### Department ka faisla (doctor recommend karna)
AI department batata hai, phir backend mareez ke alfaaz se check karta hai (rules: "nahi" aur purani history ignore):

| Takleef | Department |
| --- | --- |
| Gala, tonsil, kaan, naak, sinus — **bukhar ke saath bhi** | ENT |
| **Naya** kamar/gardan dard (6 hafte se kam, chot nahi) | General Physician (dawa + chalte-phirte rehna) |
| Kamar dard 6 hafte se zyada / baar baar, sciatica, moch, frozen shoulder | Physiotherapy |
| **Falij ke baad**, accident ke baad, operation/fracture ke baad rehab | Physiotherapy |
| Joint sujan, arthritis, haddi, naya fracture | Osteoporosis (orthopaedic) |
| X-ray, CT, MRI, ultrasound ka sawal | Radiology |
| Bacha (12 saal se kam) | Pediatrics |
| Acidity, gas, bukhar + jism dard, flu | General Physician |
| Ghabrahat, udaasi, neend | Psychiatry |

Back pain ka rule NICE guideline NG59 se hai: naye dard ke liye tasalli, active rehna aur dard ki dawa; exercise/physio un ke liye jinka dard lamba ho ya bigarne ka khatra ho.

### Choti bimari pe dawa (OTC)
- 14 dawaiyon ki fixed list (Panadol, Brufen, ORS, Rigix/Zyrtec, Softin, saline drops, Strepsils, Gaviscon, Risek, Imodium, Canesten, Calamine, simethicone, shehad).
- **Dose AI nahi likhta** — dose, maximum aur warnings hamari list se aate hain. List se bahar ki dawa (antibiotic, steroid) khud hat jaati hai.
- Safety rules: bukhar mein Brufen nahi (dengue) → Panadol; BP, gurde, ulcer, asthma, blood thinner → Brufen ki jagah Panadol; jigar ki bimari → Panadol nahi; diabetes → shehad nahi; khoon wale dast ya bukhar → Imodium nahi.
- **Pregnancy, 12 saal se kam bachay, emergency → koi dawa nahi**, sirf "doctor/pharmacist se poochein".
- Ye list demo ke liye hai — asli launch se pehle pharmacist/doctor review zaroori.

### Report aur scan samjhana
- **Lab report / prescription / radiology ki likhi report:** har value, normal range, Low/Normal/High, pattern (maslan low Hb + low MCV → iron ki kami), sawal, doctors.
- **X-ray / CT / MRI / ultrasound ki tasveer:** sirf **jo nazar aaye** (jism ka hissa, kya dikh raha hai) — **koi bimari, fracture ya prediction nahi** (backend bhi zabardasti `possibleConditions` khali rakhta hai). Mareez ko radiologist ki written report lene ko kaha jata hai, aur Radiologist doctors dikhaye jaate hain.
- Mobile pe gallery se photo chuni ja sakti hai (camera zabardasti nahi khulta).

### Doctors aur registration
- 86 doctors + **12 Physiotherapists** (DPT, AHPC) + **8 Radiologists** (MBBS + FCPS Radiology, PMDC).
- **PMDC sirf MBBS doctors** ko register karta hai. **Physiotherapists AHPC** (Allied Health Professionals Council, Act 2022) se register hote hain; registration 30 June 2026 tak lazmi thi.
- Registration form: department "Physiotherapy (Physiotherapist, DPT)" chunne pe **AHPC registration number** maanga jata hai, aur jiske paas nahi uske liye AHPC portal (`accounts.ahpc.org.pk`) ka link. Baqi sab ke liye PMDC (`pmdc.pk`).
- Naam ke saath **PMDC** ya **AHPC** ka badge (card aur profile). Admin ko council ka column aur dono portals ke links.

### Ghar pe visit (nurse aur physiotherapist)
- Nurse request aur physio booking dono mein **"Use my current location"** (optional, phone GPS).
- Physio booking mein **"At the clinic / At my home"** option + poora address.
- Nurse ya physio ko exact location aur **Google Maps link** sirf visit accept/confirm hone ke baad; nurse ko pehle sirf area dikhta hai.
- **Public receipt pe ghar ka address aur location kabhi nahi.**
- Nurse vitals rules: SpO₂ < 92, BP ≥ 180/120, sugar < 54… pe foran laal alert — nurse, mareez aur doctor teeno ko.

### Admin panel
Dashboard, doctor verification (PMDC/AHPC), nurse verification (PNC), AI safety monitor, users (suspend), blog CMS (Word jaisa editor, banner, slug, SEO), audit log.

### Design
- Original navy/cyan Vita Care theme. About section mein **asli photo** (Unsplash, free license) — AI se bani tasveer hata di.
- **Har jagah dropdown bare** (52 px, bara font, saaf arrow). 12 department cards (11 + "All doctors").
- 26 pages × phone (390 px) aur tablet (768 px): koi horizontal overflow nahi.

---

## 4. "AI ko train karna" ka matlab yahan

Model ko dobara train nahi kiya jata (iske liye hazaron verified cases aur GPU chahiye). Iski jagah:
1. **Prompt:** department rules, dawaiyon ki list, sawal poochne ka tareeqa.
2. **Knowledge cards (RAG):** 19 takleefon ke cards — kya poochna hai, red flags, department.
3. **Backend rules** jo AI ki ghalti pakadte hain: safety guard, department check, dawa ke safety rules.
4. **Evaluation:** 119 Pakistani cases pe har change ke baad test.

Mock AI ne jaan-boojh kar ghalat jawab diye (gala+bukhar pe General Physician, antibiotic + Brufen) — backend ne ENT, sirf Panadol, aur antibiotic hata kar sab theek kiya.

---

## 5. Test results (1 October 2026)

| Test | Result |
| --- | --- |
| Backend unit tests | **126 / 126 pass** |
| API end-to-end tests (asli PostgreSQL) | **96 / 96 pass** — RBAC, AHPC, home visit location privacy, receipt pe address na hona |
| Safety evaluation (119 cases) | **36/36 emergencies**, **16/16 trap cases** ("nahi", purani history, falij ke baad physio) |
| Department routing (rules only) | **98.8 % (82/83)** — lekin ye rules isi development set pe tune hue hain; naye cases pe kam ho sakta hai |
| Browser test (naye features) | **16 / 16 pass**: physio home visit + GPS, AHPC form, badges, scan page, dropdown size, Maps link |
| Responsive | 52 page views, koi overflow nahi |
| Console errors (Chrome) | **0** — AI Doctor page pe `startTime` error app ka nahi; browser extension ya hosting toolbar se inject hota hai |

---

## 6. Imaandari se: hadd aur baqi kaam
- Asli OpenAI key ke saath AI ko 10–20 conversations pe check karna zaroori hai (yahan mock se test hua).
- Dawaiyon ki list, vitals thresholds aur department rules kisi pharmacist/doctor se review honi chahiye.
- Evaluation cases team ne likhe hain; clinically validated nahi.
- X-ray/CT ka hissa sirf description hai, diagnosis nahi — aur aisa hi rehna chahiye.
- Payments, SMS/WhatsApp, nurse/physio ki live tracking abhi nahi.

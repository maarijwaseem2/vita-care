# Vita Care — Kaam ki mukammal report

Tareekh: 30 September 2026 · Hackathon: Alibaba Cloud AI Hackathon 2026 (Alkhidmat Bano Qabil), 3 October

Ye document batata hai ke original project se le kar ab tak kya kaam hua, har phase mein kya bana,
aur kya test kiya gaya. Chalane ke steps `README.md` mein hain.

---

## 1. Shuru mein project kis haal mein tha

Original project mein booking, doctor profiles, blog aur ek basic AI chatbot tha. Chala kar dekha to ye masle mile:

| Masla | Asar |
| --- | --- |
| Doctor search pe 500 error | "Find a Doctor" mein naam likhte hi crash |
| Receipt `/receipt/1, 2, 3…` sab ke liye khuli | Koi bhi doosre mareez ka naam, phone, bimari dekh sakta tha |
| 2001 ki date aur "blahblah" slot bhi book | OPD ke din/ghante ignore |
| Doctor mareez ki history nahi dekh sakta tha | Pitch ka main wada adhoora |
| AI key ke baghair AI Doctor band | Stage pe internet gaya to demo khatam |
| Emergency sirf LLM ke bharose | Model ghalti kare to emergency miss |
| Koi admin panel nahi, koi bhi "doctor" ban sakta tha | Fake doctor ka khatra |

Ye sab theek ho chuke hain (neeche).

---

## 2. Phase-wise kaam

### Phase 1 — Bugs aur security
- Doctor search theek (case-insensitive, crash khatam).
- Receipt ab random code `VC-7K2M9QXA` se khulti hai; numbers guess nahi ho sakte.
- Booking: doctor ke asli OPD din aur ghante, 30 minute slots, Pakistan time, purani ya ghalat slot reject, cancel ki hui slot dobara book ho sakti hai.
- Rate limiting, security headers (helmet), size limits, production mein kamzor JWT secret pe server start nahi hota.
- Password hash kabhi query mein nahi aata; doctor ke private notes receipt pe nahi dikhte.

### Phase 2 — AI Doctor
- Ek waqt mein ek sawal, tap karne wale jawab; English, اردو, Roman Urdu.
- **Safety guard** (AI se alag rules): chest pain, stroke, saans, dora, khoon, khudkushi, allergy, zeher, pregnancy mein khoon… teeno zabanon mein.
  - "chest pain **nahi** hai" ko emergency nahi samajhta; "5 saal pehle falij hua tha" ko purani history samajhta hai; "seenay", "chesst", "دل میں درد" jaise spellings pakadta hai; "dard nahi ja raha" ko takleef samajhta hai.
- **AI ki doosri safety rai**: alag sawal "kya ye emergency hai?"; sirf urgency barha sakti hai.
- AI pehle **English mein sochta** hai phir mareez ki zabaan mein jawab deta hai (Urdu research ke mutabiq zyada durust).
- **Guidelines knowledge base** (17 cards): har takleef ke liye kya poochna hai, red flags, department.
- Mareez ka record (umar, bimariyan, dawaiyan) AI ko jata hai; naam aur phone kabhi nahi.
- AI ki summary booking ke saath doctor tak jaati hai.
- Internet ya key na ho to offline mode (UI pe likha hota hai).
- **Lab report explainer**: photo se har value, Low/Normal/High, pattern se mumkin wajah (maslan low Hb + low MCV → iron ki kami).
- **Voice (OpenAI)**: Urdu awaaz sunta hai aur Urdu awaaz mein jawab deta hai; Roman Urdu ko bolne se pehle Urdu script mein badalta hai.

### Phase 3 — Admin panel
- Dashboard: 14 din ka chart, zabanein, departments, pending doctors/nurses, emergency chats.
- Doctor verification (PMDC number) aur nurse verification (PNC number, PNMC ki online licence check ka link).
- AI safety monitor: emergency chats ki list, "reviewed" mark karna.
- Users: search, role filter, suspend/activate (khud ko ya aakhri admin ko suspend nahi kar sakte).
- Audit log: kis ne kis ka record kab dekha, kis ne kya verify/badla.

### Phase 4 — Blog CMS aur SEO
- Word jaisa editor (headings, lists, tables, links, images), banner upload (JPG/PNG/WEBP, 3 MB).
- Title se slug khud banta hai (Urdu title ka bhi), meta title/description counters ke saath, Google preview.
- Blog page: ek line mein 3, ek page pe 9, icons wali pagination, category filters; detail page pe SEO metadata aur related posts.
- **Image fix**: images ab `/uploads/...` relative path se save hoti hain aur Next.js unhein backend se proxy karta hai; domain badle to bhi nahi tootein. Publish karte hi blog pages foran update hoti hain (sirf admin token se).
- HTML sanitize hota hai: `<script>`, `onerror` waghera hat jaate hain.

### Phase 5 — Home nursing (naya role: Nurse)
- **Kyun**: Pakistan mein har doctor ke liye sirf 0.4 nurse (PBC). Maujooda home-nursing companies agency/call-centre model pe hain; nurse ka record doctor tak nahi jata.
- **Hamari uniqueness**: licence verified nurse + doctor khud visit order kare + har vitals reading doctor aur mareez tak + khatarnak reading pe foran alert + female nurse ka option.
- Nurse registration: PNC number, qualification, services, areas, fee, din. Admin verify tak "pending" aur koi visit accept nahi kar sakti.
- Patient `/home-care`: service (injection, dressing, BP/sugar, elderly, post-op, catheter, mother & baby, blood sample), din, waqt, address (profile se), nurse preference, chaho to khud nurse chuno.
- Nurse dashboard: apne sheher aur services ki open requests; accept (do nurses ek visit nahi le saktin); accept ke baad hi poora address aur mareez ka phone; vitals form (BP, pulse, temperature, SpO₂, sugar, saans).
- **Vitals rules**: SpO₂ < 92, BP ≥ 180/120 ya systolic < 90, pulse > 130 ya < 40, temperature ≥ 40 ya < 35, sugar < 54 ya > 400 → emergency; halki kharab readings → "doctor jaldi dekhe".
- Doctor panel: mareez ki home visits, vitals aur alerts; "Order home nursing".
- Patient dashboard: visits ka status, nurse ka naam (aur accept ke baad phone), vitals, laal banner agar reading khatarnak thi.
- Seed: 26 nurses (12 sheher), demo nurse, 3 sample visits.

### Phase 6 — Dataset aur evaluation
- 86 verified doctors (9 departments, 12 sheher), 26 nurses, 12 blog posts, 73 sample consultations. Sab fictional.
- 110 cases ka triage evaluation set: 36 emergencies, 14 "trap" cases, 60 aam cases; `npm run eval`.

### Phase 7 — Branding, UI, RBAC
- Naam **Vita Care**, original navy/cyan colors, logo ke saath Urdu tagline "آپ کی صحت، ہماری ترجیح".
- Har role ka apna dashboard; admin ka redirect loop theek.
- Signed-in mareez ki AI summary ab sirf wahi mareez padh sakta hai.
- Mobile pe home page ki pehli screen pe headline aur button.
- `npm run demo:reset`: demo ko shuru ki haalat mein wapas laata hai.

---

## 3. Test results (30 Sep 2026)

| Test | Result |
| --- | --- |
| Backend unit tests | **111 / 111 pass** |
| API end-to-end tests (real PostgreSQL) | **91 / 91 pass**, jin mein 13 RBAC 403 checks |
| Triage evaluation (safety guard) | **36/36 emergencies**, **14/14 trap cases**, 1 jaan-boojh kar rakha false alarm |
| Browser role test (Playwright) | **27 / 27 pass**: patient, nurse, doctor, admin, redirects, blog banner list + detail + og:image |
| Responsive | 25 pages × 2 sizes (390 px, 768 px) har role ke saath: **koi horizontal overflow nahi** |
| Maestro web flows (Chrome, headless) | **10 / 10 pass** in one run: guest, patient, nurse, doctor, admin, RBAC, AI safety, blog |
| AI + voice | Mock OpenAI server ke saath test kiya (asli key yahan nahi thi) |

---

## 4. Imaandari se: kya baqi ya mehdood hai

- AI aur voice ko **asli key** ke saath test karna zaroori hai (5–10 Urdu/Roman Urdu conversations, Chrome mein mic).
- Evaluation set team ne likha hai; clinically validated nahi. Doctors se review agla qadam hai.
- Vitals thresholds baalighon ke liye hain; bachon aur pregnancy ke liye alag rules chahiye.
- Payments, SMS/WhatsApp notifications aur nurse ki live location abhi nahi hain.
- Pakistan ka data protection qanoon abhi pass nahi hua; hum health data ko "sensitive" maan kar design kar rahe hain (naam/phone AI ko nahi, audit log, random links).

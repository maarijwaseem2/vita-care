# Vita Care — AI triage, verified doctors and home nurses, in one loop

Vita Care helps patients in Pakistan understand their symptoms in **English, Urdu
or Roman Urdu** (typed or spoken), catches emergencies, books a **PMDC-verified
doctor** with an AI pre-visit summary, and sends a **PNMC-verified nurse** home
whose recorded vitals flow back to the doctor, with instant alerts on dangerous
readings.

Built for the **Alibaba Cloud AI Hackathon 2026** (Alkhidmat Bano Qabil).
Stack: **Next.js 14** + TypeScript · **NestJS 10** + TypeORM · **PostgreSQL** ·
AI via any OpenAI-compatible API (**OpenAI** or **Alibaba Qwen**) · voice via OpenAI audio.

---

## What's new (1 Oct 2026)

- **OTC medicines for minor illness** from a fixed formulary (doses never written by the AI; safety rules for fever/dengue, BP, kidney, pregnancy, children).
- **Department rules**: throat with fever → ENT; new back pain → General Physician; long-lasting pain, stroke (falij) / accident / surgery rehab → **Physiotherapy**; scans → **Radiology**.
- **Physiotherapists register with AHPC** (not PMDC); council badge next to every doctor's name.
- **X-ray / CT / MRI photos** are described, never diagnosed; patients are sent to a radiologist.
- **Home visits with GPS location** for nurses and physiotherapists (shared only after acceptance; never on the public receipt).
- **Email verification (Brevo) and "Continue with Google" (Firebase)**: the AI opens only after the email is confirmed. Setup: [`docs/SETUP-EMAIL-GOOGLE.md`](docs/SETUP-EMAIL-GOOGLE.md).
- **AI needs a login, with a daily allowance per user** (40 messages, 5 reports/scans, 40 voice; admins unlimited; set in `.env`). Emergencies are still answered after the limit, using rules only.
- Bigger dropdowns, real About photo, AI provider/model no longer shown.

Full details and the comparison with other platforms: [`docs/WORK-SUMMARY.md`](docs/WORK-SUMMARY.md).

## Four roles

| Role | Signs up at | Dashboard | Can do |
| --- | --- | --- | --- |
| Patient | `/register/patient` | `/profile/patient` | AI Doctor, lab-report explainer, book doctors, request home nurse, see vitals and alerts, keep medical history |
| Doctor | `/register/doctor` (PMDC number; physiotherapists: AHPC number) | `/profile/doctor` | See AI pre-visit summary + history + home-visit vitals, complete/cancel visits, **order home nursing**; physiotherapists also get home-visit bookings with the patient's location |
| Nurse | `/register/nurse` (PNC number required) | `/profile/nurse` | Accept home visits in their city, record vitals, get red-flag alerts |
| Admin | seeded only (never public signup) | `/admin` | Verify doctors and nurses, AI safety monitor, users (suspend), blog CMS, audit log, statistics |

New doctors and nurses stay **pending and invisible** until an admin verifies their licence.
Full access matrix: [`docs/RBAC.md`](docs/RBAC.md).

---

## Run it (step by step)

**Requirements:** Node.js 18+ (20/22 recommended), PostgreSQL 14+ (or Docker).

### 1. Database
```bash
createdb vita_care
# or, with Docker:  docker compose up -d db
```

### 2. Backend (API on http://localhost:4000/api)
```bash
cd backend
cp .env.example .env          # set DB_PASSWORD, JWT_SECRET, and your AI key (below)
npm install
npm run migration:run         # creates all tables (4 migrations)
npm run seed                  # 86 doctors, 26 nurses, admin, demo patient, 12 blog posts
npm run start:dev
```

### 3. Frontend (website on http://localhost:3000)
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### 4. Switch on the AI and voice (`backend/.env`)
With **one OpenAI key** everything works (chat, lab reports, voice):
```
AI_API_KEY=sk-...your-openai-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_VISION_MODEL=gpt-4o-mini
```
Daily AI limits per user: `AI_DAILY_MESSAGES=40`, `AI_DAILY_REPORTS=5`, `AI_DAILY_VOICE=40` (admins are unlimited).

To run the chat on **Alibaba Qwen** instead, set `AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1`,
`AI_MODEL=qwen-plus`, `AI_VISION_MODEL=qwen-vl-max`, and put your OpenAI key in `OPENAI_API_KEY` for voice
(Qwen's speech models do not support Urdu). With **no key**, the AI Doctor runs in a labelled offline mode.
Check: `GET http://localhost:4000/api/chatbot/status` and `/api/voice/status`.

### 5. Before every demo or rehearsal
```bash
cd backend && npm run demo:reset
```
Puts pending doctors/nurses back in the queue, makes today's nurse visit ready to record again, and removes test data.

### Production
`npm run build && npm run start:prod` (backend), `npm run build && npm start` (frontend). See `DEPLOYMENT.md`.
Set a long random `JWT_SECRET`; the API refuses to start in production without one.

---

## Demo accounts (password `Password123`)

| Role | Email | What to show |
| --- | --- | --- |
| Patient | `patient@vitacare.test` | Ali Hassan, 52, Karachi, diabetes + BP. Home visits with vitals, AI history |
| Doctor | `dr.saif@vitacare.test` | Neurology. Open Ali's visit: AI summary, history, home-visit vitals, order a nurse |
| Nurse | `nurse@vitacare.test` | Nasreen Akhtar, Karachi. Open requests + a visit accepted for today to record vitals |
| Admin | `admin@vitacare.test` | Pending doctors and a pending nurse (Rizwana Kausar) to verify |

Other doctors: `dr.ayesha@`, `dr.ghufran@`, `dr.fatima@` … (all `@vitacare.test`). Nurses: `nurse.1@` … `nurse.24@`.
All seeded people, licence numbers and phone numbers are **fictional**.

---

## How the AI works

```
patient message (en / ur / roman-ur, typed or spoken)
   ├─ 1. Safety guard: rules in 3 languages; understands "nahi" (denial), past history, spelling variants
   ├─ 2. Patient record from the database (age, conditions, medicines; never name or phone)
   ├─ 3. Guideline cards for the complaint (retrieval, 17 cards)
   ├─ 4. Model: reasons in English first, answers in the patient's language, one question at a time
   ├─ 5. Separate AI emergency check (can only raise urgency)
   └─ 6. final urgency = highest of all → doctors recommended → summary attached to the booking
```

Home nursing adds a second safety loop: every vitals entry is checked by rules (SpO₂ < 92, BP ≥ 180/120,
sugar < 54 mg/dL, …) and alerts the nurse, the patient and the treating doctor.

---

## Tests

```bash
cd backend
npm test                 # 126 unit tests (safety guard, departments, OTC medicines, vitals, schedule, parsing)
npm run test:e2e         # 110 API tests on the real database, incl. RBAC, AI limits, email verification, Google sign-in
npm run eval             # 119-case evaluation: emergencies, trap cases, department routing

cd ../frontend
npm run test:maestro     # 10 Maestro web flows, one or more per role (see docs/TESTING.md)
```

Latest results are in [`docs/WORK-SUMMARY.md`](docs/WORK-SUMMARY.md).

---

## Documents

| File | What it is |
| --- | --- |
| `docs/WORK-SUMMARY.md` | What was built, phase by phase, and test results |
| `docs/RBAC.md` | Who can access what |
| `docs/VIVA-GUIDE.md` | 3-minute demo script and judge Q&A (Roman Urdu) |
| `docs/EVALUATION.md` | Triage evaluation method and results |
| `docs/TESTING.md` | How to run every test, including Maestro |
| `DEPLOYMENT.md` | Hosting guide |

**Medical disclaimer:** Vita Care gives preliminary guidance, not a diagnosis. It has not been clinically validated.

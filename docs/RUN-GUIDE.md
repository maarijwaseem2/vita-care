# Vita Care — chalane ka tareeqa (step by step)

## 1. Pehli dafa (local computer)
```bash
# Database
createdb vita_care                       # ya: docker compose up -d db

# Backend
cd backend
cp .env.example .env                     # values bharein (neeche "Env" dekhein)
npm install
npm run migration:run                    # saari tables
npm run seed                             # doctors, nurses, demo accounts, blog
npm run start:dev                        # http://localhost:4000/api

# Frontend (naya terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                              # http://localhost:3000
```

## 2. Staging / live update (har nayi zip ke baad)
```bash
cd backend && npm install && npm run migration:run && npm run seed && npm run build && npm run start:prod
cd ../frontend && npm install && npm run build && npm start
```
`npm run seed` sirf jo nahi hai wo add karta hai (purana data nahi mitta).

## 3. Env — kya daalna hai

### Backend — `backend/.env` (local ke liye example values)
```
NODE_ENV=development
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres            # aapke PostgreSQL ka password
DB_NAME=vita_care
JWT_SECRET=koi-bhi-lamba-random-text-kam-az-kam-32-harf
JWT_EXPIRES_IN=7d
JWT_ADMIN_EXPIRES_IN=12h
CORS_ORIGIN=http://localhost:3000

# AI (OpenAI ki ek key se chat + reports + voice)
AI_API_KEY=sk-...
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_VISION_MODEL=gpt-4o-mini
AI_DAILY_MESSAGES=40
AI_DAILY_REPORTS=5
AI_DAILY_VOICE=40

# Email (Brevo) — confirmation link, password reset code, contact form
BREVO_API_KEY=xkeysib-...
EMAIL_FROM_ADDRESS=aapka-verified-sender@domain.com
EMAIL_FROM_NAME=Vita Care
APP_URL=http://localhost:3000     # live pe: frontend ka address
SUPPORT_EMAIL=maarijwaseem7@gmail.com

# Google login (Firebase)
FIREBASE_PROJECT_ID=vita-care-xxxxx

# Hosting pe (Render/Vercel) zaroori; local pe chhod dein
# TRUST_PROXY=1
```

### Frontend — `frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vita-care-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vita-care-xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```
`NEXT_PUBLIC_...` badalne ke baad frontend `npm run dev` restart (ya live pe `npm run build`) karein.

**Local pe chalega?** Haan. Firebase mein `localhost` pehle se "Authorized domains" mein hota hai, aur Brevo local se bhi email bhejta hai. Bas `APP_URL=http://localhost:3000` rakhein taake email ka link local site pe khule.
Keys na hon to bhi sab chalta hai: email ka link aur reset code backend ke log mein likha aata hai, aur "Continue with Google" button chhupa rehta hai.

## 4. Signup kaise hota hai (har role)
**Email se:** `/register` → Patient / Doctor / Nurse card →
- **Step 1:** naam, email, password (doctor/nurse: phone bhi)
- **Step 2:** details — patient: **phone (lazmi, Pakistani format)**, **city (lazmi)**, umar, jins, area; doctor: department, PMDC (physio: AHPC), clinic, OPD; nurse: services, sheher, PNC.
- Account banta hai → "Confirm my email" ki email (24 ghante mein ek) → confirm hone tak AI band.

**Google se:** Login ya Register pe "Continue with Google" →
- Pehle se account ho (same Google ya same email) → seedha andar.
- **Naya** ho → **screen 1: role chunein** (Patient / Doctor / Nurse) → **screen 2: wahi form** (naam Google se bhara, email locked, password nahi) → phone aur baqi details → account. Google email pehle se verified hota hai, isliye AI foran chalta hai. Doctor/nurse phir bhi admin verification tak "pending" rehte hain.
- Signup token 30 minute valid hai; zyada der ho to dobara "Continue with Google".

**Phone:** har signup pe lazmi. Sirf numbers, `+`, space, dash type hote hain; `03001234567`, `0300-1234567`, `+92 300 1234567`, landline sab sahi; ghalat number pe wahin laal message, aur server bhi reject karta hai.

**Forgot password:** login pe link → email → 6-digit code (15 min, 5 koshishein) → naya password.

## 5. Limits (kharcha aur spam se bachao)
| Cheez | Limit |
| --- | --- |
| AI messages | 40 / user / din (admin unlimited) |
| Report / scan | 5 / user / din |
| Voice | 40 / user / din |
| Confirmation email | 1 / user / 24 ghante |
| Password reset code | 1 / 10 minute, 15 minute valid, 5 koshishein |
| Login | 10 / minute / IP; 5 ghalat password = account 15 min lock |
| Signup | 10 / minute / IP |
| Contact form | 5 / 10 minute / IP |

## 6. Demo se pehle
`cd backend && npm run demo:reset` — pending doctors/nurse wapas queue mein, aaj ki nurse visit dobara record karne layak, test data saaf.

## 7. Logins (password `Password123`)
admin@vitacare.test · patient@vitacare.test · dr.saif@vitacare.test · nurse@vitacare.test · pt.kashif.khan.1@vitacare.test (physio)

## 8. Admin dashboard: static ya dynamic?
**Dynamic.** Har number database se live aata hai (doctors, nurses, AI chats, bookings, zabanein, departments).
Seed ne demo ke liye pichle 14 din ki 73 sample consultations daali hain (`[sample]` likha hota hai) taake chart khaali na dikhe.
Asli launch se pehle inhein hatana ho to: `DELETE FROM triage_sessions WHERE transcript::text LIKE '%[sample]%';`

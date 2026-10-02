# Email verification (Brevo) aur Google login (Firebase) — setup guide

Code poora tayyar hai. Aap ko sirf neeche ke accounts banane hain aur `.env` mein values daalni hain.
Dono services **free** hain:
- **Brevo:** 300 emails/roz free (har naye signup pe 1 email jati hai).
- **Firebase Authentication:** Google login 50,000 users/mahina tak free (Spark plan, card nahi lagta).

## Kaam kaise karta hai (short)
1. Koi bhi signup kare (patient, doctor, nurse) → usko **"Confirm my email"** wali email jati hai (link 24 ghante valid, sirf ek dafa chalta hai).
2. Jab tak email confirm na ho, **AI Doctor, report/scan aur voice band** rehte hain. Page pe likha aata hai "Confirm your email to use the AI Doctor", saath mein "Send the email again" aur emergency numbers (1122, Edhi, Umang).
   **Limit:** confirmation email **24 ghante mein sirf ek dafa** jati hai (signup wali email bhi isi mein ginti hoti hai). Dobara maangne pe likha aata hai ke inbox/spam mein link kholein; nayi email 24 ghante baad hi.
3. **"Continue with Google"**: naya user pehle **role chunta hai** (Patient / Doctor / Nurse), phir us role ka form bharta hai (phone lazmi). Google email pehle se verified hota hai → AI foran chal jata hai. Usi email ka account pehle se ho to seedha andar (duplicate nahi banta).
4. Pehle se bane saare accounts (seed / staging ke purane users) **verified mark** hain — un ke liye kuch nahi badla. Admin pe ye check nahi lagta.

---

## Part 1 — Brevo (email) — aap ka manual kaam

1. **Account:** https://www.brevo.com pe free signup karein, apna email confirm karein, profile (naam, company, address) poora karein.
   Brevo naye accounts ko transactional email ke liye kabhi kabhi approve karta hai — agar email na jaye to Brevo dashboard mein account status check karein.
2. **Sender verify karein:** Settings → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**.
   - Behtar: apne domain ka address (jaise `noreply@vitacare.pk`) aur us domain ko **authenticate** karein (Domains tab: Brevo jo DNS records — DKIM, DMARC — de, wo apne domain ke DNS mein daalein). Is se email spam mein nahi jati.
   - Jaldi test ke liye apna Gmail bhi sender ban sakta hai, lekin Gmail ke naam se bheji emails aksar **spam** mein jati hain. Asli launch ke liye apna domain lein.
   - Sender verify na ho to Brevo email reject karta hai (400 "sender email is invalid").
3. **API key:** top-right menu → **SMTP & API** → **API Keys** → **Generate a new API key** → naam "vita-care" → key copy karein (`xkeysib-...` se shuru hoti hai). Ye key sirf backend `.env` mein jati hai, kabhi frontend mein nahi.

## Part 2 — Firebase (Google login) — aap ka manual kaam

1. https://console.firebase.google.com → **Add project** → naam (jaise `vita-care`) → Google Analytics band kar sakte hain → Create. Plan **Spark (free)** hi rehne dein.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** → "Project support email" chunein → **Save**.
3. **Authentication → Settings → Authorized domains → Add domain:** apni staging website ka domain (jaise `vita-care-staging.vercel.app`) aur baad mein asli domain. `localhost` pehle se hota hai.
   (Ye na kiya to Google popup "auth/unauthorized-domain" error dega — website pe bhi yahi message dikhega.)
4. **Project settings (gear icon) → General → Your apps → Web (</>)** → app ka naam → **Register app** (Firebase Hosting ki zaroorat nahi). Jo `firebaseConfig` dikhe us mein se 4 values copy karein: `apiKey`, `authDomain`, `projectId`, `appId`.
5. Backend ko **service account file ki zaroorat nahi** — sirf Project ID chahiye.

---

## Part 3 — `.env` mein kya daalna hai

### Backend (`backend/.env`)
```
BREVO_API_KEY=xkeysib-...............          # Part 1, step 3
EMAIL_FROM_ADDRESS=noreply@your-domain.com     # Part 1, step 2 wala verified sender
EMAIL_FROM_NAME=Vita Care
APP_URL=https://your-frontend-address          # email ke link mein yahi address jata hai (aakhir mein / nahi)
FIREBASE_PROJECT_ID=vita-care-xxxxx            # Part 2, step 4 ka projectId
```

### Frontend (`frontend/.env.local`, ya hosting ke Environment Variables)
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=vita-care-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=vita-care-xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```
Firebase ki ye web values public hoti hain (browser mein jati hain) — inhein chhupana zaroori nahi. Inhein misuse se Firebase ki "Authorized domains" list bachati hai.

> **Zaroori:** `NEXT_PUBLIC_...` values build ke waqt app mein jud jati hain. Values daalne ya badalne ke baad frontend **dobara build/deploy** karein (`npm run build`), warna "Continue with Google" button nazar nahi aayega.

---

## Part 4 — staging pe update karne ke steps
```bash
cd backend
npm install                 # firebase-admin naya package hai
npm run migration:run       # users table mein naye columns; purane users verified mark hote hain
npm run build && npm run start:prod

cd ../frontend
npm install                 # firebase naya package hai
npm run build && npm start
```

## Forgot password
Login page pe **"Forgot password?"** → email likhein → 6-digit code email pe aata hai (15 minute valid, 5 ghalat koshishon ke baad band, 10 minute mein ek hi code) → code aur naya password → sign in. Ye bhi Brevo se jata hai, alag setup nahi.

## Contact page
`/contact` ka form message database mein save karta hai (**Admin → Messages**) aur `SUPPORT_EMAIL` pe email bhi bhejta hai.

## Part 5 — check karne ka tareeqa
1. Naye email se patient signup → inbox (aur spam folder) mein "Confirm your email for Vita Care".
2. AI Doctor kholein → "Confirm your email to use the AI Doctor" dikhe, chat na dikhe.
3. Email ka button dabayein → "Email confirmed" → "Open the AI Doctor" → chat chale.
4. Logout → Sign in → **Continue with Google** → Google account chunein → seedha dashboard, AI chalta ho.
5. Brevo dashboard → **Transactional → Logs** mein bheji gayi email nazar aaye.

## Agar kuch na chale
| Masla | Hal |
| --- | --- |
| Email nahi aayi | Spam folder; Brevo → Transactional → Logs; sender verified hai?; Brevo account approved hai?; backend log mein `Brevo rejected the email` ka message |
| Email ka link localhost pe khulta hai | Backend `APP_URL` mein staging website ka address daalein |
| "Continue with Google" button nahi dikhta | 4 `NEXT_PUBLIC_FIREBASE_*` values daal kar frontend dobara build karein |
| Google popup: "not allowed in Firebase" | Firebase → Authentication → Settings → Authorized domains mein apna domain add karein |
| "Google sign-in is not set up on this server yet." | Backend `.env` mein `FIREBASE_PROJECT_ID` daalein aur backend restart karein |
| Local development, Brevo key nahi | Email nahi jati; link backend ke log mein likha hota hai, aur "Send the email again" pe development link screen pe bhi dikhta hai (production mein kabhi nahi) |

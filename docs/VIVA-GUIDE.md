# Vita Care — Demo aur Viva Guide

## 30 second ka intro (yaad kar lo)

> "Pakistan mein 1,300 logon ke liye ek doctor hai, aur zyada-tar ilaaj jeb se hota hai.
> Log pehle Google ya WhatsApp se poochte hain, ya ghalat doctor ke paas jaate hain.
> Research kehti hai AI bimari pehchaan leta hai jab poori kahani mile — lekin mareez
> apni kahani aadhi batata hai. **Vita Care** mareez se uski zabaan mein — Urdu, Roman Urdu,
> English, bol kar ya likh kar — ek-ek sawal poochta hai, emergency kabhi miss nahi hone
> deta, aur poori summary asli, PMDC-verified doctor tak pohanchata hai."

## Demo accounts (password: `Password123`)

| Kaun | Email | Kya dikhana hai |
| --- | --- | --- |
| Patient | `patient@vitacare.test` | AI Doctor, medical history, booking |
| Doctor | `dr.saif@vitacare.test` | Visit panel: AI summary + history |
| Nurse | `nurse@vitacare.test` | Open requests, aaj ki visit pe vitals record karna, danger alert |
| Admin | `admin@vitacare.test` | Dashboard, doctor/nurse verification, safety monitor, blog editor |

## 3 minute demo (ye order)

1. **(0:00) Home page** — intro wali baat bolo.
2. **(0:25) AI Doctor, patient login ke saath.** Mic dabao aur bolo: *"Mujhe teen hafte se sar ke ek taraf dard hai"*.
   - Dikhao: ek sawal, tap wale jawab, Urdu awaaz mein jawab.
   - Bolo: "Isay pata hai Ali diabetic hai aur BP ki dawa leta hai — ye dobara nahi poochta."
3. **(1:10) Assessment:** department, urgency, possible conditions, Karachi ke neurologists pehle.
   "Book with summary" dabao.
4. **(1:35) Naya chat:** *"chest pain nahi hai, sirf khansi hai"* → **koi emergency nahi** (negation samajhta hai).
   Phir: *"seenay mein dard ho raha hai aur paseena"* → **laal banner, 1122 ka button**.
   Bolo: "Rules teen zabanon mein, aur ek alag AI safety check — dono sirf urgency barha sakte hain, kabhi ghata nahi sakte."
5. **(2:05) Lab report:** CBC ki photo → har value, Low/Normal/High, aur pattern ("low Hb + low MCV = shayad iron ki kami").
6. **(2:25) Doctor tab (`dr.saif`)** → Ali ka visit kholo → AI summary, history, dawaiyan, sawal.
7. **(2:45) Admin tab** → pending doctor ka PMDC number, Verify button; safety monitor.
8. **(2:55) Close:** (nurse feature ka zikr: "aur ab verified nurse ghar bhi aati hai, reading doctor tak jati hai") "110 cases pe test kiya: safety guard ne 36/36 emergencies pakdi, 14/14 trap cases sahi. Next: Alkhidmat ke hospitals aur WhatsApp."

## Home nursing ka 60-second demo (agar waqt ho)

1. `npm run demo:reset` pehle se chala lo.
2. **Nurse tab** (`nurse@vitacare.test`) → "My visits" → aaj ki post-op visit → "Record visit & vitals" → SpO₂ **89** → laal "Dangerous reading" alert.
3. **Doctor tab** (`dr.saif`) → Ali ka visit → "Home nursing" mein wahi reading aur alert → "Order home nursing" (daily dressing).
4. **Patient tab** → dashboard pe laal banner: "reading danger range mein thi, 1122".
5. Bolo: *"Pakistan mein har doctor ke liye sirf 0.4 nurse hai. Home nursing companies call-centre model pe chalti hain aur nurse ka koi record doctor tak nahi jata. Hum nurse ka licence verify karte hain, doctor khud visit order karta hai, aur har reading doctor tak pohanchti hai."*

## Architecture — asaan alfaaz mein

- **Frontend:** Next.js (website + admin panel). **Backend:** NestJS API. **Database:** PostgreSQL.
- **Har message pe 6 qadam:**
  1. Safety guard (rules, 3 zabanein, "nahi" aur purani history samajhta hai)
  2. Database se mareez ka record
  3. Guidelines knowledge base se relevant cards (RAG)
  4. AI (Qwen ya OpenAI) — pehle English mein sochta hai, phir mareez ki zabaan mein jawab
  5. Alag AI emergency check — sirf urgency barha sakta hai
  6. Session save → booking ke saath doctor tak
- **Voice:** OpenAI audio (Urdu samajhta aur bolta hai). Roman Urdu ko bolne se pehle Urdu script mein badalta hai.

## Viva ke mumkin sawal aur jawab

**Q: Ye ChatGPT se kaise alag hai?**
ChatGPT mein emergency ka rule layer nahi, mareez ka record nahi, aur end mein koi asli doctor nahi. Hum sawal khud poochte hain, emergency miss nahi hone dete, aur summary verified doctor tak le jaate hain.

**Q: AI ghalat hua to?**
Teen layer hain: (1) rules jo LLM se alag chalte hain, (2) alag AI emergency check, (3) har jagah likha hai "ye diagnosis nahi". Aakhri faisla doctor ka hai. Urgency sirf barh sakti hai, ghat nahi sakti.

**Q: Accuracy kitni hai?**
Imaandari se: clinically validate nahi hua. 110 cases ke development set pe safety guard ne 36/36 emergencies pakdi aur 14/14 trap cases sahi kiye. Ek false alarm ("khane ke baad seene mein jalan") jaan-boojh kar rakha hai. Ye set team ne likha hai — agla qadam doctors se review karwana hai.

**Q: Alibaba ka hackathon hai, OpenAI kyun?**
Chat kisi bhi provider pe chalti hai — ek setting se Qwen ya OpenAI. Voice ke liye humne research ki: Qwen3-ASR ki 30 zabanon mein Urdu nahi, aur Qwen TTS bhi Urdu nahi bolta. Qwen3-Omni Urdu sun sakta hai lekin bol nahi sakta. Isliye voice OpenAI se hai. Jab Qwen Urdu support karega, sirf setting badlegi.

**Q: Fake doctor register ho gaya to?**
Naya doctor "pending" rehta hai aur mareezon ko dikhta hi nahi. Admin PMDC ki website pe number check karke verify karta hai. Reject karne pe wajah likhna zaroori hai. Har action audit log mein jaata hai.

**Q: Data privacy?**
AI ko mareez ka naam ya phone nahi bheja jata — sirf umar, jins, sheher, bimariyan, dawaiyan. Receipt ka link random code hai (guess nahi ho sakta). Sirf treating doctor record dekh sakta hai, aur har dafa audit log banta hai. Pakistan ka data protection qanoon abhi pass nahi hua, lekin draft mein health data "sensitive" hai — hum usi hisaab se design kar rahe hain.

**Q: Internet chala jaye to?**
AI Doctor khud offline mode pe chala jata hai (rule-based interview), UI pe saaf likha hota hai. Safety guard aur doctor panel phir bhi kaam karte hain.

**Q: Home nursing to pehle se hoti hai (Holistic, Z Care…), aap mein naya kya hai?**
Wo agency model hain: call karo, representative nurse bhejta hai, record kahin nahi jata. Hamare yahan (1) nurse ka PNMC licence admin verify karta hai; PNMC Act ke Section 23 mein unregistered nurse rakhna mana hai, (2) doctor khud visit order karta hai, (3) nurse ki har vitals reading doctor ke panel aur mareez ke record mein jati hai, (4) khatarnak reading (SpO₂ < 92, BP ≥ 180/120, sugar < 54) pe foran alert aata hai, (5) female nurse ka option.

**Q: Nurse ko mareez ka address kab dikhta hai?**
Sirf visit accept karne ke baad. Pehle sirf area aur sheher dikhta hai, aur mareez ka phone bhi accept ke baad. Mareez ko nurse ka phone bhi accept ke baad milta hai.

**Q: Roles aur security kaise sambhali?**
Chaar roles hain: patient, doctor, nurse, admin. Har API route backend pe role check karta hai aur ownership bhi. Maslan doctor sirf apne mareez ka record kholta hai. 13 cross-role tests hain jo 403 confirm karte hain. Admin public signup se nahi banta. Poori table `docs/RBAC.md` mein hai.

**Q: Business model?**
Mareez ke liye free. Clinics aur hospitals booking ya pre-visit summary ke liye subscription dein. NGOs (jaise Alkhidmat) bade paimane pe triage ke liye use karein.

**Q: Aage kya?**
Doctors se evaluation review, Alkhidmat facilities se jorna, WhatsApp channel, consent screen aur "mera data delete karo".

## Backup plan

- Internet na ho: offline mode khud chalega — bol do aur aage barho.
- Mic kaam na kare: type kar lo, baaqi sab same.
- Har step ke screenshots laptop pe rakho.
- Demo se pehle `npm run eval` chala kar asli numbers note kar lo.

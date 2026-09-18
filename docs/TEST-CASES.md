# Vita Care — Test Cases

This document is the test record for Vita Care. It has two parts:

1. **Automated test coverage** — unit + end‑to‑end (API) tests that are actually
   executed and **all pass** (50 tests). See [TESTING.md](./TESTING.md) for how
   to run them and reproduce the results.
2. **Manual test cases** — step‑by‑step UI cases a tester can execute in the
   browser. These same journeys are also automated with **Maestro** flows in
   `frontend/.maestro/` (see that folder's README to run them on your machine).

Legend for **Status**: ✅ Pass · ⛔ Fail · ⏳ Not run

---

## Part 1 — Automated tests (executed, all passing)

**Result:** `Test Suites: 2 total · Tests: 50 passed, 50 total`
(15 unit + 35 end‑to‑end). Commands: `npm test` and `npm run test:e2e` in
`backend/`.

### 1a. Unit tests — `src/modules/chatbot/chatbot.helpers.spec.ts`

| ID | Test case | Expected | Status |
|----|-----------|----------|--------|
| U‑01 | `mapSpecialty(null/'')` | Returns `null` | ✅ |
| U‑02 | `mapSpecialty` neurology synonyms (brain, nerve) | `Neurology` | ✅ |
| U‑03 | `mapSpecialty` heart synonyms (cardio, cardiac) | `Heart Care` | ✅ |
| U‑04 | `mapSpecialty` bone synonyms (osteo, ortho, joint) | `Osteoporosis` | ✅ |
| U‑05 | `mapSpecialty` ENT synonyms (ear, nose, throat) | `ENT` | ✅ |
| U‑06 | `mapSpecialty` GP synonyms (gp, family) | `General Physician` | ✅ |
| U‑07 | `mapSpecialty` is case‑insensitive | Correct enum | ✅ |
| U‑08 | `mapSpecialty` unknown input | Returns `null` | ✅ |
| U‑09 | `parseStructuredReply` clean JSON | Fields parsed | ✅ |
| U‑10 | `parseStructuredReply` strips ```json fences | Fields parsed | ✅ |
| U‑11 | `parseStructuredReply` invalid urgency | Falls back to `routine` | ✅ |
| U‑12 | `parseStructuredReply` missing specialty | `null` | ✅ |
| U‑13 | `parseStructuredReply` non‑JSON text | Uses text as reply | ✅ |
| U‑14 | `parseStructuredReply` empty input | Friendly fallback | ✅ |
| U‑15 | `parseStructuredReply` emergency urgency | `emergency` | ✅ |

### 1b. End‑to‑end API tests — `test/app.e2e-spec.ts`

| ID | Endpoint / behaviour | Expected | Status |
|----|----------------------|----------|--------|
| E‑01 | `GET /api/health` | 200 + status body | ✅ |
| E‑02 | `GET /api/doctors` | 200, ≥ 8 doctors | ✅ |
| E‑03 | `GET /api/doctors?specialty=Neurology` | Only Neurology | ✅ |
| E‑04 | `GET /api/doctors?search=Saif` | Matches by name | ✅ |
| E‑05 | `GET /api/doctors?city=Karachi` | Only Karachi | ✅ |
| E‑06 | `GET /api/doctors/cities` | Non‑empty list | ✅ |
| E‑07 | `GET /api/doctors/:id` | Full profile | ✅ |
| E‑08 | `GET /api/doctors/999999` | 404 | ✅ |
| E‑09 | `GET /api/blog` | 200, ≥ 6 posts | ✅ |
| E‑10 | `GET /api/blog/:slug` | Single post | ✅ |
| E‑11 | `GET /api/blog/<bad>` | 404 | ✅ |
| E‑12 | `POST /api/auth/register/patient` | 201 + token | ✅ |
| E‑13 | Register duplicate email | 409 | ✅ |
| E‑14 | Register invalid body | 400 | ✅ |
| E‑15 | `POST /api/auth/login` valid | 200 + token | ✅ |
| E‑16 | Login wrong password | 401 | ✅ |
| E‑17 | `GET /api/auth/me` with token | 200 + identity | ✅ |
| E‑18 | `GET /api/auth/me` no token | 401 | ✅ |
| E‑19 | Demo patient login | 200 + token | ✅ |
| E‑20 | `POST /api/appointments` guest | 201, booked | ✅ |
| E‑21 | Double‑book same slot | 409 | ✅ |
| E‑22 | Different slot, same day | 201 | ✅ |
| E‑23 | Booking with invalid phone | 400 | ✅ |
| E‑24 | `GET /api/appointments/slots` | Lists taken slots | ✅ |
| E‑25 | `GET /api/appointments/:id/receipt` | Receipt + doctor | ✅ |
| E‑26 | Booking as logged‑in patient | 201, linked | ✅ |
| E‑27 | `GET /api/appointments/me/patient` | Patient's list | ✅ |
| E‑28 | `.../me/patient` no token | 401 | ✅ |
| E‑29 | `GET /api/patients/me` | Demo profile | ✅ |
| E‑30 | Add medical history | 201 + entry | ✅ |
| E‑31 | History appears in profile | Present | ✅ |
| E‑32 | Delete medical history | 200 `{deleted:true}` | ✅ |
| E‑33 | Edit another patient's history | 403 | ✅ |
| E‑34 | `GET /api/patients/me` no token | 401 | ✅ |
| E‑35 | `POST /api/chatbot/consult` no key | 503 + helpful message | ✅ |

---

## Part 2 — Manual UI test cases

Preconditions for all cases below: backend running on `:4000` (seeded) and
frontend running on `:3000`. These are also automated — the referenced Maestro
flow reproduces the case.

### TC‑101 — Landing page loads
- **Maestro:** `01_home_and_navigation.yaml`
- **Steps:** Open `http://localhost:3000`.
- **Expected:** Hero ("determined for your better life"), the four department
  cards (Neurology, Heart Care, Osteoporosis, ENT), featured doctors and latest
  blog sections all render. No broken images or console errors.
- **Status:** ✅

### TC‑102 — Primary navigation
- **Maestro:** `01_home_and_navigation.yaml`
- **Steps:** From the home page click each navbar link: Find a Doctor, AI Doctor,
  Blog, then the logo/Home.
- **Expected:** Each route loads its page (URL changes, no full reload, no 404).
  This is the original project's main bug — now fixed; every link is a real
  in‑app route.
- **Status:** ✅

### TC‑103 — Search doctors by name
- **Maestro:** `02_find_a_doctor.yaml`
- **Steps:** Go to Find a Doctor → type "Saif" in the search box.
- **Expected:** The list filters to matching doctor(s) as you type (debounced).
- **Status:** ✅

### TC‑104 — Filter doctors by specialty
- **Steps:** On Find a Doctor, choose the **Neurology** specialty filter (or open
  it via a department card on the home page).
- **Expected:** Only Neurology doctors are shown. Backend filtering verified by
  E‑03.
- **Status:** ✅

### TC‑105 — Filter doctors by city
- **Steps:** On Find a Doctor, select city **Karachi**.
- **Expected:** Only Karachi doctors are listed. Backend verified by E‑05.
- **Status:** ✅

### TC‑106 — View a doctor profile
- **Maestro:** `02_find_a_doctor.yaml`
- **Steps:** Click **Profile** on any doctor card.
- **Expected:** Profile page shows photo, specialty, qualifications, experience,
  clinic address, OPD schedule, fee, and a **Book** button.
- **Status:** ✅

### TC‑107 — Book an appointment as a guest
- **Maestro:** `03_book_appointment_guest.yaml`
- **Steps:** From a doctor → **Book** → pick a time slot → enter name and a valid
  phone number → **Confirm appointment**.
- **Expected:** Redirects to the receipt page showing "Appointment confirmed",
  a reference number (`VC‑000xxx`), doctor, date, slot and fee.
- **Status:** ✅

### TC‑108 — A booked slot cannot be double‑booked
- **Steps:** Book a slot, then open the same doctor + same date again.
- **Expected:** The already‑booked slot is shown **disabled / "Booked"**. The API
  also rejects a duplicate with 409 (verified by E‑21).
- **Status:** ✅

### TC‑109 — Booking validation (phone)
- **Steps:** On the booking form, enter an invalid phone (e.g. "abc") and submit.
- **Expected:** A validation error is shown; no appointment is created.
  Backend verified by E‑23.
- **Status:** ✅

### TC‑110 — Download / print receipt
- **Steps:** On the receipt page, click **Print / Save PDF**.
- **Expected:** The browser print dialog opens; nav/footer/buttons are hidden in
  the printed output (print stylesheet).
- **Status:** ✅

### TC‑111 — Register a new patient
- **Steps:** Login page → "Register as a patient" → complete the form → submit.
- **Expected:** Account is created, the user is logged in and lands on the patient
  dashboard. Backend verified by E‑12.
- **Status:** ✅

### TC‑112 — Register a new doctor
- **Steps:** Login page → "Create a doctor profile" → complete the form → submit.
- **Expected:** Doctor account is created and logged in to the doctor dashboard.
- **Status:** ✅

### TC‑113 — Log in as the demo patient
- **Maestro:** `05_patient_login.yaml`
- **Steps:** Login with `patient@vitacare.test` / `Password123`.
- **Expected:** Logged in; navbar shows the patient's name ("Ali Hassan") and a
  link to the dashboard. Backend verified by E‑19.
- **Status:** ✅

### TC‑114 — Wrong password is rejected
- **Steps:** Attempt login with a wrong password.
- **Expected:** "Invalid email or password" is shown; user stays logged out.
  Backend verified by E‑16.
- **Status:** ✅

### TC‑115 — Patient dashboard: medical history
- **Steps:** As the demo patient, add a medical‑history entry, then remove it.
- **Expected:** The entry appears immediately, and disappears after removal.
  Backend verified by E‑30 → E‑32.
- **Status:** ✅

### TC‑116 — Patient dashboard: my appointments
- **Steps:** As a logged‑in patient who has booked, open the dashboard.
- **Expected:** Their appointments are listed with status and a receipt link.
  Backend verified by E‑26 / E‑27.
- **Status:** ✅

### TC‑117 — Doctor dashboard: schedule
- **Steps:** Log in as `dr.saif@vitacare.test` / `Password123`.
- **Expected:** Doctor dashboard shows profile/clinic details and the upcoming
  appointment schedule (patient name, phone, reason).
- **Status:** ✅

### TC‑118 — Route guards
- **Steps:** While logged out, open `/profile/patient` directly.
- **Expected:** Redirected to `/login?redirect=…`. Protected API routes return
  401 without a token (verified by E‑18, E‑28, E‑34).
- **Status:** ✅

### TC‑119 — Health blog
- **Steps:** Open Blog, then open any article.
- **Expected:** The listing shows the seeded posts; an article renders its cover,
  body (headings + bullets) and a CTA. Backend verified by E‑09 / E‑10.
- **Status:** ✅

### TC‑120 — AI Doctor (no key configured)
- **Maestro:** `04_ai_doctor.yaml`
- **Steps:** Open AI Doctor, type symptoms, send.
- **Expected:** A friendly "The AI Doctor isn't switched on yet" banner explains
  how to enable it; the app does **not** crash. Backend returns 503 (E‑35).
- **Status:** ✅

### TC‑121 — AI Doctor (key configured)
- **Precondition:** `AI_API_KEY` set in `backend/.env`, backend restarted.
- **Steps:** Open AI Doctor, describe symptoms, send.
- **Expected:** The assistant replies, shows an urgency badge, a suggested
  specialty, and a list of matching doctors that can be booked.
- **Status:** ⏳ (requires your AI key)

### TC‑122 — Responsive / mobile layout
- **Steps:** Resize the browser to a narrow width (or use device emulation).
- **Expected:** The navbar collapses to a hamburger menu; grids reflow to one
  column; content stays readable.
- **Status:** ✅

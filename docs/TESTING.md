# Testing Vita Care

Vita Care is tested at three levels. The first two run automatically and are
**verified passing**; the third drives the real UI in a browser.

| Level | Tool | Location | Runs where |
|-------|------|----------|------------|
| Unit | Jest | `backend/src/**/*.spec.ts` | Anywhere (no DB) |
| End‑to‑end (API) | Jest + Supertest | `backend/test/app.e2e-spec.ts` | Needs PostgreSQL |
| UI end‑to‑end | Maestro | `frontend/.maestro/*.yaml` | Your machine (browser) |

The detailed case‑by‑case record is in [TEST-CASES.md](./TEST-CASES.md).

---

## 1. Unit tests (fast, no database)

Pure‑logic tests for the AI Doctor's specialty mapping and JSON parsing.

```bash
cd backend
npm test
```

Expected:

```
Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

---

## 2. End‑to‑end API tests (against PostgreSQL)

These boot the real NestJS app (same pipes, prefix and error filter as
production) and hit every endpoint with real HTTP requests.

**Prerequisites**

1. PostgreSQL running and the `vita_care` database migrated and seeded (`npm run migration:run && npm run seed`). The suite deletes the bookings and accounts it creates.
2. `backend/.env` filled in (DB credentials).
3. Schema + demo data loaded once:
   ```bash
   cd backend
   npm run migration:run
   npm run seed
   ```

**Run**

```bash
cd backend
npm run test:e2e
```

Expected:

```
Test Suites: 1 passed, 1 total
Tests:       68 passed, 68 total
```

The suite is **idempotent** — every account uses a random email and every
booking uses a unique far‑future date, so you can run it repeatedly without
cleaning the database.

### What the API suite covers
- Health check
- Doctors: list, filter by specialty / city, search, single, 404
- Blog: list, single, 404
- Auth: register (patient), duplicate → 409, invalid → 400, login,
  wrong password → 401, `/me` with and without a token, demo login
- Appointments: guest booking, **double‑book → 409**, different slot,
  invalid input → 400, taken‑slots list, receipt, patient‑linked booking,
  "my appointments", auth guard
- Patients: profile, add/remove medical history, **ownership → 403**, auth guard
- Chatbot: graceful **503** with a helpful message when no AI key is set

---

## 3. UI end‑to‑end tests (Maestro)

Twelve Maestro web flows drive the real website in Chrome, covering every role:

| Flow | Role | Checks |
| --- | --- | --- |
| 01_public_home_navigation | Guest | Home, doctors, home nursing, blog pagination |
| 02_public_find_doctor | Guest | Search "Saif", open profile, book button |
| 03_guest_book_appointment | Guest | First free OPD slot, booking, `VC-` reference |
| 04_ai_doctor_safety | Guest | "chest pain nahi hai" gives no banner; "seenay mein dard" shows 1122 |
| 05_rbac_redirects | Patient, nurse, admin | Each role is sent back to its own dashboard |
| 06_patient_request_home_nurse | Patient | Request an injection visit, `HN-` reference |
| 07_nurse_accept_and_record_vitals | Nurse | Sees the request; records SpO₂ 89 → "Dangerous reading" |
| 08_doctor_sees_vitals_and_orders_nurse | Doctor | Sees the alert in the visit panel; orders home nursing |
| 09_admin_verify_nurse | Admin | Verifies the pending nurse |
| 10_admin_publish_blog | Admin | Writes and publishes a post, opens it on the blog |
| 11_register_contact_forgot | Guest | Role cards on /register, city dropdown, contact form, forgot-password code step |
| 12_doctor_patient_pages | Doctor | Home Nursing and booking show "for patients" and lead back to the dashboard |

### Run them

```bash
# 1) App running: backend on :4000, frontend on :3000 (production build recommended)
cd backend && npm run demo:reset          # fresh demo data before every run

# 2) Maestro (needs Java 17+ and Google Chrome)
curl -Ls "https://get.maestro.mobile.dev" | bash

# 3) Run all flows, in order, headless with a tall window
cd frontend
maestro test --headless --screen-size 1440x2400 .maestro
```

Notes from setting this up:

- Use a **tall screen size**. Maestro web does not scroll to find elements, and the default headless window is 1024×625.
- On Linux as **root** (Docker, CI), Chrome needs `--no-sandbox`. Point `/usr/bin/google-chrome` to a small wrapper
  script that adds `--no-sandbox --disable-dev-shm-usage` before the real Chrome binary.
- Run **one** Maestro process at a time; two runs sharing the browser fail randomly.
- Buttons with an icon expose their text with a leading space, so flows match them with `.*text.*`.
- The shared login subflow opens `/login?logout=1` first, so each flow starts signed out.

## 4. Browser checks used during development

Alongside Maestro, the same journeys were run with Playwright on 30 Sep 2026:
27/27 role checks passed (patient, nurse, doctor, admin, RBAC redirects, blog banner
in list and detail, Open Graph image), and 25 pages × 2 sizes (390 px phone, 768 px tablet)
showed no horizontal overflow.

## Summary

- ✅ **144 unit tests** and **122 API e2e tests** pass (includes a 13-case RBAC matrix, AHPC and home-visit location tests).
- ✅ **119-case evaluation**: 36/36 emergencies, 16/16 trap cases, department routing 82/83 (rules only).
- ✅ **12 Maestro flows** covering every role: 12/12 pass in one run (1 Oct 2026).
- ✅ **Responsive:** 35 pages × 2 sizes (390 px, 768 px), every role: no horizontal overflow, no JS errors.

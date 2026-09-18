# Testing Vita Care

Vita Care is tested at three levels. The first two run automatically and are
**verified passing**; the third drives the real UI in a browser.

| Level | Tool | Location | Runs where |
|-------|------|----------|------------|
| Unit | Jest | `backend/src/**/*.spec.ts` | Anywhere (no DB) |
| End‑to‑end (API) | Jest + Supertest | `backend/test/app.e2e-spec.ts` | Needs MySQL |
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

## 2. End‑to‑end API tests (against MySQL)

These boot the real NestJS app (same pipes, prefix and error filter as
production) and hit every endpoint with real HTTP requests.

**Prerequisites**

1. MySQL running and the `vita_care` database created.
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
Tests:       35 passed, 35 total
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

Maestro flows drive the running website in a real browser and check the main
user journeys (home/navigation, find a doctor, guest booking → receipt, AI
Doctor, patient login).

Because Maestro needs a real browser, run these on your own machine with the app
running. Full instructions (install Maestro, start the app, run the flows) are
in [`frontend/.maestro/README.md`](../frontend/.maestro/README.md).

Quick version:

```bash
# 1) start backend (:4000, seeded) and frontend (:3000) in two terminals
# 2) install Maestro:  curl -Ls "https://get.maestro.mobile.dev" | bash
# 3) run the flows:
cd frontend
maestro test .maestro/
```

---

## Summary

- ✅ **50 automated tests pass** (15 unit + 35 API e2e).
- ✅ **5 Maestro flows** cover the core UI journeys end to end.
- ✅ **22 manual test cases** documented in `TEST-CASES.md`, mapped to the
  automated coverage above.

# Vita Care — Healthcare Appointment Platform

A full-stack healthcare web application where patients can browse specialists,
book appointments, read health articles, and get first-line guidance from an
**AI symptom checker** that recommends the right kind of doctor. Doctors get
their own dashboard to manage their profile and see their upcoming schedule.

Built with **Next.js 14 + TypeScript** on the frontend and **NestJS + TypeORM +
MySQL** on the backend.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Getting started](#getting-started)
6. [Seed accounts](#seed-accounts)
7. [Enabling the AI Doctor](#enabling-the-ai-doctor)
8. [API reference](#api-reference)
9. [Available scripts](#available-scripts)
10. [Testing](#testing)
11. [Notes & design decisions](#notes--design-decisions)

---

## Features

**Patients**
- Browse and search doctors by name, specialty, or city.
- View a rich doctor profile (qualifications, experience, fees, OPD schedule).
- Book an appointment by picking a date and an available time slot. Slots that
  are already taken are shown as unavailable, and the API rejects
  double-bookings.
- Get a printable appointment receipt (with a reference number).
- Register / log in and manage a personal profile plus a medical-history list.
- See all of their past and upcoming appointments in one place.

**Doctors**
- Register as a doctor with specialty, fees, schedule, qualifications, etc.
- A dashboard to edit their profile and clinic details.
- View their appointment schedule (who booked, when, and why).

**AI Doctor (symptom checker)**
- A chat interface where a patient describes symptoms in plain language.
- The assistant replies, estimates urgency (routine / soon / emergency),
  suggests a relevant medical specialty, and surfaces **real, bookable doctors**
  from the database that match.
- Degrades gracefully: if no AI key is configured, the UI shows a friendly
  "not switched on yet" message instead of breaking.

**Content**
- A blog / health-tips section with a listing page and individual articles.

---

## Tech stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Frontend  | Next.js 14 (App Router), React 18, TypeScript, CSS Modules        |
| Icons     | lucide-react                                                      |
| HTTP      | Axios (with a JWT request interceptor)                            |
| Backend   | NestJS 10, TypeScript                                              |
| ORM / DB  | TypeORM 0.3 + MySQL (schema managed by migrations, not `sync`)    |
| Auth      | JWT (Passport), bcrypt password hashing                           |
| Validation| class-validator / class-transformer via a global `ValidationPipe` |
| AI        | Any OpenAI-compatible Chat Completions API (server-side only)     |

---

## Project structure

```
vita-care/
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── config/           # env config + TypeORM data source
│   │   ├── database/
│   │   │   ├── migrations/    # schema (InitSchema)
│   │   │   └── seeds/         # seed.ts — demo doctors, patient, blog posts
│   │   ├── modules/
│   │   │   ├── auth/          # register/login, JWT strategy, guards
│   │   │   ├── users/         # base user (email + role)
│   │   │   ├── doctors/       # doctor CRUD + search
│   │   │   ├── patients/      # patient profile + medical history
│   │   │   ├── appointments/  # booking, slot availability, receipts
│   │   │   ├── blog/          # blog posts
│   │   │   └── chatbot/       # AI Doctor consult endpoint
│   │   └── main.ts
│   ├── .env.example
│   └── package.json
│
└── frontend/                 # Next.js app
    ├── src/
    │   ├── app/               # routes (App Router)
    │   │   ├── doctors/       # list + [id] profile
    │   │   ├── appointments/[doctorId]/   # booking page
    │   │   ├── receipt/[id]/  # printable receipt
    │   │   ├── blog/          # list + [slug] article
    │   │   ├── ai-doctor/     # AI symptom checker
    │   │   ├── profile/       # patient + doctor dashboards
    │   │   ├── login/ · register/
    │   │   └── page.tsx        # landing page
    │   ├── components/        # home sections, layout, doctor card, ui
    │   ├── context/           # AuthContext (session in localStorage)
    │   └── lib/               # api client + shared types
    ├── .env.local.example
    └── package.json
```

---

## Prerequisites

- **Node.js 18+** and npm
- **MySQL 8** (or MariaDB 10.4+) running locally

---

## Getting started

### 1. Database

Create an empty database. The schema itself is created by the migration in the
next step, so you only need the empty DB and a user that can access it.

```sql
CREATE DATABASE vita_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # then edit .env with your DB credentials
npm install
npm run migration:run         # create all tables
npm run seed                  # load demo doctors, a patient, and blog posts
npm run start:dev             # API runs on http://localhost:4000/api
```

You can confirm it's up by opening <http://localhost:4000/api/health>.

> The included `.env` values are a ready-to-run **local development** config.
> Replace `JWT_SECRET` and the database password before deploying anywhere.

### 3. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev                   # app runs on http://localhost:3000
```

The frontend talks to `http://localhost:4000/api` by default. To point it
elsewhere, create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Open <http://localhost:3000> and you're ready.

---

## Seed accounts

After running `npm run seed`, every demo account shares the same password:

```
Password: Password123
```

| Role    | Email                     | Name             | Specialty          |
| ------- | ------------------------- | ---------------- | ------------------ |
| Patient | `patient@vitacare.test`   | Ali Hassan       | —                  |
| Doctor  | `dr.saif@vitacare.test`   | Saif Ur Rehman   | Neurology          |
| Doctor  | `dr.ayesha@vitacare.test` | Ayesha Khan      | Heart Care         |
| Doctor  | `dr.ghufran@vitacare.test`| Ghufran Ali      | Osteoporosis       |
| Doctor  | `dr.sana@vitacare.test`   | Sana Malik       | ENT                |
| Doctor  | `dr.bilal@vitacare.test`  | Bilal Ahmed      | General Physician  |
| Doctor  | `dr.hina@vitacare.test`   | Hina Raza        | Neurology          |
| Doctor  | `dr.usman@vitacare.test`  | Usman Sheikh     | Heart Care         |
| Doctor  | `dr.fatima@vitacare.test` | Fatima Iqbal     | ENT                |

---

## Enabling the AI Doctor

The chatbot calls an **OpenAI-compatible** Chat Completions endpoint from the
server (your key is never exposed to the browser). Set these in `backend/.env`:

```
AI_API_KEY=sk-...            # your provider key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

Any compatible provider works — just change `AI_BASE_URL` and `AI_MODEL`.
Without a key, the `/api/chatbot/consult` endpoint returns a clear
"not configured" response and the UI explains how to enable it, so the rest of
the app keeps working.

---

## API reference

Base URL: `http://localhost:4000/api`

### Auth
| Method | Endpoint                  | Body / notes                          |
| ------ | ------------------------- | ------------------------------------- |
| POST   | `/auth/register/patient`  | email, password, firstName, lastName… |
| POST   | `/auth/register/doctor`   | + specialty, fees, …                  |
| POST   | `/auth/login`             | email, password → `{ accessToken, user }` |
| GET    | `/auth/me`                | current user (JWT)                    |

### Doctors
| Method | Endpoint             | Notes                                            |
| ------ | -------------------- | ------------------------------------------------ |
| GET    | `/doctors`           | query: `search`, `specialty`, `city`             |
| GET    | `/doctors/cities`    | distinct list of cities                          |
| GET    | `/doctors/:id`       | single doctor                                    |
| GET    | `/doctors/me/profile`| logged-in doctor's profile (JWT)                 |
| PATCH  | `/doctors/:id`       | update profile (JWT, owner)                      |

### Patients
| Method | Endpoint                             | Notes                        |
| ------ | ------------------------------------ | ---------------------------- |
| GET    | `/patients/me`                       | profile + medical history    |
| PATCH  | `/patients/:id`                      | update profile               |
| POST   | `/patients/:id/medical-history`      | add a condition              |
| DELETE | `/patients/:id/medical-history/:hid` | remove a condition           |

### Appointments
| Method | Endpoint                       | Notes                                             |
| ------ | ------------------------------ | ------------------------------------------------- |
| POST   | `/appointments`                | book (guest or JWT); rejects taken slots with 409 |
| GET    | `/appointments/slots`          | query `doctorId`, `date` → booked slot list       |
| GET    | `/appointments/:id/receipt`    | printable receipt data                            |
| GET    | `/appointments/me/patient`     | my appointments (patient, JWT)                    |
| GET    | `/appointments/me/doctor`      | my schedule (doctor, JWT)                         |

### Blog
| Method | Endpoint        | Notes            |
| ------ | --------------- | ---------------- |
| GET    | `/blog`         | all posts        |
| GET    | `/blog/:slug`   | single post      |

### Chatbot
| Method | Endpoint             | Notes                                              |
| ------ | -------------------- | -------------------------------------------------- |
| POST   | `/chatbot/consult`   | `{ messages, patientContext? }` → reply + doctors  |

---

## Available scripts

**Backend** (`cd backend`)
| Script                      | What it does                          |
| --------------------------- | ------------------------------------- |
| `npm run start:dev`         | Run the API in watch mode             |
| `npm run build`             | Compile to `dist/`                    |
| `npm run start:prod`        | Run the compiled API                  |
| `npm run migration:run`     | Apply database migrations             |
| `npm run migration:revert`  | Roll back the last migration          |
| `npm run seed`              | Seed demo data                        |

**Frontend** (`cd frontend`)
| Script            | What it does                    |
| ----------------- | ------------------------------- |
| `npm run dev`     | Start the dev server (port 3000)|
| `npm run build`   | Production build                |
| `npm run start`   | Serve the production build      |
| `npm run lint`    | Lint                            |

---

## Testing

Vita Care ships with automated tests and documented manual test cases.

- **Unit + API end‑to‑end tests (verified passing — 50 tests):**
  ```bash
  cd backend
  npm test            # 15 unit tests (no database needed)
  npm run test:e2e    # 35 end‑to‑end API tests (needs MySQL, seeded)
  ```
- **UI end‑to‑end (Maestro):** browser flows for the main journeys live in
  `frontend/.maestro/` — see that folder's README to install Maestro and run
  them on your machine.
- **Docs:** [`docs/TESTING.md`](docs/TESTING.md) explains how to run each layer;
  [`docs/TEST-CASES.md`](docs/TEST-CASES.md) is the full case‑by‑case record.

---

## Notes & design decisions

- **Migrations over `synchronize`.** The schema is created by an explicit
  migration (`DB_SYNCHRONIZE=false`), which is the production-safe approach and
  keeps schema changes reviewable.
- **Guest booking.** Appointments can be booked without an account. If a patient
  is logged in, the appointment is linked to their profile and appears in their
  dashboard; the same slot can never be double-booked (enforced at the API with
  a `409 Conflict`).
- **Security.** Passwords are bcrypt-hashed; the password hash is never selected
  by default. JWTs are signed server-side, and the AI key lives only on the
  server. Inputs are validated by a global `ValidationPipe` with DTOs.
- **Graceful AI fallback.** The app is fully usable without an AI key — the
  symptom checker simply explains how to enable it.
- **Type safety end-to-end.** Shared response shapes are typed on the frontend
  (`src/lib/types.ts`) to mirror the API.
```

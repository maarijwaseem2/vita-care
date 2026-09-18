# Maestro end-to-end flows (Vita Care frontend)

These are [Maestro](https://maestro.mobile.dev) UI flows that drive the running
website in a real browser and verify the main user journeys end to end:

| Flow | What it checks |
|------|----------------|
| `01_home_and_navigation.yaml` | Landing page renders; navbar routing works |
| `02_find_a_doctor.yaml` | Doctor directory, search, open a profile |
| `03_book_appointment_guest.yaml` | Book a slot as a guest → receipt page |
| `04_ai_doctor.yaml` | AI Doctor page loads and accepts input |
| `05_patient_login.yaml` | Log in as the demo patient → dashboard |

> Maestro drives a real browser, so (unlike the backend Jest tests) these must
> be run on your own machine with the app running — they can't run inside a
> headless CI sandbox without a browser. Everything you need is below.

## 1. Prerequisites

- **The app must be running** (both parts):
  - Backend API on `http://localhost:4000` (`cd backend && npm run start:dev`)
  - Frontend on `http://localhost:3000` (`cd frontend && npm run dev`)
  - The backend must be **seeded** (`npm run seed`) so the demo patient
    `patient@vitacare.test / Password123` and the sample doctors exist.
- **Google Chrome** installed (Maestro uses it to drive the web).
- **Java 17+** (Maestro requires a JDK).

## 2. Install Maestro

macOS / Linux:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Then restart your terminal (or `export PATH="$PATH":"$HOME/.maestro/bin"`) and
confirm it's installed:

```bash
maestro --version
```

(Windows: install via WSL using the same command, or see the Maestro docs.)

## 3. Run the flows

From the `frontend/` folder, with the app running:

```bash
# Run a single flow
maestro test .maestro/01_home_and_navigation.yaml

# Run every flow in the folder
maestro test .maestro/

# Run only the quick smoke check
maestro test .maestro/ --include-tags smoke
```

Maestro prints each step and a ✅ / ❌ per flow. To watch it drive the browser
visually, add `--headless=false` (headed is usually the default for web).

## 4. Notes & tips

- **Booking flow slot:** `03_book_appointment_guest.yaml` taps the `02:00 PM`
  slot. If that slot is already booked for the first doctor on your machine, the
  button is disabled — just edit the flow and pick another time.
- **AI Doctor flow:** `04_ai_doctor.yaml` passes whether or not you've set an AI
  key. Without a key the app shows a friendly "not switched on yet" banner
  instead of a reply; the flow only asserts the page and composer render.
- **Selectors:** form fields are targeted by stable `id`s (`doctorSearch`,
  `patientName`, `patientPhone`, `reason`, `email`, `password`, `symptomInput`,
  `sendMessage`) so the flows don't depend on wording that might change.
- **Maestro Studio:** run `maestro studio` to interactively inspect the page and
  record new steps.

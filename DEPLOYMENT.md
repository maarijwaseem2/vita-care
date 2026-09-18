# Deploying Vita Care (Neon + Render + Vercel)

This project is now configured for **PostgreSQL**, so it deploys cleanly on:

| Piece     | Service | What it runs                     |
| --------- | ------- | -------------------------------- |
| Database  | Neon    | PostgreSQL                       |
| Backend   | Render  | NestJS API (`/api`)              |
| Frontend  | Vercel  | Next.js 14 app                   |

Do them in this order: **Neon → Render → Vercel**, then connect CORS.

---

## 0. Push the code to GitHub

`node_modules`, `dist`, `.next` and `.env` are gitignored — do **not** commit them.

```bash
cd vita-care
git add -A
git commit -m "Switch to PostgreSQL; prepare for deployment"
git push        # to your GitHub repo
```

Both apps live in one repo, so on Render and Vercel you'll set a **Root Directory**.

---

## 1. Database — Neon

1. Create a project at <https://neon.tech> → it gives you a **connection string** like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-123.eu-central-1.aws.neon.tech/vita_care?sslmode=require
   ```
2. Copy that string — you'll paste it into Render as `DATABASE_URL`.
   (SSL is turned on automatically in the app whenever `DATABASE_URL` is set.)

You do **not** create tables by hand — the migration does that in the next step.

---

## 2. Backend — Render

Create a new **Web Service** from your GitHub repo.

**Settings**

| Field             | Value                                             |
| ----------------- | ------------------------------------------------- |
| Root Directory    | `backend`                                         |
| Runtime           | Node                                              |
| Build Command     | `npm install && npm run build && npm run migration:run` |
| Start Command     | `npm run start:prod`                              |
| Health Check Path | `/api/health`                                     |

> The migration runs during the build. It needs `ts-node` (a devDependency), so
> **don't** use a production-only install — the default `npm install` above is correct.

**Environment variables** (Render → Environment)

```
DATABASE_URL   = <the Neon connection string from step 1>
JWT_SECRET     = <a long random string — e.g. output of: openssl rand -base64 48>
JWT_EXPIRES_IN = 7d
CORS_ORIGIN    = http://localhost:3000        # update after Vercel is live (step 4)
AI_API_KEY     = <your OpenAI key>            # a NEW rotated key, not the old one
AI_BASE_URL    = https://api.openai.com/v1
AI_MODEL       = gpt-4o-mini
NODE_ENV       = production
```

`PORT` is provided by Render automatically — don't set it.

**Seed demo data (once, optional).** After the first successful deploy, open the
Render **Shell** for the service and run:

```bash
npm run seed
```

This loads the demo doctors, a patient and the blog posts. Login password for
every seeded account is `Password123` (e.g. `dr.saif@vitacare.test`).

When it's up, `https://<your-service>.onrender.com/api/health` should return
`{"status":"ok",...}`.

> Render's free tier sleeps when idle, so the first request after a pause is slow.

---

## 3. Frontend — Vercel

Import the same GitHub repo as a new project.

**Settings**

| Field          | Value       |
| -------------- | ----------- |
| Framework      | Next.js (auto-detected) |
| Root Directory | `frontend`  |

**Environment variable** (Vercel → Settings → Environment Variables)

```
NEXT_PUBLIC_API_URL = https://<your-render-service>.onrender.com/api
```

> Note the trailing **`/api`**. This is a `NEXT_PUBLIC_` variable, so it's baked in
> at build time — if you change it later, redeploy the frontend.

Deploy. Vercel gives you a URL like `https://vita-care.vercel.app`.

---

## 4. Connect them (CORS)

Go back to **Render → Environment** and set `CORS_ORIGIN` to your Vercel URL:

```
CORS_ORIGIN = https://vita-care.vercel.app
```

(You can list several, comma-separated, e.g. add a custom domain later.)
Save — Render redeploys. The frontend can now call the API.

---

## 5. Post-deploy checklist

- [ ] `https://<render>/api/health` returns ok
- [ ] `https://<render>/api/doctors` returns the seeded doctors (after seeding)
- [ ] The Vercel site loads and lists doctors
- [ ] Register / login works (token is stored, protected pages load)
- [ ] Booking the same slot twice shows "already booked" (409) — not a 500
- [ ] AI Doctor replies (needs a valid `AI_API_KEY`); without a key it shows the
      friendly "not switched on" message instead of crashing

---

## Security reminders

- **Rotate the OpenAI key.** The key that was in `backend/.env` has been shared
  around — revoke it in the OpenAI dashboard and use a fresh one. Keep it only in
  Render's env vars, never in a committed file.
- **Set a real `JWT_SECRET`** in production (not the placeholder from the example
  file). Anyone who knows the secret can forge login tokens.
- `.env` is gitignored — keep it that way. Put production secrets in the Render/
  Vercel dashboards only.

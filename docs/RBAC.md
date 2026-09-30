# Role-based access control

Every API route is protected in the backend (JWT + `RolesGuard`); the frontend
only mirrors it for a smooth experience. Ownership is checked in the service
layer, so a doctor cannot open another doctor's patient and a patient cannot
change another patient's booking.

## Matrix

✅ allowed · 🔒 own records only · ❌ 403 Forbidden · — not applicable

| Capability | Guest | Patient | Doctor | Nurse | Admin |
| --- | --- | --- | --- | --- | --- |
| Browse doctors, blog, verified nurse list (no phones) | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI Doctor chat, lab-report explainer, voice | ✅ | ✅ (+ own record as context) | ✅ | ✅ | ✅ |
| Read an AI consultation by its token | ✅ guest sessions only | 🔒 | ❌ | ❌ | ❌ |
| Book an appointment | ✅ (guest) | ✅ (linked to account) | — | — | — |
| Receipt by random reference `VC-…` | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own profile and medical history | — | 🔒 | 🔒 profile | 🔒 profile | — |
| Cancel an appointment | — | 🔒 | 🔒 (+ complete, notes) | ❌ | ❌ |
| Clinical view (history, AI summary, home vitals) | ❌ | ❌ | 🔒 treating doctor only, audited | ❌ | ❌ |
| Request a home nurse | ❌ | ✅ | ❌ | ❌ | ❌ |
| Order home nursing | ❌ | ❌ | 🔒 own appointment's patient | ❌ | ❌ |
| See open home visits / accept / record vitals | ❌ | ❌ | ❌ | ✅ verified only, own city & skills | ❌ |
| Patient phone + full address for a visit | ❌ | — | — | 🔒 after accepting | ❌ |
| Nurse phone | ❌ | 🔒 after a nurse accepts | — | — | ❌ |
| Verify doctors / nurses, suspend users | ❌ | ❌ | ❌ | ❌ | ✅ audited |
| AI safety monitor, statistics, audit log | ❌ | ❌ | ❌ | ❌ | ✅ |
| Blog CMS, image upload | ❌ | ❌ | ❌ | ❌ | ✅ |

## Rules that are easy to miss

- **Admin accounts** cannot be created through any public endpoint; they are seeded. The last active admin cannot be suspended, and nobody can suspend themselves.
- **Doctors and nurses** register as `pending`. They cannot be found, booked or given visits until an admin verifies the PMDC / PNC number (PNMC Act §23 forbids employing unregistered nurses). Changing a PMDC number sends the doctor back to `pending`.
- **Suspended users** are rejected at login and on every request with an existing token.
- **Two nurses cannot take the same visit**: accepting is an atomic update.
- **Audit log** records clinical-record views, verifications, suspensions, home-visit actions and blog changes.
- **Frontend redirects**: every role is sent to its own dashboard (`homeFor(role)`), which removed a redirect loop that affected admins.

## Where it is tested

- `backend/test/app.e2e-spec.ts` → "RBAC and home nursing": 13 cross-role 403 checks plus ownership tests.
- Maestro flow `frontend/.maestro/05_rbac_redirects.yaml` for the browser redirects.

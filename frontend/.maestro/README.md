# Maestro web flows

Ten flows, one or more per role (guest, patient, doctor, nurse, admin).
Full table and troubleshooting: [`docs/TESTING.md`](../../docs/TESTING.md#3-ui-endtoend-tests-maestro).

```bash
cd backend && npm run demo:reset
cd ../frontend
maestro test --headless --screen-size 1440x2400 .maestro
```

`subflows/login.yaml` signs out, then signs in as `${EMAIL}` (password `Password123`).
Flows run in the order set in `config.yaml` (06 creates the visit that 07 sees).

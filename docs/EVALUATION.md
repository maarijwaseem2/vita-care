# Triage evaluation

Vita Care is evaluated the way recent triage studies recommend: **under-triage**
(an emergency the system missed — the dangerous error) and **over-triage**
(a routine case flagged as an emergency) are reported separately, by language.

## The set

`backend/evaluation/cases.ts` — 110 short patient messages written for Pakistan:

| Group | Cases | What it checks |
| --- | --- | --- |
| Emergencies | 36 | Chest pain, stroke, breathing, seizure, bleeding, self-harm, anaphylaxis, poisoning, pregnancy bleeding, meningitis signs, spelling variants |
| Traps | 14 | A red-flag word that is **denied** ("chest pain nahi hai") or **in the past** ("5 saal pehle falij hua tha") |
| Routine with department | 60 | Everyday complaints across all 9 departments |

Languages: English (38), Roman Urdu (51), Urdu script (21).

## Results

Safety guard only (`npm run eval`, rules, no model), 30 Sep 2026:

| Run | Emergency recall | Under-triage | Over-triage | Traps handled |
| --- | --- | --- | --- | --- |
| First run | 97.2% (35/36) | 1 | 1 of 74 | 14/14 |
| After adding a Roman Urdu overdose rule | **100% (36/36)** | **0** | 1 of 74 | 14/14 |

- The miss was "neend ki goliyon ka pura patta kha liya" (an overdose in Roman Urdu).
  The AI safety second-opinion already caught it in the full pipeline; the rule was added
  so the guard catches it even offline.
- The one false alarm, "seene mein jalan khane ke baad" (burning in the chest after food),
  is **kept on purpose**: heartburn and cardiac pain can feel alike, and the system is
  designed so a false alarm costs a phone call while a miss can cost a life.

## Full pipeline

With the API running and a real key (`AI_API_KEY` set), start the backend with
`THROTTLE_DISABLED=true` (the eval sends ~200 requests), then:

```bash
npm run eval -- --api http://localhost:4000/api
```

This adds the model and the AI safety second-opinion, and reports department
accuracy. Reports are saved to `backend/evaluation/results/`.
Run it before the demo and quote the real numbers.

## Limits (say these out loud if asked)

- The cases and labels were written by the team, not by clinicians. Before any clinical
  claim, 2–3 practising doctors must review the labels and add cases.
- 100% on a development set means the rules cover these phrasings, not that the system
  never misses. The next step is a held-out set written by people who did not write the rules.

# Airwallex Agentic Banking Hackathon (Railguard)

- Submission draft: [SUBMISSION.md](./SUBMISSION.md)
- Engineering notes: [docs/grants/AIRWALLEX_BUILD.md](../../grants/AIRWALLEX_BUILD.md)
- Kit 11 / Metal Award: [docs/grants/AIRWALLEX_KIT11_METAL.md](../../grants/AIRWALLEX_KIT11_METAL.md)
- One-command judge demo (no keys, no network): `bun scripts/airwallex-judge-demo.ts`
- Live demo: <https://prebroadcast.vercel.app/incidents>

## Status (Oct 24, 2026)

Ready to submit once the acceptance email arrives (Oct 27). The code, live sandbox evidence,
public demo and the 2:47 video cut exist. If the build period brings new Airwallex features or
kit rules, add them on `main` with small commits and re-render the video.

## Only Prasanth can do

1. Open the acceptance email (Oct 27) and sign in to HackerEarth.
2. Re-check the sandbox keys locally (values stay in `.env`): `bun scripts/airwallex-sandbox-smoke.ts`.
3. Upload the video (under 5 min) to YouTube (unlisted) or Drive.
4. Paste the form fields from SUBMISSION.md and submit by **Nov 12, 6:00 PM IST** to be safe.
5. Optional: join demo day remotely on Nov 19.

Env var names used (values never committed): `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`,
`AIRWALLEX_BENEFICIARY_ID`, `AIRWALLEX_WEBHOOK_SECRET`, `RAILGUARD_RELAY_PRIVATE_KEY`,
`GEMINI_API_KEY`, optional `AIRWALLEX_AGENT_MODEL`, `AIRWALLEX_BASE_URL` (sandbox only).

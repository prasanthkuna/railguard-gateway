# PayPal hackathon evidence

Secrets (client id, secret, access tokens, sandbox receiver emails) are never stored here.

| File | What it is |
| --- | --- |
| `paypal-sandbox-latest.json` | Passing live sandbox demo, 10 Nov 2026, 8:06 PM IST (Asia/Calcutta). Scripted agent. See the README live-status table for batch ids. |
| `paypal-sandbox-2026-11-10-pre-link-fix.json` | Earlier US-app live run the same evening. INV-1005 existed at PayPal (`NXL242UZSPJAS`, item `SUCCESS`) but stayed `UNKNOWN` in Railguard until the duplicate-link parser was fixed. |
| `live-blocked-2026-11-10.json` | First probe against the India Default Application: HTTP 403 `PAYOUT_NOT_AVAILABLE`. |
| `simulated-latest.json` | Offline simulator run only. Do not present this as a live sandbox result. |

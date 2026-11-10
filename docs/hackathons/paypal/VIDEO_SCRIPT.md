# Video script: PayPal AI Hackathon (about 2 min 30 s)

Status (10 Nov 2026, 8:06 PM IST): a live `bun run paypal:demo -- --live` run passed. A Remotion cut from that real evidence is at `railguard-paypal-demo.mp4` (1920×1080, exactly 2:30, no audio track; narration is on-screen captions). The live agent was the scripted model, not Gemini — do not say Gemini drove this run.

Rules check: the video must be under 3 minutes, public on YouTube, and show the project working. It must not use
third-party copyrighted music or trademarks without permission. The rules do not forbid an AI voice, so a
text-to-speech narration is fine. Use no music, or royalty-free music you have rights to. Show the PayPal sandbox
only as the real product UI you are using. Use the real batch ids below.

Live batches (item status `SUCCESS` → `CONFIRMED`): INV-1001 `YRUFL6J3GL6P2` (180.00 USD); INV-1002 `3DB7ZVA7EQPPW` (1,450.00 USD, after approval); INV-1005 `YRNQ62VPPNKUU` (95.00 USD, recovered via `duplicate_batch_link`, 1 create + 1 replay). One payout per invoice. 22 tests.

| Time | Screen | Narration |
| --- | --- | --- |
| 0:00–0:15 | Title card: "Railguard for PayPal Payouts" | "AI agents are starting to pay real invoices. The risk is not the happy path. It's the changed payee, the oversized bill, and the timeout where nobody knows if money moved." |
| 0:15–0:35 | Diagram: Agent → Railguard → PayPal Payouts | "Railguard sits between the agent and PayPal. Every payout is checked first, gets one fixed PayPal-Request-Id, and is reconciled with PayPal before anything is called done." |
| 0:35–1:10 | Terminal: step 1 of the 10 Nov 2026 live sandbox run | "The agent reads four invoices. Railguard pays the first: 180 dollars, PayPal batch YRUFL6J3GL6P2. It stops the 1,450 dollar invoice for human approval, refuses an invoice that swapped in a new PayPal email, and refuses a payee nobody verified." |
| 1:10–1:25 | Terminal: step 2 + live batch id | "After approval of those exact terms, the payout goes through. PayPal sandbox batch 3DB7ZVA7EQPPW, confirmed." |
| 1:25–1:55 | Terminal: steps 3 and 4 | "Now PayPal accepts a payout, but the response is lost. Railguard does not guess. The payout is UNKNOWN, the money stays frozen, and the next invoice is refused because frozen money still counts against the budget." |
| 1:55–2:15 | Terminal: step 5 | "The agent tries to retry. Railguard blocks it and follows PayPal's original-batch link for the same sender_batch_id. One payout, batch YRNQ62VPPNKUU, confirmed. One payment, not two." |
| 2:15–2:30 | Summary + 22 tests passing + repo URL | "One payout per invoice, checked at the end of every live run. Twenty-two tests, open source under Apache 2.0. Railguard: let agents pay, safely." |

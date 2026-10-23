# Video script: PayPal AI Hackathon (about 2 min 40 s)

Rules check: the video must be under 3 minutes, public on YouTube, and show the project working. It must not use
third-party copyrighted music or trademarks without permission. The rules do not forbid an AI voice, so a
text-to-speech narration is fine. Use no music, or royalty-free music you have rights to. Show the PayPal sandbox
only as the real product UI you are using.

Record: terminal (large font) + browser on the PayPal sandbox dashboard. Run `bun run paypal:demo -- --live` once before recording so Gemini and the sandbox are warm.

| Time | Screen | Narration |
| --- | --- | --- |
| 0:00–0:15 | Title card: "Railguard for PayPal Payouts" | "AI agents are starting to pay real invoices. The risk is not the happy path. It's the changed payee, the oversized bill, and the timeout where nobody knows if money moved." |
| 0:15–0:35 | Diagram: Agent → Railguard → PayPal Payouts | "Railguard sits between the agent and PayPal. Every payout is checked first, gets one fixed PayPal-Request-Id, and is reconciled with PayPal before anything is called done." |
| 0:35–1:10 | Terminal: step 1 | "The Gemini agent reads four invoices. Railguard pays the first. It stops the 1,450 dollar invoice for human approval, refuses an invoice that swapped in a new PayPal email, and refuses a payee nobody verified." |
| 1:10–1:25 | Terminal: step 2 + PayPal sandbox payout visible | "After approval of those exact terms, the payout goes through. Here it is in the PayPal sandbox." |
| 1:25–1:55 | Terminal: steps 3 and 4 | "Now PayPal accepts a payout, but the response is lost. Railguard does not guess. The payout is UNKNOWN, the money stays frozen, and the next invoice is refused because frozen money still counts against the budget." |
| 1:55–2:20 | Terminal: step 5 | "The agent tries to retry. Railguard blocks it and reconciles with the same PayPal-Request-Id. PayPal returns the original payout, CONFIRMED. One payment, not two." |
| 2:20–2:40 | Summary line + `bun test` passing + repo URL | "One payout per invoice, checked at the end of every run. Twenty-one tests, open source under Apache 2.0. Railguard: let agents pay, safely." |

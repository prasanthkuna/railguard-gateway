# Airwallex Agentic Banking Hackathon — pack

**Portal:** [airwallex.hackerearth.com](https://airwallex.hackerearth.com/)  
**Decision:** **GO — apply by 23 Oct 2026** (build starts **25 Oct** if accepted; submit **13 Nov 2026**)  
**Proof tier:** **Sandbox API only** — no on-chain cost ([PROOF_STRATEGY.md](./PROOF_STRATEGY.md))

## Dates (official HackerEarth)

| Milestone | Date |
|-----------|------|
| Applications close | **23 Oct 2026** |
| Accepted teams notified / build starts | **25 Oct 2026** |
| Project submissions due | **13 Nov 2026** |
| Demo day (optional SF / remote OK) | **19 Nov 2026** |

**Prizes:** $100K pool (cash + credits). **Solo allowed** (up to 4).

## Track

**Starter Kit 03 — Payment Ops Incident Commander**  
Resolve a delayed supplier transfer without paying twice — maps to Railguard **UNKNOWN / reconcile** and incident-style receipts.

## Repo status

| Asset | Status |
|-------|--------|
| `packages/integrations/src/rails/airwallexRail.ts` | **Stub** — throws until `AIRWALLEX_API_KEY` |
| Site card | ROADMAP until sandbox wired |

## Engineering (after acceptance, Oct 25+)

1. Register sandbox: [sandbox.airwallex.com](https://sandbox.airwallex.com) · [airwallexdev.com/guide](https://airwallexdev.com/guide)  
2. Implement `prepare` / `execute` / `observe` / `reconcile` on stub (idempotent payout + status poll).  
3. Demo: agent triggers payout → UNKNOWN window → reconcile → receipt.  
4. Submit: working demo, **<5 min video**, public repo with setup steps.

## Apply now (before Oct 23)

- [ ] HackerEarth application (solo OK)  
- [ ] Pick track **03** in project description  
- [ ] Links: https://github.com/prasanthkuna/railguard-gateway · https://railguard-site.vercel.app  
- [ ] Do **not** block on `airwallexRail` before apply — pitch existing reconcile kernel + post-acceptance sandbox work

## Overlap

Runs parallel to **PayPal** (Nov 12) and **Airwallex submit** (Nov 13) — shared story: fiat rails + agent reconcile; separate code paths.

# Dubai "Create AI Agents" Championship: registration draft (not submitted)

**Rules re-checked Oct 24, 2026** at <http://dubaichamberdigital.com/create-ai-agents>:
- Registration opened Oct 7, 2026 and closes **January 2027 (exact date not stated)**.
  Submissions run Nov 2026 to Jan 2027. The Grand Final is the first week of May 2027 in Dubai
  (travel only if a finalist).
- Four categories. Winners get USD 150,000 per category. Individuals or teams up to 6.
- The agent must be **original, not copied from an existing repository**, and at an early stage.
  So this entry is a **new agent**. Railguard's open-source repo is not submitted as the project.
  Prasanth should confirm in the FAQ, or by email, whether using his own published open-source
  library as a dependency is fine.

**Do not register on the site without Prasanth.** Below is text he can paste.

## Category

Business / enterprise AI agents (pick the closest category name on the form).

## Agent name

**PayOps Guardian**

## One-line description

An AI agent that runs a small business's outgoing payments safely: it checks each payout against
spending rules, never pays the same invoice twice, and stops to ask a human when a result is
unclear.

## Problem

Small and mid-size businesses are starting to let AI agents pay suppliers, refunds and
subscriptions. The costly failures are not exotic: a payment that times out and is sent again, an
invoice paid twice, a supplier whose bank details were quietly changed, or a budget overrun
discovered at month end.

## Solution

PayOps Guardian sits between the AI and the bank or payment provider:
1. **Rules first:** budgets, per-supplier limits, approved payees, and human approval above a
   threshold.
2. **One invoice, one payment:** each payout gets a fixed id, so retries cannot pay twice.
3. **Unsure means stop:** if the bank does not answer, the agent marks it "unknown", checks the
   bank's records, and asks a human, instead of paying again.
4. **Plain-language audit trail:** every decision is explained in one line.

## Stage

Early prototype (concept and design). A new build for the Championship.

## Who it is for

Finance teams at SMEs, marketplaces that pay many sellers, and fintechs adding AI agents.

## Team

Prasanth Kuna, solo, software engineer, India.

## Links

Portfolio: <https://github.com/prasanthkuna> (personal open-source work).

## Only Prasanth can do

1. Register on the site (account, email, any ID checks).
2. Pick the exact category on the form, and confirm the dependency question above.
3. Later: build the prototype inside the submission period and record the demo in his own voice.

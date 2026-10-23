# Agentware: submission draft (fill in during Nov 27-30)

## Title

**Spend Brake: an agent you can walk away from**

## Tagline

It stops before it overspends, stops when it is unsure, and tells you why.

## Story

Unattended agents fail quietly. They retry a payment that already went through, or keep spending
after the budget is gone. Spend Brake is an agent loop with four stop rules checked before every
side effect: budget, unknown outcome, duplicate request, and a kill switch. Every stop leaves a
near-miss record a human can read in 30 seconds.

## How it is built

`<written during the 72-hour window>`

## Challenges

`<written during the window>`

## What's next

`<written during the window>`

## Demo script (3 min)

1. Start the agent on its job and walk away (0:00-0:20).
2. A timeout is injected: the agent halts as UNKNOWN and does not retry. Show the near-miss record
   (0:20-1:00).
3. A duplicate request: halted (1:00-1:30).
4. Budget edge: it stops *before* the payment that would cross it (1:30-2:10).
5. Kill switch flipped: it stops at the next step (2:10-2:40).
6. The near-miss report (2:40-3:00).

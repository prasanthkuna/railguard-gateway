# Concordium Trusted Agents: submission draft

## Title

**Railguard for Concordium: verified payees, guarded agent payouts**

## Tagline

The agent can pay, but only verified payees, only within budget, and only once.

## Story

Agents that pay people need two answers before money moves: *is this payee who they claim to be*,
and *has this payment already happened*? Concordium answers the first with identity credentials at
the protocol level. Railguard answers the second, with request ids, an UNKNOWN state on timeouts,
and on-chain verification before saying CONFIRMED.

## How it is built

`<fill in during Nov 19 - Dec 9: Agent Registry badge, PLT transfer with memo, ID proof gate, verifier, CCDExplorer links>`

## Challenges

`<fill in>`

## Path to production

Railguard is open source. The Concordium rail would ship as a package next to the EVM, Stellar
and Solana rails. A business sets a policy ("payouts above X need a verified business credential")
and gets an audit trail that links every payout to a request id and a finalized transaction.

## What's next

`<fill in>`

## Demo script (3 min or less)

1. A registered agent with its badge (0:00-0:20).
2. A payout to a verified payee: the ID proof is checked, the PLT transfer happens, and the
   CCDExplorer link shows CONFIRMED (0:20-1:10).
3. A payout to an unverified payee above the threshold: DENY (1:10-1:40).
4. Timeout chaos: UNKNOWN, reconcile, one payment (1:40-2:30).
5. Path to production (2:30-3:00).

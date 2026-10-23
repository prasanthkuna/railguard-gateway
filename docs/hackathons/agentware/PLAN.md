# Agentware AI Agent Hackathon: plan only (no code before kickoff)

**Rules re-checked Oct 24, 2026** at <https://agentwarehack.com/>:
- "**All project code must be written during the 72-hour window.** Code committed before kickoff
  disqualifies." Also, "a pre-existing project of yours … is not" allowed. So **nothing is coded
  now**. Not even a stop-rules demo, because that would count as code written before kickoff. Ideas,
  notes and this plan are fine.
- Registration opens **Oct 26** (Discord). Team formation closes **Nov 23**. The brief and rubric
  are published around **Nov 26**.
- Build: **Nov 27 18:00 UTC to Nov 30 18:00 UTC = Nov 27 23:30 IST to Nov 30 23:30 IST.**
- Theme: "Build an agent you can walk away from … prove it knows when to stop." Includes a **Kill
  Switch** prize and **Near Miss** write-ups (due Dec 7, 18:00 UTC = Dec 7, 23:30 IST).
- Prize pool $1,800 (5 awards). Online, free, solo welcome.

## Idea (to confirm against the brief on Nov 26)

**"Walk-away agent with a spend brake"**: an agent that does a long, unattended job (for example,
buying API credits or processing a queue of payouts on a testnet or sandbox) and stops itself
when:

1. a budget is about to be crossed (it stops *before*, not after),
2. an outcome is **unknown** (a timeout means halt and ask, never retry blindly),
3. the same request id shows up twice (a duplicate means halt),
4. a human kill switch file or flag is set (checked before every side effect).

Every stop writes a short "near miss" record: what it was about to do, why it stopped, and what a
human should check. Those records feed the Near Miss write-up.

## What can be reused

Only **ideas** and public open-source libraries. The Railguard repo is a pre-existing project, so
its code is **not** copied into the entry. If the brief allows public libraries, a published
package may be imported. Decide this on Nov 26 after reading the rubric. If unclear, write it all
fresh in the 72 hours (the stop rules are small).

## 72-hour plan

| Hours | Work |
|-------|------|
| 0-6 | Read the brief, new repo, the task the agent does, stop-rule interface |
| 6-24 | Agent loop + 4 stop rules + near-miss log |
| 24-40 | Chaos runs: inject timeout, duplicate, budget edge, kill switch. Record evidence |
| 40-56 | Simple UI or CLI report, README |
| 56-68 | Video, write-up |
| 68-72 | Buffer. Submit by **Nov 30, 10:00 PM IST** |

## Only Prasanth can do

1. Join the Discord from **Oct 26** and register (solo).
2. Read the brief on Nov 26 and confirm the idea fits.
3. Be available Nov 27 23:30 IST to Nov 30 23:30 IST. Record the video. Submit.

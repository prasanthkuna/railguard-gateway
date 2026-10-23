"use client"

import { useState } from "react"

const STORIES = [
  {
    id: "twice",
    tab: "Paying twice",
    without: [
      "The agent sends a 1,000 USDC payout.",
      "The network is slow, so the request times out.",
      "The agent retries. The first payment had gone through.",
    ],
    withoutResult: "Paid 2,000 USDC for one invoice.",
    with: [
      "Every payment gets one id before it leaves.",
      "After a timeout, the state is UNKNOWN, not failed.",
      "Railguard checks the chain, sees it paid, and stops the retry.",
    ],
    withResult: "Paid exactly once.",
  },
  {
    id: "budget",
    tab: "Going over budget",
    without: [
      "Two agents share a 100 USDC budget.",
      "Both read 'balance 100' at the same moment.",
      "Both send 80 USDC.",
    ],
    withoutResult: "160 USDC spent from a 100 USDC budget.",
    with: [
      "Money is reserved before anything is sent.",
      "The first agent locks 80. The second sees only 20 left.",
      "The second payment is refused with a clear reason.",
    ],
    withResult: "Budget held. One payment, one clean refusal.",
  },
  {
    id: "recipient",
    tab: "Wrong recipient",
    without: [
      "The agent was approved to pay Supplier A.",
      "A bad prompt or bug swaps in another wallet.",
      "The wallet signs whatever it is given.",
    ],
    withoutResult: "Money gone to the wrong place.",
    with: [
      "Approval is bound to recipient, asset, amount and network.",
      "Any changed field no longer matches the approval.",
      "Railguard blocks it before the wallet is asked to sign.",
    ],
    withResult: "Blocked before signing.",
  },
] as const

export function WhatItStops() {
  const [active, setActive] = useState<(typeof STORIES)[number]["id"]>("twice")
  const story = STORIES.find((s) => s.id === active) ?? STORIES[0]

  return (
    <div>
      <div className="ui-tabs" role="tablist" aria-label="Failure stories">
        {STORIES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            className="ui-tab"
            aria-selected={s.id === active}
            onClick={() => setActive(s.id)}
          >
            {s.tab}
          </button>
        ))}
      </div>
      <div className="ui-compare" role="tabpanel">
        <div className="ui-card">
          <p className="ui-compare-label ui-bad">Without Railguard</p>
          <ol>
            {story.without.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          <p className="ui-compare-result ui-bad">{story.withoutResult}</p>
        </div>
        <div className="ui-card" style={{ borderColor: "var(--mint-line)" }}>
          <p className="ui-compare-label ui-ok">With Railguard</p>
          <ol>
            {story.with.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          <p className="ui-compare-result ui-ok">{story.withResult}</p>
        </div>
      </div>
    </div>
  )
}

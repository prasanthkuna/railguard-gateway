/** Live-sandbox drill: the next payout create is SENT to PayPal, then its response is dropped. */
import type { FetchLike } from "./client"

export function createDropResponseAfterCreateFetch(base: FetchLike) {
  const log = { createPosts: 0, injectedDrops: 0 }
  let armed = false
  const fetch: FetchLike = async (url, init) => {
    const isCreate =
      new URL(url).pathname === "/v1/payments/payouts" &&
      (init.method ?? "GET").toUpperCase() === "POST"
    if (!isCreate) return base(url, init)
    log.createPosts += 1
    const res = await base(url, init)
    if (armed) {
      armed = false
      log.injectedDrops += 1
      await res.text().catch(() => "")
      const error = new Error(
        "Injected drill: PayPal accepted the payout but the response was lost (timeout).",
      )
      error.name = "TimeoutError"
      throw error
    }
    return res
  }
  return {
    fetch,
    arm: () => {
      armed = true
    },
    log,
  }
}

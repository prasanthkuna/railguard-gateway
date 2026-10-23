/**
 * metal-agent prints `name value` lines. Exit codes are not trusted on their own (on Windows Node can
 * crash in libuv after printing), so outcomes are read from the lines.
 */

export type MetalOutcome = "PAID" | "REFUSED" | "HELD" | "UNKNOWN"

export interface ParsedCli {
  fields: Record<string, string>
  headers: Record<string, string>
  errors: string[]
  lines: string[]
}

export function parseCliOutput(text: string): ParsedCli {
  const fields: Record<string, string> = {}
  const headers: Record<string, string> = {}
  const errors: string[] = []
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
  for (const line of lines) {
    if (line.startsWith("error:")) {
      errors.push(line.slice(6).trim())
      continue
    }
    const sp = line.indexOf(" ")
    if (sp <= 0) continue
    const name = line.slice(0, sp)
    const value = line.slice(sp + 1).trim()
    if (name === "header") {
      const c = value.indexOf(":")
      if (c > 0) headers[value.slice(0, c).trim().toLowerCase()] = value.slice(c + 1).trim()
      continue
    }
    if (!(name in fields)) fields[name] = value
  }
  return { fields, headers, errors, lines }
}

const REFUSAL = /\b(mandate_[a-z_]+|transfer_would_fail|recipient_refuses|nonce_already_used)\b/

export function refusalReason(text: string): string | undefined {
  return REFUSAL.exec(text)?.[1]
}

export interface PullResult {
  outcome: MetalOutcome
  alreadyPaid: boolean
  transaction?: string | undefined
  reason?: string | undefined
  recorded?: boolean | undefined
  spent?: string | undefined
  raw: ParsedCli
}

/** `mandate pull`: paid | refused | held | pending, and "already paid, nothing sent" on a re-run. */
export function classifyPull(text: string): PullResult {
  const raw = parseCliOutput(text)
  const outcomeLine = raw.fields.outcome ?? ""
  const alreadyPaid = /already paid/i.test(text)
  const transaction = raw.fields.transaction
  const spent = raw.fields.spent
  if (alreadyPaid || /^paid\b/.test(outcomeLine)) {
    return { outcome: "PAID", alreadyPaid, transaction, spent, raw }
  }
  if (/^held\b/.test(outcomeLine)) return { outcome: "HELD", alreadyPaid, transaction, spent, raw }
  if (/^refused\b/.test(outcomeLine)) {
    return {
      outcome: "REFUSED",
      alreadyPaid,
      transaction,
      reason: raw.fields.reason ?? refusalReason(text) ?? outcomeLine,
      recorded: !/recorded no/.test(text) && !/not sent/.test(outcomeLine),
      spent,
      raw,
    }
  }
  // "may have been sent", pending, or any error after signing: the pull may land. Never re-send it
  // under another payment id.
  if (
    /^pending\b/.test(outcomeLine) ||
    /may have been sent|can land until|may have paid/i.test(text)
  ) {
    return { outcome: "UNKNOWN", alreadyPaid, transaction, spent, raw }
  }
  if (raw.errors.some((e) => /the pull was not sent/.test(e))) {
    return { outcome: "REFUSED", alreadyPaid, reason: raw.errors.join("; "), recorded: false, raw }
  }
  return { outcome: "UNKNOWN", alreadyPaid, transaction, spent, raw }
}

export interface PayResult {
  outcome: MetalOutcome
  status?: number | undefined
  transaction?: string | undefined
  nonce?: string | undefined
  reason?: string | undefined
  signedOffer?: string | undefined
  body?: string | undefined
  raw: ParsedCli
}

/**
 * `pay` / `pay --mandate`. "payment refused" moved nothing. "payment in doubt", or any error after
 * the nonce line that is not a refusal, may have settled: UNKNOWN, look it up before paying again.
 */
export function classifyPay(text: string): PayResult {
  const raw = parseCliOutput(text)
  const status = raw.fields.status ? Number(raw.fields.status) : undefined
  const base = {
    status,
    transaction: raw.fields.transaction,
    nonce: raw.fields.nonce,
    signedOffer: raw.fields["signed-offer"],
    body: raw.fields.body,
    raw,
  }
  const err = raw.errors.join("; ")
  if (/payment refused/i.test(err)) {
    return { ...base, outcome: "REFUSED", reason: refusalReason(err) ?? err }
  }
  if (base.transaction && status !== undefined && status < 400) return { ...base, outcome: "PAID" }
  if (!base.nonce && raw.errors.length > 0) {
    return { ...base, outcome: "REFUSED", reason: refusalReason(err) ?? err }
  }
  // An HTTP error from the seller after signing, fetch failed, or "in doubt": the payment may have
  // settled. Railguard reconciles it against the facilitator's /settlements before anything else.
  return {
    ...base,
    outcome: "UNKNOWN",
    reason: err || (status ? `seller status ${status}` : undefined),
  }
}

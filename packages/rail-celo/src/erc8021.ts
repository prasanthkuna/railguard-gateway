/**
 * ERC-8021 transaction attribution. The suffix is appended to calldata and is inert on-chain;
 * indexers (and the Celo hackathon leaderboard) read it back from tx.input.
 *   schema 0: codes || codesLength(1) || 0x00 || marker(16)
 *   schema 2: cbor  || cborLength(2)  || 0x02 || marker(16)   (used by the x402 builder-code extension)
 */
import type { Hex } from "viem"

export const ERC8021_MARKER = "80218021802180218021802180218021"
const CODE = /^[a-z0-9_]{1,32}$/

function asciiHex(s: string): string {
  return [...Buffer.from(s, "ascii")].map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function erc8021Schema0Suffix(codes: string | string[]): Hex {
  const list = (Array.isArray(codes) ? codes : [codes]).map((c) => c.trim()).filter(Boolean)
  if (list.length === 0) throw new Error("erc8021: at least one code")
  const joined = list.join(",")
  if (!/^[\x20-\x7e]+$/.test(joined) || joined.length > 255)
    throw new Error("erc8021: codes must be ASCII, <= 255 bytes")
  return `0x${asciiHex(joined)}${joined.length.toString(16).padStart(2, "0")}00${ERC8021_MARKER}`
}

/** Minimal CBOR (major types 3 text and 5 map) for { a?, s? } string fields. */
function cborText(s: string): string {
  const b = Buffer.from(s, "utf8")
  const head =
    b.length < 24 ? (0x60 + b.length).toString(16) : `78${b.length.toString(16).padStart(2, "0")}`
  return head + b.toString("hex")
}

export function erc8021Schema2Suffix(fields: {
  a?: string | undefined
  s?: string | undefined
}): Hex {
  const entries = Object.entries(fields).filter(
    ([, v]) => typeof v === "string" && v.length > 0,
  ) as Array<[string, string]>
  for (const [, v] of entries) if (!CODE.test(v)) throw new Error(`erc8021: bad builder code ${v}`)
  const cbor =
    (0xa0 + entries.length).toString(16) +
    entries.map(([k, v]) => cborText(k) + cborText(v)).join("")
  const len = (cbor.length / 2).toString(16).padStart(4, "0")
  return `0x${cbor}${len}02${ERC8021_MARKER}`
}

export function appendAttribution(data: Hex, suffix: Hex): Hex {
  if (hasAttribution(data)) return data
  return `${data}${suffix.slice(2)}` as Hex
}

export function hasAttribution(data: Hex): boolean {
  return data.toLowerCase().endsWith(ERC8021_MARKER)
}

/** Parse schema-0 codes back out of calldata (what an indexer does). */
export function parseSchema0Codes(data: Hex): string[] | null {
  const hex = data.slice(2).toLowerCase()
  if (!hex.endsWith(ERC8021_MARKER)) return null
  const body = hex.slice(0, -ERC8021_MARKER.length)
  if (body.slice(-2) !== "00") return null
  const len = Number.parseInt(body.slice(-4, -2), 16)
  const codesHex = body.slice(-4 - len * 2, -4)
  return Buffer.from(codesHex, "hex").toString("ascii").split(",")
}

export function isBuilderCode(code: string | undefined): code is string {
  return typeof code === "string" && CODE.test(code)
}

/**
 * Offline Celo stand-in for tests and keyless demos: a USDC ledger with real EIP-3009 semantics
 * (EIP-712 signature check, single-use nonce, validBefore), receipts with real Transfer and
 * AuthorizationUsed logs, and an x402 facilitator (/verify, /settle) on top of it.
 */
import {
  type Address,
  type Hex,
  encodeAbiParameters,
  encodeEventTopics,
  keccak256,
  toHex,
  verifyTypedData,
} from "viem"
import { CELO_SEPOLIA } from "./chain"
import { type CeloChainReader, type ChainReceipt, USDC_EVENTS_ABI } from "./chainReader"
import { typedDataFor } from "./eip3009"
import type { PaymentPayload, PaymentRequirements, SettleResponse } from "./x402"

export interface FacilitatorClient {
  verify(
    payload: PaymentPayload,
    requirements: PaymentRequirements,
  ): Promise<{ isValid: boolean; invalidReason?: string | undefined; payer?: string | undefined }>
  settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettleResponse>
}

export function createSimulatedCelo(options: { now?: () => Date } = {}) {
  const now = options.now ?? (() => new Date())
  const token = CELO_SEPOLIA.usdc.address
  const balances = new Map<string, bigint>()
  const usedNonces = new Map<string, Hex>()
  const receipts = new Map<string, ChainReceipt>()
  let block = 1_000_000n
  let finalizedLag = 0n
  let settles = 0

  const key = (a: string, n: string) => `${a.toLowerCase()}:${n.toLowerCase()}`

  function mine(from: Address, to: Address, value: bigint, nonce: Hex): Hex {
    block += 1n
    const txHash = keccak256(toHex(`sim:${from}:${nonce}:${block}`))
    const transferTopics = encodeEventTopics({
      abi: USDC_EVENTS_ABI,
      eventName: "Transfer",
      args: { from, to },
    }) as Hex[]
    const authTopics = encodeEventTopics({
      abi: USDC_EVENTS_ABI,
      eventName: "AuthorizationUsed",
      args: { authorizer: from, nonce },
    }) as Hex[]
    receipts.set(txHash.toLowerCase(), {
      transactionHash: txHash,
      status: "success",
      blockNumber: block,
      logs: [
        { address: token, topics: authTopics, data: "0x" },
        {
          address: token,
          topics: transferTopics,
          data: encodeAbiParameters([{ type: "uint256" }], [value]),
        },
      ],
    })
    usedNonces.set(key(from, nonce), txHash)
    return txHash
  }

  async function check(payload: PaymentPayload, req: PaymentRequirements) {
    const a = payload.payload.authorization
    if (req.network !== CELO_SEPOLIA.caip2) return { ok: false, reason: "unsupported_network" }
    if (req.asset.toLowerCase() !== token.toLowerCase())
      return { ok: false, reason: "unsupported_asset" }
    if (a.to.toLowerCase() !== req.payTo.toLowerCase())
      return { ok: false, reason: "invalid_exact_evm_payload_recipient_mismatch" }
    if (BigInt(a.value) !== BigInt(req.amount))
      return { ok: false, reason: "invalid_exact_evm_payload_authorization_value" }
    const t = BigInt(Math.floor(now().getTime() / 1000))
    if (BigInt(a.validBefore) <= t)
      return { ok: false, reason: "invalid_exact_evm_payload_authorization_valid_before" }
    if (usedNonces.has(key(a.from, a.nonce))) return { ok: false, reason: "nonce_already_used" }
    const valid = await verifyTypedData({
      address: a.from as Address,
      signature: payload.payload.signature as Hex,
      ...typedDataFor(
        {
          name: CELO_SEPOLIA.usdc.name,
          version: CELO_SEPOLIA.usdc.version,
          chainId: CELO_SEPOLIA.chainId,
          verifyingContract: token,
        },
        a,
      ),
    })
    if (!valid) return { ok: false, reason: "invalid_exact_evm_payload_signature" }
    if ((balances.get(a.from.toLowerCase()) ?? 0n) < BigInt(a.value))
      return { ok: false, reason: "insufficient_funds" }
    return { ok: true, reason: undefined }
  }

  const facilitator: FacilitatorClient = {
    async verify(payload, req) {
      const r = await check(payload, req)
      return { isValid: r.ok, invalidReason: r.reason, payer: payload.payload.authorization.from }
    },
    async settle(payload, req) {
      const a = payload.payload.authorization
      const r = await check(payload, req)
      if (!r.ok)
        return { success: false, errorReason: r.reason, payer: a.from, network: req.network }
      balances.set(
        a.from.toLowerCase(),
        (balances.get(a.from.toLowerCase()) ?? 0n) - BigInt(a.value),
      )
      balances.set(a.to.toLowerCase(), (balances.get(a.to.toLowerCase()) ?? 0n) + BigInt(a.value))
      settles += 1
      const txHash = mine(a.from as Address, a.to as Address, BigInt(a.value), a.nonce as Hex)
      return { success: true, transaction: txHash, network: req.network, payer: a.from }
    },
  }

  const reader: CeloChainReader = {
    chainId: CELO_SEPOLIA.chainId,
    blockNumber: async () => block,
    finalizedBlockNumber: async () => block - finalizedLag,
    receipt: async (h) => receipts.get(h.toLowerCase()) ?? null,
    authorizationUsed: async (_t, from, nonce) => usedNonces.has(key(from, nonce)),
    findAuthorizationTx: async (_t, from, nonce) => usedNonces.get(key(from, nonce)) ?? null,
    balanceOf: async (_t, owner) => balances.get(owner.toLowerCase()) ?? 0n,
  }

  return {
    facilitator,
    reader,
    fund(addr: Address, atomic: bigint) {
      balances.set(addr.toLowerCase(), (balances.get(addr.toLowerCase()) ?? 0n) + atomic)
    },
    setFinalizedLag(n: bigint) {
      finalizedLag = n
    },
    settlements: () => settles,
    receipts: () => [...receipts.values()],
  }
}

/** HTTP facilitator client for the hosted Celo facilitator (X-API-Key on /settle). */
export function createHttpFacilitator(options: {
  url?: string | undefined
  apiKey?: string | undefined
  fetch?: ((url: string, init: RequestInit) => Promise<Response>) | undefined
  timeoutMs?: number | undefined
}): FacilitatorClient {
  const url = (options.url ?? CELO_SEPOLIA.facilitatorUrl).replace(/\/+$/, "")
  if (/api\.x402\.celo\.org/.test(url))
    throw new Error("celo: refusing the mainnet facilitator (testnet only)")
  const doFetch = options.fetch ?? ((u, i) => fetch(u, i))
  async function post(path: string, body: unknown) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000)
    try {
      const res = await doFetch(`${url}${path}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey ? { "X-API-Key": options.apiKey } : {}),
        },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      return { status: res.status, json }
    } finally {
      clearTimeout(timer)
    }
  }
  return {
    async verify(payload, requirements) {
      const r = await post("/verify", {
        x402Version: 2,
        paymentPayload: payload,
        paymentRequirements: requirements,
      })
      return {
        isValid: r.json.isValid === true,
        invalidReason: r.json.invalidReason as string | undefined,
        payer: r.json.payer as string | undefined,
      }
    },
    async settle(payload, requirements) {
      const r = await post("/settle", {
        x402Version: 2,
        paymentPayload: payload,
        paymentRequirements: requirements,
      })
      if (r.status === 401)
        return { success: false, errorReason: "facilitator_unauthorized (set X402_API_KEY)" }
      return r.json as unknown as SettleResponse
    },
  }
}

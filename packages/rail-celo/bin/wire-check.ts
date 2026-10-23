#!/usr/bin/env bun
/**
 * Keyless proof that Railguard's x402 payload is what the live Celo Sepolia facilitator expects:
 * a throwaway key signs a real EIP-3009 authorization; /verify must answer `insufficient_funds`
 * (signature and format accepted), and the same payload with a broken signature must be refused.
 * Nothing is settled and no funds exist. `--save` writes docs/hackathons/celo/evidence/facilitator-wire-check.json.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
  CELO_SEPOLIA,
  createHttpFacilitator,
  railguardNonce,
  signTransferAuthorization,
} from "../src/index"
import type { PaymentPayload, PaymentRequirements } from "../src/x402"

const acct = privateKeyToAccount(generatePrivateKey())
const t = Math.floor(Date.now() / 1000)
const req: PaymentRequirements = {
  scheme: "exact",
  network: CELO_SEPOLIA.caip2,
  amount: "10000",
  asset: CELO_SEPOLIA.usdc.address,
  payTo: "0x000000000000000000000000000000000000dEaD",
  maxTimeoutSeconds: 120,
  extra: { name: CELO_SEPOLIA.usdc.name, version: CELO_SEPOLIA.usdc.version },
}
const authorization = {
  from: acct.address,
  to: req.payTo,
  value: req.amount,
  validAfter: String(t - 60),
  validBefore: String(t + 120),
  nonce: railguardNonce(`wire-check-${t}`),
}
const signature = await signTransferAuthorization(
  acct,
  {
    name: CELO_SEPOLIA.usdc.name,
    version: CELO_SEPOLIA.usdc.version,
    chainId: CELO_SEPOLIA.chainId,
    verifyingContract: CELO_SEPOLIA.usdc.address,
  },
  authorization,
)
const payload: PaymentPayload = {
  x402Version: 2,
  resource: { url: "http://127.0.0.1/wire-check" },
  accepted: req,
  payload: { signature, authorization },
}
const facilitator = createHttpFacilitator({})
const good = await facilitator.verify(payload, req)
const broken = await facilitator.verify(
  { ...payload, payload: { ...payload.payload, signature: `${signature.slice(0, -4)}0000` } },
  req,
)
const supported = await fetch(`${CELO_SEPOLIA.facilitatorUrl}/supported`)
  .then((r) => r.json())
  .catch(() => null)
const pass =
  good.invalidReason === "insufficient_funds" &&
  broken.invalidReason === "invalid_exact_evm_payload_signature"
const result = {
  checkedAt: new Date().toISOString(),
  facilitator: CELO_SEPOLIA.facilitatorUrl,
  network: CELO_SEPOLIA.caip2,
  throwawayPayer: acct.address,
  validSignature: good,
  brokenSignature: broken,
  supported,
  pass,
}
console.log(JSON.stringify(result, null, 2))
if (process.argv.includes("--save")) {
  const dir = join(import.meta.dir, "..", "..", "..", "docs", "hackathons", "celo", "evidence")
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, "facilitator-wire-check.json"), `${JSON.stringify(result, null, 2)}\n`)
}
if (!pass) process.exit(1)

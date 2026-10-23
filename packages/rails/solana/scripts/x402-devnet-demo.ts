/**
 * Local x402-style demo on Solana DEVNET: a seller on localhost answers 402 with a quote, the
 * buyer agent pays through the Railguard rail, the seller verifies the payment on chain and serves
 * the resource. Same env as devnet-pay.ts; SOLANA_DEVNET_RECIPIENT is the seller's wallet.
 */
import { randomUUID } from "node:crypto"
import { USDC_DECIMALS } from "../src/constants"
import { toAtomic } from "../src/guard"
import { DEFAULT_DEVNET_POLICY, createSolanaRail } from "../src/rail"
import { assertDevnet } from "../src/rpc"
import {
  type X402Challenge,
  createSolanaX402Seller,
  encodePaymentHeader,
  quoteRequirements,
} from "../src/x402"
import { devnetRpc, env, explorerTx, fileLedger, loadSigner, sleep, writeEvidence } from "./common"

const rpc = devnetRpc()
await assertDevnet(rpc)
const signer = loadSigner()
const sellerWallet = env("SOLANA_DEVNET_RECIPIENT")
const price = toAtomic(env("RAILGUARD_SOLANA_AMOUNT", "0.01"), USDC_DECIMALS)
const seller = createSolanaX402Seller({ rpc })

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname !== "/v1/fx-report") return new Response("not found", { status: 404 })
    const header = req.headers.get("x-payment")
    if (!header) {
      const q = seller.quote(
        quoteRequirements({
          resource: url.pathname,
          payTo: sellerWallet,
          amountAtomic: price,
          nonce: randomUUID(),
          description: "USD/EUR FX report",
        }),
      )
      const body: X402Challenge = { x402Version: 1, error: "payment required", accepts: [q] }
      return Response.json(body, { status: 402 })
    }
    const s = await seller.settle(header)
    if (!s.ok) return Response.json({ error: s.reason }, { status: 402 })
    return Response.json({ pair: "USD/EUR", rate: "0.92", source: "demo" })
  },
})
const endpoint = `http://localhost:${server.port}/v1/fx-report`

const first = await fetch(endpoint)
const challenge = (await first.json()) as X402Challenge
const q = challenge.accepts[0]
if (first.status !== 402 || !q) throw new Error("expected a 402 quote")
console.log(`402 quote: ${q.maxAmountRequired} atomic USDC to ${q.payTo.slice(0, 8)}… nonce ${q.extra.nonce.slice(0, 8)}`)

const { ledger, save } = fileLedger()
const rail = createSolanaRail({ rpc, signer, policy: DEFAULT_DEVNET_POLICY([sellerWallet]), ledger })
const intent = {
  id: `x402:${q.extra.nonce}`,
  agentId: "railguard-x402-buyer",
  senderOwner: signer.publicKey,
  recipientOwner: q.payTo,
  mint: q.asset,
  amount: BigInt(q.maxAmountRequired),
  purpose: q.description,
}
const paid = await rail.pay(intent)
save()
if (paid.decision?.decision === "DENY") {
  console.log(`guard denied: ${paid.decision.code}`)
  process.exit(2)
}
let resource: Response | undefined
for (let i = 0; i < 20; i++) {
  await sleep(2000)
  const attempt = await rail.reconcile(paid.attempt.requestId)
  save()
  if (!attempt.signature) continue
  resource = await fetch(endpoint, { headers: { "x-payment": encodePaymentHeader(attempt.signature, q.extra.nonce) } })
  if (resource.status === 200) break
}
const data = resource ? await resource.json() : undefined
console.log(`resource: ${resource?.status}`, data)
const replay = paid.attempt.signature
  ? await fetch(endpoint, { headers: { "x-payment": encodePaymentHeader(paid.attempt.signature, q.extra.nonce) } })
  : undefined
console.log(`replay of the same payment: ${replay?.status}`)
server.stop()
const sig = paid.attempt.signature
const file = writeEvidence(`x402-${q.extra.nonce.slice(0, 8)}`, {
  kind: "railguard-solana-x402-devnet",
  quote: q,
  signature: sig,
  explorer: sig ? explorerTx(sig) : undefined,
  resourceStatus: resource?.status,
  replayStatus: replay?.status,
  events: paid.attempt.events,
})
console.log(`evidence: ${file}`)

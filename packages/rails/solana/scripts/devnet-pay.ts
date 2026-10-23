/**
 * Guarded SPL USDC payment on Solana DEVNET, end to end:
 *   policy check -> memo = request id -> reconcile-first -> sign + send -> UNKNOWN on doubt
 *   -> reconcile by signature/memo -> CONFIRMED only when finalized and balance deltas match.
 *
 * Env (names only, values never printed):
 *   SOLANA_DEVNET_KEYPAIR_PATH   Solana CLI keypair JSON, outside the repo (required)
 *   SOLANA_DEVNET_RECIPIENT      payee wallet (owner) address with a devnet USDC token account (required)
 *   SOLANA_DEVNET_RPC_URL        optional, default https://api.devnet.solana.com (devnet enforced by genesis hash)
 *   RAILGUARD_SOLANA_AMOUNT      optional, default 0.01 (USDC)
 *   RAILGUARD_SOLANA_INTENT_ID   optional, default devnet-proof-<UTC date>
 *   RAILGUARD_SOLANA_CHAOS       optional "timeout": drop the send response to show UNKNOWN -> reconcile
 *   RAILGUARD_SOLANA_APPROVE     optional "1": human approval for amounts above the 0.50 threshold
 */
import { DEVNET_USDC_MINT, USDC_DECIMALS } from "../src/constants"
import { termsHash, toAtomic } from "../src/guard"
import { DEFAULT_DEVNET_POLICY, createSolanaRail } from "../src/rail"
import { SolanaRpcError, assertDevnet } from "../src/rpc"
import { devnetRpc, env, explorerTx, fileLedger, loadSigner, sleep, writeEvidence } from "./common"

const base = devnetRpc()
await assertDevnet(base)
const signer = loadSigner()
const recipient = env("SOLANA_DEVNET_RECIPIENT")
const amount = toAtomic(env("RAILGUARD_SOLANA_AMOUNT", "0.01"), USDC_DECIMALS)
const intentId = env("RAILGUARD_SOLANA_INTENT_ID", `devnet-proof-${new Date().toISOString().slice(0, 10)}`)
const chaos = env("RAILGUARD_SOLANA_CHAOS", "") === "timeout"

let dropped = 0
const rpc = {
  async call<T>(method: string, params: unknown[]): Promise<T> {
    const result = await base.call<T>(method, params)
    if (chaos && method === "sendTransaction" && dropped === 0) {
      dropped += 1
      throw new SolanaRpcError("chaos: response dropped after broadcast", true)
    }
    return result
  },
}

const intent = {
  id: intentId,
  agentId: "railguard-devnet-agent",
  senderOwner: signer.publicKey,
  recipientOwner: recipient,
  mint: DEVNET_USDC_MINT,
  amount,
  purpose: "Railguard Solana devnet proof",
}
const approved = env("RAILGUARD_SOLANA_APPROVE", "") === "1" ? new Set([termsHash(intent)]) : undefined
const { ledger, save } = fileLedger()
const rail = createSolanaRail({
  rpc,
  signer,
  policy: DEFAULT_DEVNET_POLICY([recipient]),
  ledger,
  approvedTermsHashes: approved,
})

const first = await rail.pay(intent)
save()
console.log(`pay -> ${first.attempt.state}${first.attempt.reason ? ` (${first.attempt.reason})` : ""}`)
if (first.decision?.decision === "DENY") {
  console.log(`denied: ${first.decision.code}; next: ${first.decision.next}`)
  process.exit(2)
}
if (chaos) {
  const retry = await rail.pay(intent) // the agent "pays again" after the timeout
  console.log(`retry after timeout -> ${retry.attempt.state} (sends so far: ${retry.attempt.sends})`)
}

let attempt = first.attempt
for (let i = 0; i < 40 && !["CONFIRMED", "FAILED_SAFE", "RECONCILIATION_REQUIRED"].includes(attempt.state); i++) {
  await sleep(3000)
  attempt = await rail.reconcile(attempt.requestId)
  save()
}
console.log(`final -> ${attempt.state}; sends: ${attempt.sends}`)
if (attempt.signature) console.log(explorerTx(attempt.signature))

const file = writeEvidence(`${intentId}${chaos ? "-chaos" : ""}`, {
  kind: "railguard-solana-devnet-payment",
  cluster: "devnet",
  mint: DEVNET_USDC_MINT,
  sender: signer.publicKey,
  recipient,
  amountAtomic: amount,
  requestId: attempt.requestId,
  memo: attempt.requestId,
  signature: attempt.signature,
  explorer: attempt.signature ? explorerTx(attempt.signature) : undefined,
  state: attempt.state,
  sends: attempt.sends,
  chaos,
  policyVersion: "solana-devnet-v1",
  events: attempt.events,
})
console.log(`evidence: ${file}`)
process.exit(attempt.state === "CONFIRMED" ? 0 : 1)

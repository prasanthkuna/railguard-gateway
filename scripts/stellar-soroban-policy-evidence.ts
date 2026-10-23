#!/usr/bin/env bun
/**
 * Re-verify the Railguard Soroban policy proof on Stellar testnet (read-only, no keys).
 *
 *   bun run stellar-soroban-policy-evidence
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  proofExpectation,
  STELLAR_POLICY_PROOF as P,
  STELLAR_TESTNET_USDC,
  verifyStellarSorobanPolicyExecution,
} from "../packages/settlement/src/stellar-soroban-policy.ts"

const outDir = join(process.cwd(), "evidence", "stellar-soroban-policy")
mkdirSync(outDir, { recursive: true })

const result = await verifyStellarSorobanPolicyExecution(P.executeTx, proofExpectation())

const manifest = {
  generatedAt: new Date().toISOString(),
  network: "stellar-testnet",
  contract: {
    id: P.contractId,
    source: "contracts/soroban/railguard-policy",
    wasm_sha256: "c9cd982be9ad9b8a5eed42cd1decbe42800a0fc79f1932cde77af04bf5ab8db5",
    deploy_tx: P.deployTx,
    admin: P.admin,
  },
  asset: {
    code: STELLAR_TESTNET_USDC.code,
    issuer: STELLAR_TESTNET_USDC.issuer,
    sac: STELLAR_TESTNET_USDC.sac,
    note: "Circle testnet USDC",
  },
  intent: {
    agent: P.agent,
    recipient: P.recipient,
    amount: P.amount,
    amount_stroops: P.amountStroops.toString(),
    nonce: P.nonce.toString(),
    request_id: result.requestId,
    budget_limit_stroops: P.budgetStroops.toString(),
  },
  transactions: {
    set_budget: P.setBudgetTx,
    grant: P.grantTx,
    execute: P.executeTx,
  },
  status: result.status,
  reason: result.reason,
  transfer: result.transfer,
  rejections_recorded_2026_10_23: [
    { call: "grant (same intent again)", error: "DuplicateRequest (#4)" },
    { call: "execute (other recipient)", error: "IntentMismatch (#6)" },
    { call: "execute (amount + 1 stroop)", error: "IntentMismatch (#6)" },
    { call: "execute (replay after success)", error: "AlreadyExecuted (#7)" },
    { call: "grant 4 USDC (1.25 spent of 5 budget)", error: "BudgetExceeded (#3)" },
  ],
}

writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Stellar Soroban policy execute: ${result.status} (request ${result.requestId.slice(0, 12)}...)`)
process.exit(result.status === "CONFIRMED" ? 0 : 1)

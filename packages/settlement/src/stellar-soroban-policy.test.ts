import { describe, expect, test } from "bun:test"
import {
  type HorizonInvokeOperation,
  STELLAR_POLICY_PROOF,
  checkSorobanPolicyExecution,
  decodeStrKey,
  proofExpectation,
  stellarPolicyRequestId,
  stroopsToAmount,
  verifyStellarSorobanPolicyExecution,
} from "./stellar-soroban-policy"
import fixture from "./stellar-soroban-policy.fixture.json"

const op = fixture as HorizonInvokeOperation
const exp = proofExpectation()
const RUN_LIVE = process.env.TESTNET_INTEGRATION === "1"

describe("Stellar Soroban policy verifier", () => {
  test("request id matches the id the deployed contract returned", () => {
    const id = stellarPolicyRequestId({
      agent: exp.agent,
      recipient: exp.recipient,
      asset: exp.asset.sac,
      amountStroops: exp.amountStroops,
      nonce: exp.nonce,
    })
    expect(id).toBe(STELLAR_POLICY_PROOF.requestId)
  })

  test("request id changes when any bound field changes", () => {
    const base = {
      agent: exp.agent,
      recipient: exp.recipient,
      asset: exp.asset.sac,
      amountStroops: 1n,
      nonce: 1n,
    }
    const a = stellarPolicyRequestId(base)
    expect(stellarPolicyRequestId({ ...base, amountStroops: 2n })).not.toBe(a)
    expect(stellarPolicyRequestId({ ...base, nonce: 2n })).not.toBe(a)
    expect(stellarPolicyRequestId({ ...base, recipient: exp.agent })).not.toBe(a)
  })

  test("strkey decode rejects a bad checksum", () => {
    expect(decodeStrKey(exp.agent).kind).toBe("account")
    expect(decodeStrKey(exp.contractId).kind).toBe("contract")
    const bad = `${exp.agent.slice(0, -1)}${exp.agent.endsWith("A") ? "B" : "A"}`
    expect(() => decodeStrKey(bad)).toThrow()
  })

  test("stroops format like Horizon amounts", () => {
    expect(stroopsToAmount(12_500_000n)).toBe("1.2500000")
    expect(stroopsToAmount(1n)).toBe("0.0000001")
  })

  test("recorded execute tx is CONFIRMED for the bound intent", () => {
    const r = checkSorobanPolicyExecution(true, op, exp)
    expect(r.status).toBe("CONFIRMED")
    expect(r.transfer?.amount).toBe("1.2500000")
  })

  test("different amount is not CONFIRMED (request id no longer matches)", () => {
    const r = checkSorobanPolicyExecution(true, op, { ...exp, amountStroops: 12_500_001n })
    expect(r.status).toBe("RECONCILIATION_REQUIRED")
    expect(r.reason).toBe("request_id_mismatch")
  })

  test("different recipient or nonce is not CONFIRMED", () => {
    expect(checkSorobanPolicyExecution(true, op, { ...exp, recipient: exp.agent }).status).toBe(
      "RECONCILIATION_REQUIRED",
    )
    expect(checkSorobanPolicyExecution(true, op, { ...exp, nonce: 2n }).reason).toBe(
      "request_id_mismatch",
    )
  })

  test("wrong contract is not CONFIRMED", () => {
    const r = checkSorobanPolicyExecution(true, op, { ...exp, contractId: exp.asset.sac })
    expect(r.reason).toBe("contract_mismatch")
  })

  test("asset mismatch in the transfer is caught", () => {
    const tampered = structuredClone(op)
    const change = tampered.asset_balance_changes?.[0]
    if (!change) throw new Error("fixture")
    change.asset_issuer = exp.agent
    expect(checkSorobanPolicyExecution(true, tampered, exp).reason).toBe("asset_mismatch")
  })

  test("transfer amount mismatch is caught even when params match", () => {
    const tampered = structuredClone(op)
    const change = tampered.asset_balance_changes?.[0]
    if (!change) throw new Error("fixture")
    change.amount = "1.2400000"
    expect(checkSorobanPolicyExecution(true, tampered, exp).reason).toBe("amount_mismatch")
  })

  test("missing transfer or failed tx is never CONFIRMED", () => {
    const noTransfer = { ...op, asset_balance_changes: [] }
    expect(checkSorobanPolicyExecution(true, noTransfer, exp).reason).toBe(
      "transfer_count_mismatch",
    )
    expect(checkSorobanPolicyExecution(false, op, exp).status).toBe("FAILED")
    expect(checkSorobanPolicyExecution(true, undefined, exp).status).toBe("RECONCILIATION_REQUIRED")
  })

  test("verify uses Horizon tx + operations (stubbed fetch)", async () => {
    const stub = (async (url: string | URL | Request) => {
      const u = String(url)
      const body = u.includes("/operations")
        ? { _embedded: { records: [op] } }
        : { successful: true }
      return new Response(JSON.stringify(body), { status: 200 })
    }) as typeof fetch
    const r = await verifyStellarSorobanPolicyExecution(
      STELLAR_POLICY_PROOF.executeTx,
      exp,
      "https://h",
      stub,
    )
    expect(r.status).toBe("CONFIRMED")
  })

  test.skipIf(!RUN_LIVE)("live: execute tx CONFIRMED on Horizon testnet", async () => {
    const r = await verifyStellarSorobanPolicyExecution(STELLAR_POLICY_PROOF.executeTx, exp)
    expect(r.status).toBe("CONFIRMED")
  })
})

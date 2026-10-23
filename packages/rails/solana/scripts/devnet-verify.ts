/**
 * Read-only: verify any devnet SPL payment by signature.
 *   bun run scripts/devnet-verify.ts <signature> <recipientOwner> <amount USDC> [memo]
 */
import { DEVNET_USDC_MINT, USDC_DECIMALS } from "../src/constants"
import { toAtomic } from "../src/guard"
import { assertDevnet } from "../src/rpc"
import { verifySolanaSplPayment } from "../src/verifier"
import { devnetRpc } from "./common"

const [signature, recipientOwner, amount, memo] = process.argv.slice(2)
if (!signature || !recipientOwner || !amount) {
  console.error("usage: devnet-verify.ts <signature> <recipientOwner> <amountUsdc> [memo]")
  process.exit(64)
}
const rpc = devnetRpc()
await assertDevnet(rpc)
const r = await verifySolanaSplPayment({
  rpc,
  signature,
  expected: {
    mint: process.env.SOLANA_DEVNET_MINT?.trim() || DEVNET_USDC_MINT,
    recipientOwner,
    amount: toAtomic(amount, USDC_DECIMALS),
    memo,
  },
})
console.log(JSON.stringify(r, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2))
process.exit(r.status === "CONFIRMED" ? 0 : 1)

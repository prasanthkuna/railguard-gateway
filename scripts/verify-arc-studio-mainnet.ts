#!/usr/bin/env bun
/**
 * Verify the Arc Studio microgrant mainnet proof and write a reproducible evidence bundle.
 *
 * Required:
 *   ARC_STUDIO_PROJECT_URL
 *   ARC_STUDIO_APP_URL
 *   ARC_STUDIO_CONTRACT_ADDRESS
 *   ARC_STUDIO_TX_HASH
 *
 * Optional hard assertions:
 *   ARC_STUDIO_EXPECTED_RECIPIENT
 *   ARC_STUDIO_EXPECTED_AMOUNT_WEI
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  decodeEventLog,
  getAddress,
  parseAbi,
  type Address,
  type Hash,
} from "viem"
import { createPublicClientForEvmChain } from "../packages/settlement/src/evm-chain.ts"
import { getEvmChain } from "../packages/settlement/src/chains.ts"

const required = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const projectUrl = required("ARC_STUDIO_PROJECT_URL")
const appUrl = required("ARC_STUDIO_APP_URL")
const contractAddress = getAddress(required("ARC_STUDIO_CONTRACT_ADDRESS")) as Address
const txHash = required("ARC_STUDIO_TX_HASH") as Hash
const expectedRecipientRaw = process.env.ARC_STUDIO_EXPECTED_RECIPIENT?.trim()
const expectedAmountRaw = process.env.ARC_STUDIO_EXPECTED_AMOUNT_WEI?.trim()

const expectedRecipient = expectedRecipientRaw
  ? (getAddress(expectedRecipientRaw) as Address)
  : undefined
const expectedAmount = expectedAmountRaw ? BigInt(expectedAmountRaw) : undefined

const arc = getEvmChain("arc")
const client = await createPublicClientForEvmChain("arc")

const [receipt, tx, code, latestBlock] = await Promise.all([
  client.getTransactionReceipt({ hash: txHash }),
  client.getTransaction({ hash: txHash }),
  client.getCode({ address: contractAddress }),
  client.getBlockNumber(),
])

if (receipt.status !== "success") {
  throw new Error(`Arc transaction did not succeed: ${receipt.status}`)
}
if (!code || code === "0x") {
  throw new Error(`No contract bytecode at ${contractAddress}`)
}
if (!tx.to || getAddress(tx.to) !== contractAddress) {
  throw new Error(
    `Transaction target ${tx.to ?? "<contract creation>"} does not match ${contractAddress}`,
  )
}
if (tx.value <= 0n) {
  throw new Error("Proof transaction moved zero native Arc USDC")
}

const eventAbi = parseAbi([
  "event PaymentExecuted(bytes32 indexed paymentId,address indexed agent,address indexed recipient,uint256 amount,uint256 totalSpent)",
])

const decodedEvents = receipt.logs
  .filter((log) => getAddress(log.address) === contractAddress)
  .flatMap((log) => {
    try {
      const decoded = decodeEventLog({
        abi: eventAbi,
        data: log.data,
        topics: log.topics,
      })
      return decoded.eventName === "PaymentExecuted" ? [decoded] : []
    } catch {
      return []
    }
  })

if (decodedEvents.length !== 1) {
  throw new Error(
    `Expected exactly one PaymentExecuted event from ${contractAddress}; found ${decodedEvents.length}`,
  )
}

const event = decodedEvents[0]
const args = event.args as {
  paymentId: `0x${string}`
  agent: Address
  recipient: Address
  amount: bigint
  totalSpent: bigint
}

if (args.amount !== tx.value) {
  throw new Error(
    `Event amount ${args.amount} does not match transaction value ${tx.value}`,
  )
}
if (expectedRecipient && getAddress(args.recipient) !== expectedRecipient) {
  throw new Error(
    `Recipient ${args.recipient} does not match expected ${expectedRecipient}`,
  )
}
if (expectedAmount !== undefined && args.amount !== expectedAmount) {
  throw new Error(
    `Amount ${args.amount} does not match expected ${expectedAmount}`,
  )
}

const confirmations = latestBlock >= receipt.blockNumber
  ? latestBlock - receipt.blockNumber + 1n
  : 0n

const manifest = {
  generatedAt: new Date().toISOString(),
  grant: "Arc Microgrants: Built with Arc Studio",
  project: "Railguard Spend Gate",
  arcStudioProjectUrl: projectUrl,
  appUrl,
  network: arc.name,
  chainId: arc.chainId,
  rpc: arc.rpcUrls[0],
  contractAddress,
  contractCodePresent: true,
  txHash,
  explorerUrl: arc.explorerTxUrl(txHash),
  blockNumber: receipt.blockNumber.toString(),
  confirmations: confirmations.toString(),
  transaction: {
    from: tx.from,
    to: tx.to,
    nativeUsdcValue: tx.value.toString(),
    status: receipt.status,
  },
  paymentExecuted: {
    paymentId: args.paymentId,
    agent: args.agent,
    recipient: args.recipient,
    amount: args.amount.toString(),
    totalSpent: args.totalSpent.toString(),
  },
  checks: {
    transactionSucceeded: true,
    contractCodePresent: true,
    transactionTargetsContract: true,
    nonZeroNativeUsdcMoved: true,
    paymentExecutedEventFound: true,
    eventAmountMatchesTransactionValue: true,
    expectedRecipientMatched: expectedRecipient ? true : null,
    expectedAmountMatched: expectedAmount !== undefined ? true : null,
  },
  ok: true,
}

const evidenceDir = join(process.cwd(), "evidence", "arc-studio")
mkdirSync(evidenceDir, { recursive: true })

const serialized = JSON.stringify(
  manifest,
  (_key, value) => (typeof value === "bigint" ? value.toString() : value),
  2,
)

writeFileSync(join(evidenceDir, "manifest.json"), `${serialized}\n`)
writeFileSync(
  join(evidenceDir, "README.md"),
  `# Arc Studio — mainnet payment evidence

| Field | Value |
| --- | --- |
| Project | Railguard Spend Gate |
| Network | Arc Mainnet |
| Chain ID | ${manifest.chainId} |
| Contract | \`${manifest.contractAddress}\` |
| Tx | \`${manifest.txHash}\` |
| Native USDC moved | ${manifest.transaction.nativeUsdcValue} base units |
| Recipient | \`${manifest.paymentExecuted.recipient}\` |
| Settlement | CONFIRMED |
| Explorer | ${manifest.explorerUrl} |
| Arc Studio project | ${manifest.arcStudioProjectUrl} |
| Live app | ${manifest.appUrl} |

## Reproduce

\`\`\`bash
ARC_STUDIO_PROJECT_URL="${manifest.arcStudioProjectUrl}" \\\
ARC_STUDIO_APP_URL="${manifest.appUrl}" \\\
ARC_STUDIO_CONTRACT_ADDRESS="${manifest.contractAddress}" \\\
ARC_STUDIO_TX_HASH="${manifest.txHash}" \\\
bun run verify-arc-studio-mainnet
\`\`\`
`,
)

console.log(serialized)

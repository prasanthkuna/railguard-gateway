#!/usr/bin/env bun
/** Arc mainnet gas estimate for USDC ERC-20 transfer (read-only, no spend). */
import { createPublicClient, encodeFunctionData, formatUnits, http, parseAbi } from "viem"
import { defineChain } from "viem"
import { ARC_MAINNET_RPC, ARC_MAINNET_USDC } from "../packages/settlement/src/arc-mainnet.ts"

const from =
  process.env.ARC_MAINNET_SENDER?.trim() ??
  "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d"
const to =
  process.env.ARC_MAINNET_RECIPIENT?.trim() ??
  "0x8c7e2543aa8bf69dc8458dc28104234f6a334233"
const amount = BigInt(process.env.ARC_MAINNET_AMOUNT?.trim() ?? "10000")

const arc = defineChain({
  id: 5042,
  name: "Arc Mainnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_MAINNET_RPC_URL ?? ARC_MAINNET_RPC] } },
})

const client = createPublicClient({
  chain: arc,
  transport: http(process.env.ARC_MAINNET_RPC_URL ?? ARC_MAINNET_RPC),
})

const fees = await client.estimateFeesPerGas()
const gasPrice = await client.getGasPrice()
const nativeBal = await client.getBalance({ address: from as `0x${string}` })
const abi = parseAbi(["function balanceOf(address) view returns (uint256)"])
const erc20Bal = await client.readContract({
  address: ARC_MAINNET_USDC as `0x${string}`,
  abi,
  functionName: "balanceOf",
  args: [from as `0x${string}`],
})

const data = encodeFunctionData({
  abi: parseAbi(["function transfer(address,uint256)"]),
  functionName: "transfer",
  args: [to as `0x${string}`, amount],
})

let gasUnits = 65_000n
let gasEstimateOk = true
try {
  gasUnits = await client.estimateGas({
    account: from as `0x${string}`,
    to: ARC_MAINNET_USDC as `0x${string}`,
    data,
  })
} catch (e) {
  gasEstimateOk = false
}

const maxFee = fees.maxFeePerGas ?? gasPrice
const costWei = gasUnits * maxFee
const minNative = costWei * 2n + 10n ** 15n // 2× gas + 0.001 USDC buffer @ 18 dec

console.log(
  JSON.stringify(
    {
      chainId: 5042,
      sender: from,
      nativeUsdc18: nativeBal.toString(),
      nativeUsdcHuman: formatUnits(nativeBal, 18),
      erc20Usdc6: erc20Bal.toString(),
      erc20UsdcHuman: formatUnits(erc20Bal, 6),
      gas: {
        minBaseFeeGweiNote: "Arc mempool floor ~20 gwei per Circle docs",
        maxFeePerGasWei: maxFee.toString(),
        maxFeePerGasGwei: (Number(maxFee) / 1e9).toFixed(4),
        estimatedGasUnits: gasUnits.toString(),
        gasEstimateOk,
        estimatedTxCostNative18: costWei.toString(),
        estimatedTxCostUsd: formatUnits(costWei, 18),
      },
      proof: {
        erc20Amount: amount.toString(),
        erc20Human: "0.01 USDC @ 6 decimals",
        recoverableTo: to,
      },
      minBridgeRecommendationUsd: Math.max(
        5,
        Number(formatUnits(costWei, 18)) + 0.01 + 0.5,
      ),
      ready: nativeBal >= minNative && erc20Bal >= amount,
    },
    null,
    2,
  ),
)

process.exit(0)

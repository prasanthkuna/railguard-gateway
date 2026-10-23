/**
 * Self-facilitation on Celo Sepolia (x402 allows a resource server to settle its own payments).
 * The seller submits USDC.transferWithAuthorization itself, paying testnet gas, and appends the
 * ERC-8021 attribution suffix to the calldata so every settlement carries the builder code.
 */
import {
  http,
  type Hex,
  type LocalAccount,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  parseAbi,
  parseSignature,
} from "viem"
import { celoSepolia } from "viem/chains"
import { CELO_SEPOLIA, assertCeloTestnet, assertCeloTestnetRpc } from "./chain"
import { appendAttribution, erc8021Schema0Suffix } from "./erc8021"
import type { FacilitatorClient } from "./simulator"

const USDC_3009_ABI = parseAbi([
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
  "function authorizationState(address authorizer, bytes32 nonce) view returns (bool)",
  "function balanceOf(address) view returns (uint256)",
])

export function createSelfFacilitator(options: {
  account: LocalAccount
  rpcUrl?: string | undefined
  attributionCode?: string | undefined
}): FacilitatorClient {
  const transport = http(options.rpcUrl ?? CELO_SEPOLIA.rpcUrl, { timeout: 30_000 })
  const pub = createPublicClient({ chain: celoSepolia, transport })
  const wallet = createWalletClient({ account: options.account, chain: celoSepolia, transport })

  function calldata(p: Parameters<FacilitatorClient["verify"]>[0]): Hex {
    const a = p.payload.authorization
    const sig = parseSignature(p.payload.signature as Hex)
    const v = Number(sig.v ?? BigInt(27 + (sig.yParity ?? 0)))
    const data = encodeFunctionData({
      abi: USDC_3009_ABI,
      functionName: "transferWithAuthorization",
      args: [
        a.from as Hex,
        a.to as Hex,
        BigInt(a.value),
        BigInt(a.validAfter),
        BigInt(a.validBefore),
        a.nonce as Hex,
        v,
        sig.r,
        sig.s,
      ],
    })
    return options.attributionCode
      ? appendAttribution(data, erc8021Schema0Suffix(options.attributionCode))
      : data
  }

  return {
    async verify(payload, req) {
      try {
        assertCeloTestnet(req.network)
        assertCeloTestnetRpc(await pub.getChainId())
        const a = payload.payload.authorization
        if (a.to.toLowerCase() !== req.payTo.toLowerCase() || a.value !== req.amount)
          return { isValid: false, invalidReason: "requirements_mismatch" }
        const used = await pub.readContract({
          address: CELO_SEPOLIA.usdc.address,
          abi: USDC_3009_ABI,
          functionName: "authorizationState",
          args: [a.from as Hex, a.nonce as Hex],
        })
        if (used) return { isValid: false, invalidReason: "nonce_already_used" }
        const bal = await pub.readContract({
          address: CELO_SEPOLIA.usdc.address,
          abi: USDC_3009_ABI,
          functionName: "balanceOf",
          args: [a.from as Hex],
        })
        if (bal < BigInt(a.value))
          return { isValid: false, invalidReason: "insufficient_funds", payer: a.from }
        await pub.call({
          account: options.account.address,
          to: CELO_SEPOLIA.usdc.address,
          data: calldata(payload),
        })
        return { isValid: true, payer: a.from }
      } catch (error) {
        return {
          isValid: false,
          invalidReason: `simulation_failed: ${(error as Error).message.slice(0, 120)}`,
        }
      }
    },
    async settle(payload, req) {
      assertCeloTestnet(req.network)
      const hash = await wallet.sendTransaction({
        to: CELO_SEPOLIA.usdc.address,
        data: calldata(payload),
      })
      const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 90_000 })
      if (receipt.status !== "success")
        return {
          success: false,
          errorReason: "transaction_reverted",
          transaction: hash,
          network: req.network,
        }
      return {
        success: true,
        transaction: hash,
        network: req.network,
        payer: payload.payload.authorization.from,
      }
    },
  }
}

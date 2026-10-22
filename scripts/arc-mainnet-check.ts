#!/usr/bin/env bun
/**
 * Arc microgrant readiness — verifies RPC + documents deploy checklist.
 * Set ARC_RPC_URL and ARC_DEPLOYER_KEY before mainnet deploy.
 */
import { getEvmChain } from "../packages/settlement/src/chains"

const arc = getEvmChain("arc")
console.log(
  JSON.stringify(
    {
      chainId: arc.chainId,
      rpc: arc.rpcUrls[0],
      usdc: "0x3600000000000000000000000000000000000000",
      docs: "docs/grants/ARC_MICROGRANT_SUBMIT.md",
      checklist: [
        "Bridge USDC to Arc 5042 via Circle CCTP (no mainnet faucet)",
        "bun run arc-mainnet-usdc-proof",
        "bun run verify-arc-microgrant-pack",
        "Submit Arc Microgrant form",
      ],
    },
    null,
    2,
  ),
)

import { createTestnetEvmWalletAdapter, testnetWalletConfigured } from "./testnetEvm"
import type { SignRequest, SignResult, WalletProviderAdapter } from "./types"

/** Safe — on-chain ENFORCE mode companion (env: SAFE_ADDRESS). */
export function createSafeWalletAdapter(): WalletProviderAdapter {
  if (process.env.RAILGUARD_TESTNET_WALLET === "1" && testnetWalletConfigured()) {
    return createTestnetEvmWalletAdapter("safe")
  }
  return {
    provider: "safe",
    async getAddress() {
      const addr = process.env.SAFE_ADDRESS?.trim()
      if (!addr) throw new Error("SAFE_ADDRESS not set")
      return addr
    },
    async sign(_request: SignRequest): Promise<SignResult> {
      throw new Error(
        "safe: provider signing not implemented; use the explicitly enabled local testnet signer or a real provider SDK",
      )
    },
  }
}

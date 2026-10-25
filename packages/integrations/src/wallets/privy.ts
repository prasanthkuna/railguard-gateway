import { createTestnetEvmWalletAdapter, testnetWalletConfigured } from "./testnetEvm"
import type { SignRequest, SignResult, WalletProviderAdapter } from "./types"

/** Privy — agent wallets; execution assurance stays in Railguard (env: PRIVY_APP_ID). */
export function createPrivyWalletAdapter(): WalletProviderAdapter {
  if (process.env.RAILGUARD_TESTNET_WALLET === "1" && testnetWalletConfigured()) {
    return createTestnetEvmWalletAdapter("privy")
  }
  return {
    provider: "privy",
    async getAddress() {
      const addr = process.env.PRIVY_WALLET_ADDRESS?.trim()
      if (!addr) throw new Error("PRIVY_WALLET_ADDRESS not set")
      return addr
    },
    async sign(_request: SignRequest): Promise<SignResult> {
      throw new Error(
        "privy: provider signing not implemented; use the explicitly enabled local testnet signer or a real provider SDK",
      )
    },
  }
}

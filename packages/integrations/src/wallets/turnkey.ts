import { createTestnetEvmWalletAdapter, testnetWalletConfigured } from "./testnetEvm"
import type { SignRequest, SignResult, WalletProviderAdapter } from "./types"

export function createTurnkeyWalletAdapter(): WalletProviderAdapter {
  if (process.env.RAILGUARD_TESTNET_WALLET === "1" && testnetWalletConfigured()) {
    return createTestnetEvmWalletAdapter("turnkey")
  }
  return {
    provider: "turnkey",
    async getAddress() {
      const addr = process.env.TURNKEY_WALLET_ADDRESS?.trim()
      if (!addr) throw new Error("TURNKEY_WALLET_ADDRESS not set")
      return addr
    },
    async sign(_request: SignRequest): Promise<SignResult> {
      throw new Error(
        "turnkey: provider signing not implemented; use the explicitly enabled local testnet signer or a real provider SDK",
      )
    },
  }
}

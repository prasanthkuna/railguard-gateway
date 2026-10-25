import type { SignRequest, SignResult, WalletProviderAdapter } from "./types"

/** Testnet-only local EVM signer (env: TESTNET_WALLET_PRIVATE_KEY). */
export function createTestnetEvmWalletAdapter(provider: string): WalletProviderAdapter {
  return {
    provider,
    async getAddress() {
      const key = process.env.TESTNET_WALLET_PRIVATE_KEY?.trim()
      if (!key) throw new Error("TESTNET_WALLET_PRIVATE_KEY not set")
      const { privateKeyToAccount } = await import("viem/accounts")
      return privateKeyToAccount(key as `0x${string}`).address
    },
    async sign(request: SignRequest): Promise<SignResult> {
      const key = process.env.TESTNET_WALLET_PRIVATE_KEY?.trim()
      if (!key) throw new Error("TESTNET_WALLET_PRIVATE_KEY not set")
      const { privateKeyToAccount } = await import("viem/accounts")
      const account = privateKeyToAccount(key as `0x${string}`)
      const signature = await account.signMessage({
        message: { raw: request.digest as `0x${string}` },
      })
      return { signature, signerId: `${provider}-testnet` }
    },
  }
}

export function testnetWalletConfigured(): boolean {
  return Boolean(process.env.TESTNET_WALLET_PRIVATE_KEY?.trim())
}

/** Legacy helper kept only to fail closed; synthetic signatures must never escape. */
export function testnetSignDigest(_provider: string, _digest: string): SignResult {
  throw new Error("Synthetic provider signatures are disabled; connect a real signer")
}

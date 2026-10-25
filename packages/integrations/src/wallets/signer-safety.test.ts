import { describe, expect, test } from "bun:test"
import { createPrivyWalletAdapter } from "./privy"
import { createSafeWalletAdapter } from "./safe"
import { testnetSignDigest } from "./testnetEvm"
import { createTurnkeyWalletAdapter } from "./turnkey"
import { createZeroDevWalletAdapter } from "./zerodev"

const providers = [
  { name: "privy", env: "PRIVY_APP_ID", factory: createPrivyWalletAdapter },
  { name: "turnkey", env: "TURNKEY_API_PUBLIC_KEY", factory: createTurnkeyWalletAdapter },
  { name: "safe", env: "SAFE_TX_SERVICE_URL", factory: createSafeWalletAdapter },
  { name: "zerodev", env: "ZERODEV_PROJECT_ID", factory: createZeroDevWalletAdapter },
]

describe("provider signing is fail-closed until integrated", () => {
  for (const provider of providers) {
    test(`${provider.name} never produces a synthetic signature even with credentials`, async () => {
      const priorFlag = process.env.RAILGUARD_TESTNET_WALLET
      const priorProvider = process.env[provider.env]
      try {
        process.env.RAILGUARD_TESTNET_WALLET = "0"
        process.env[provider.env] = "configured-test-only"
        await expect(
          provider.factory().sign({ digest: `0x${"00".repeat(32)}`, chainId: 84532 }),
        ).rejects.toThrow("provider signing not implemented")
      } finally {
        if (priorFlag === undefined) process.env.RAILGUARD_TESTNET_WALLET = undefined
        else process.env.RAILGUARD_TESTNET_WALLET = priorFlag
        if (priorProvider === undefined) process.env[provider.env] = undefined
        else process.env[provider.env] = priorProvider
      }
    })
  }

  test("legacy synthetic helper cannot sign", () => {
    expect(() => testnetSignDigest("privy", "0xdeadbeef")).toThrow(
      "Synthetic provider signatures are disabled",
    )
  })
})

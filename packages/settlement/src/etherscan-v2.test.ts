import { describe, expect, it } from "bun:test"
import { discoverTokenTransferTxHash } from "./etherscan-v2"

describe("etherscan v2 discovery", () => {
  it("picks matching from/to/token row", async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => ({
          status: "1",
          message: "OK",
          result: [
            {
              hash: "0xabc",
              from: "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d",
              to: "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233",
              contractAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
              value: "10000",
            },
          ],
        }),
      }) as Response

    const hash = await discoverTokenTransferTxHash({
      chainId: 42161,
      tokenAddress: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      fromAddress: "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d",
      toAddress: "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233",
      apiKey: "test-key",
    })

    globalThis.fetch = originalFetch
    expect(hash).toBe("0xabc")
  })
})

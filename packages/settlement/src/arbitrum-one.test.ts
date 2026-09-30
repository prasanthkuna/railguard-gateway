import { describe, expect, it } from "bun:test"
import { ARBITRUM_ONE_CHAIN_ID, ARBITRUM_ONE_USDT } from "./arbitrum-one"
import { ERC20_TRANSFER_TOPIC, parseErc20TransferLogs, verifyTransferFacts } from "./index"

const SENDER = "0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d"
const RECIPIENT = "0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233"

describe("arbitrum one settlement facts", () => {
  it("verifies USDT transfer on chain 42161 (0.01 USDT = 10000 units)", () => {
    const from = SENDER.toLowerCase().replace("0x", "").padStart(64, "0")
    const to = RECIPIENT.toLowerCase().replace("0x", "").padStart(64, "0")
    const amount = 10_000n.toString(16).padStart(64, "0")
    const transfers = parseErc20TransferLogs([
      {
        address: ARBITRUM_ONE_USDT,
        topics: [ERC20_TRANSFER_TOPIC, `0x${from}`, `0x${to}`],
        data: `0x${amount}`,
      },
    ])
    const result = verifyTransferFacts({
      receiptStatus: "success",
      confirmations: 12,
      requiredConfirmations: 1,
      observedChainId: ARBITRUM_ONE_CHAIN_ID,
      transfers,
      expected: {
        chainId: ARBITRUM_ONE_CHAIN_ID,
        tokenAddress: ARBITRUM_ONE_USDT,
        sender: SENDER,
        recipient: RECIPIENT,
        amount: 10_000n,
      },
    })
    expect(result.status).toBe("CONFIRMED")
  })
})

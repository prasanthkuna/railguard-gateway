# Video script: Celo Agents on Open Rails (about 2 min)

AI voice is fine; use no copyrighted music. Record the terminal running `bun run celo:demo -- --testnet --volume 5`, then open two tx links on celo-sepolia.blockscout.com.

| Time | Screen | Narration |
| --- | --- | --- |
| 0:00–0:15 | Title: "Railguard for Celo x402 (testnet)" | "Agents that pay per request make mistakes at machine speed. Railguard checks every x402 payment on Celo before the agent signs." |
| 0:15–0:45 | Step 1 + explorer tx | "The agent buys an FX quote. Railguard checks the 402, signs USDC on Celo Sepolia, and confirms the Transfer and the nonce on-chain. Then a response gets lost. The payment is UNKNOWN and the money stays frozen." |
| 0:45–1:15 | Steps 2–4 | "Too expensive: refused. A cheaper mirror whose wallet is not the seller's ERC-8004 identity: refused. A feed asking for mainnet: refused. This build is testnet only." |
| 1:15–1:40 | Step 5 | "The agent retries. Railguard blocks it and reconciles by the EIP-3009 nonce. USDC used it once. One payment, not two." |
| 1:40–2:00 | Volume summary + identity.json + repo | "Every payment has an explorer link, every registration carries our ERC-8021 tag, and the testnet volume is our proof. Open source, Apache 2.0." |

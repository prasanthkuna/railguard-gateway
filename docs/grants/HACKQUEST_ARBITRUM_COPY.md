# HackQuest - Arbitrum Open House Singapore (submitted archive)\n\n**Status:** Submitted on 2026-10-04. This file preserves the evidence/copy package used for the submission.

## Project name

Railguard

## One-liner

Open-source financial execution firewall for AI agents.

## Description (short)

Railguard adds a financial-control boundary between AI agents and wallets. It applies policy before signing, binds authorization to recipient, asset, amount, and network, tracks uncertain broadcasts, verifies settlement, and emits a tamper-evident evidence envelope. On Arbitrum Sepolia, we deployed the Railguard execution-hook contracts and completed a separate 0.01 USDC external-wallet flow from intent and authorization through on-chain verification and `SETTLED` evidence. The public Failure Lab demonstrates six payment-failure classes, while the repository provides tests, contract addresses, transaction proof, and reproduction commands. Railguard is currently a v0.1 alpha/testnet reference implementation.

## Links

| Field | URL |
| --- | --- |
| Website | https://railguard-site.vercel.app/ |
| Demo / Failure Lab | https://railguard-site.vercel.app/attack |
| Public Arbitrum proof | https://railguard-site.vercel.app/proof/arbitrum-sepolia |
| Arbitrum integration | https://railguard-site.vercel.app/ecosystems/arbitrum |
| GitHub | https://github.com/prasanthkuna/railguard-gateway |
| Testnet console | https://prebroadcast.vercel.app/ (auth required) |
| Sepolia tx | https://sepolia.arbiscan.io/tx/0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d |
| Hook contract | https://sepolia.arbiscan.io/address/0x756829c3ab0eB02b22fe4D7C9E35252A9738965E |
| Evidence | https://github.com/prasanthkuna/railguard-gateway/tree/main/evidence/arbitrum-sepolia |
| Video | https://youtu.be/L-Gss08bzR0 |

## Track / tags

DeFi, AI agents, infrastructure, security

## Team

Prashanth Kuna — solo / founder

## Wallet (registration)

`0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d` (builder contact)

## On-chain proof (submission)

**Hook deployment:** `0x756829c3ab0eB02b22fe4D7C9E35252A9738965E` on Arbitrum Sepolia (421614).

**Wallet settlement:** tx `0x243ec1e8eb6a992a85a035af11edd5ff70d78e3b84e7eb6c78ab5badc409608d` · 0.01 USDC · execution `exec_b73824e9-726f-4d59-af49-ac5cd1e1c9aa` · public proof page above.

**Proof caption:** Arbitrum Sepolia · 0.01 USDC · matching token, recipient, amount, and chain verified · execution SETTLED · explorer and evidence links in project description.

## CTA order (video description)

1. Watch 84-second demo  
2. Open public Arbitrum proof  
3. Inspect Sepolia transaction  
4. Inspect hook contracts and source  
5. Run the Failure Lab  
6. Clone the repository  

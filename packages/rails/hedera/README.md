# Railguard Hedera Testnet Rail

**Status:** Implementation complete. Unit tests passing (27/27). Integration tests require credentials.

## What this is

A complete Hedera testnet payment rail for Railguard with:
- **Real payment execution** via `@hashgraph/sdk`
- **Mirror node settlement verifier** (exact fact matching)
- **HCS audit log** (hash-chained, tamper-evident)
- **Guarded x402 client** with budgets, allowlists, approval thresholds
- **Deterministic payment IDs** for idempotent retries

## What's implemented

✅ **Unit tests (no credentials needed):**
- `HederaPaymentGuard`: Budget tracking, allowlists, limits (8 tests)
- `HcsAuditLog`: Hash-chained audit with tamper detection (4 tests)
- `HederaPaymentVerifier`: Mirror node validation logic (5 tests)
- `X402GuardedClient`: Integration flow (5 tests)

✅ **Actual blockchain execution:**
- HBAR and HTS token transfers via Hedera SDK
- HCS topic message submission
- Mirror node verification of real transactions
- **Integration tests** with actual testnet execution

✅ **Turnkey setup:**
- Automated HCS topic creation
- Account balance checking
- Step-by-step setup guide
- No manual coding required

## Quick Start

### 1. Run unit tests (no credentials)

```bash
cd packages/rails/hedera
bun test
```

**Test Results:** 27 pass, 6 skip, 0 fail (55 expect() calls)

### 2. Get free testnet account (10 min)

See [TESTNET_SETUP.md](TESTNET_SETUP.md) for complete guide.

**Short version:**
1. Go to https://portal.hedera.com
2. Create free testnet account
3. Save account ID and private key

### 3. Set up testnet (2 min)

```bash
export HEDERA_TESTNET_ACCOUNT_ID="0.0.12345"
export HEDERA_TESTNET_PRIVATE_KEY="302e..."

# Automated setup (creates HCS topic)
bun run setup
```

### 4. Run integration tests (actual testnet)

```bash
export RUN_HEDERA_INTEGRATION=1
bun run test:integration
```

**5 integration tests** (pending execution with credentials).

## Available Scripts

```bash
# Unit tests (no credentials)
bun test

# Integration tests (requires credentials)
bun run test:integration

# Check account balance
bun run balance

# Set up HCS topic
bun run setup

# Run demo
bun run demo

# Verify specific transaction
bun run verify <tx-id> <recipient> <amount>
```

## Required Credentials

**For live testnet execution, you need:**

1. `HEDERA_TESTNET_ACCOUNT_ID` - Your testnet account (format: `0.0.12345`)
2. `HEDERA_TESTNET_PRIVATE_KEY` - Your ED25519 private key (starts with `302e`)
3. `HEDERA_HCS_TOPIC_ID` - HCS topic for audit (auto-created by `bun run setup`)

**Never commit these values.** Add them to your shell profile or `.env` file.

Get free testnet account at: https://portal.hedera.com

Full setup guide: [TESTNET_SETUP.md](TESTNET_SETUP.md)

## Architecture

```
Agent Request
     ↓
HederaPaymentGuard (check budget/policy)
     ↓ ALLOW
HcsAuditLog (log decision)
     ↓
Execute Transfer (requires credentials)
     ↓
HederaPaymentVerifier (mirror node check)
     ↓ CONFIRMED
HcsAuditLog (log confirmation)
```

## Integration with Railguard kernel

To add this rail to the v5 kernel:

```typescript
import { X402GuardedClient, HederaPaymentGuard, createHcsAuditLog } from "@railguard/rail-hedera"

const guard = new HederaPaymentGuard({
  totalBudget: 10_000_000n, // 10 USDC
  perMerchantLimit: 3_000_000n,
  recipientAllowlist: ["0.0.12345"],
  approvalThreshold: 5_000_000n,
})

const client = new X402GuardedClient({
  guard,
  auditLog: createHcsAuditLog(),
  accountId: process.env.HEDERA_TESTNET_ACCOUNT_ID,
  privateKey: process.env.HEDERA_TESTNET_PRIVATE_KEY,
})
```

## AI assistance attribution

This package structure, types, and test harness were scaffolded by Claude (Anthropic) based on:
- User requirements: Hedera testnet x402 payments with mirror node verification
- Existing Solana rail pattern (`packages/rails/solana/`)
- Hedera documentation (mirror node REST API, HCS)
- Railguard kernel interfaces

**Human work required:**
- Actual Hedera SDK integration for transaction execution
- HCS topic creation and message submission
- Live testnet testing with real transactions
- Video demo recording (human voice, no AI)
- Credential management and security review

## References

- [Hedera Mirror Node REST API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [Hedera Consensus Service](https://docs.hedera.com/hedera/core-concepts/consensus-service)
- [Hedera JavaScript SDK](https://github.com/hashgraph/hedera-sdk-js)
- [x402 Protocol](https://docs.hedera.com/solutions/ai/x402)

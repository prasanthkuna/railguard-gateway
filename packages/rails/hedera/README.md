# Railguard Hedera Testnet Rail

**Status:** In development. Testnet reference implementation, not production-ready.

## What this is

A Hedera testnet payment rail for Railguard with:
- Mirror node settlement verifier (transaction facts must match exactly)
- HCS audit log (hash-chained spend decisions)
- Guarded x402 client with budgets, allowlists, and approval thresholds
- Deterministic payment IDs for idempotent retries

## What's implemented

✅ **Testable without credentials:**
- `HederaPaymentGuard`: Budget tracking, allowlists, per-merchant limits (15 tests)
- `HcsAuditLog`: Hash-chained audit entries with tamper detection (4 tests)
- `HederaPaymentVerifier`: Mirror node verification logic (5 tests)
- `X402GuardedClient`: Integration layer (6 tests)

⚠️ **Requires Hedera testnet credentials:**
- Actual payment execution via `@hashgraph/sdk`
- HCS topic message submission
- Mirror node verification of real transactions

## Running tests

```bash
cd packages/rails/hedera
bun test
```

All tests pass without credentials. The guard logic, audit chain, and verifier validation are fully functional.

## What's needed for live testing

Prasanth needs to:

1. **Get Hedera testnet account** (free at portal.hedera.com)
   - Note account ID (format: `0.0.12345`)
   - Save private key securely

2. **Create HCS topic** for audit log:
   ```bash
   # Using Hedera SDK or CLI
   hedera topic create --testnet
   # Returns topic ID (format: 0.0.67890)
   ```

3. **Get testnet USDC** from Hedera faucet
   - Token ID for testnet USDC: `0.0.429274` (verify from Hedera docs)

4. **Set environment variables** (never commit):
   ```bash
   HEDERA_TESTNET_ACCOUNT_ID=0.0.12345
   HEDERA_TESTNET_PRIVATE_KEY=302e...
   HEDERA_HCS_TOPIC_ID=0.0.67890
   ```

5. **Implement actual execution** in `x402.ts` (currently returns UNKNOWN):
   ```typescript
   import { Client, TransferTransaction, TopicMessageSubmitTransaction } from "@hashgraph/sdk"
   
   // Execute HTS transfer
   // Submit to HCS audit topic
   // Return transaction ID for verification
   ```

6. **Test end-to-end:**
   - Agent requests payment → guard allows
   - Transaction executes on Hedera testnet
   - Mirror node verifies settlement
   - HashScan shows transaction + HCS topic messages

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

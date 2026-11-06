# Railguard Hedera Testnet Rail

Hedera payment rail with policy enforcement, mirror node verification, and HCS audit logging.

**⚠️ Official x402 integration incomplete** - see `OFFICIAL_X402_TODO.md`

## Features

### ✅ Policy Enforcement
- **Total budget** limits across all payments
- **Per-merchant limits** per recipient account
- **Recipient allowlist** - only approved accounts
- **Approval thresholds** - human approval for large payments
- **Idempotent retries** - same request ID = same decision

### ✅ Settlement Verification
- **Mirror node verification** via Hedera REST API
- **Transaction status** checking (SUCCESS, PENDING, FAILED)
- **Amount validation** (exact match required)
- **Recipient validation** (payTo must match)
- **Sender validation** (optional payer verification)
- **Memo validation** (optional memo matching)

### ✅ HCS Audit Logging
- **Hash-chained entries** via Hedera Consensus Service
- **Tamper-evident log** of all payment decisions
- **Chain integrity verification** (prevHash validation)
- **Audit trail** with timestamps and reasons

## Installation

```bash
npm install @railguard/rail-hedera
```

## Quick Start

### Policy Guard

```typescript
import { HederaPaymentGuard } from "@railguard/rail-hedera"

const guard = new HederaPaymentGuard({
  totalBudget: 100_000_000n, // 1 HBAR
  perMerchantLimit: 50_000_000n, // 0.5 HBAR per recipient
  recipientAllowlist: ["0.0.12345", "0.0.67890"],
  approvalThreshold: 20_000_000n, // 0.2 HBAR requires approval
})

const decision = guard.checkPayment({
  requestId: "req_123",
  recipient: "0.0.12345",
  amount: 10_000_000n,
  asset: "HBAR",
})

if (decision.decision === "ALLOW") {
  // Execute payment
}
```

### Mirror Node Verification

```typescript
import { HederaPaymentVerifier } from "@railguard/rail-hedera"

const verifier = new HederaPaymentVerifier({
  mirrorNode: { baseUrl: "https://testnet.mirrornode.hedera.com" }
})

const result = await verifier.verifyPayment("0.0.1111@1234567890.123", {
  tokenId: "HBAR",
  recipient: "0.0.12345",
  amount: 10_000_000n,
  memo: "payment_id"
})

console.log(result.status) // "CONFIRMED" | "NOT_FOUND" | "FAILED"
```

## Official x402 Integration

**Status:** Packages installed but **not integrated**

See `OFFICIAL_X402_TODO.md` for required implementation work.

**Installed:**
- `@x402/core@2.30.0`
- `@x402/hedera@2.30.0`
- `@hiero-ledger/sdk@2.90.1`

**Needed:**
- x402HTTPClient integration
- HTTPFacilitatorClient setup
- ExactHederaScheme in HTTP flow
- Real facilitator communication

## Payment Requirements Format

```json
{
  "scheme": "exact",
  "network": "hedera:testnet",
  "amount": "10000000",
  "asset": "0.0.0",
  "payTo": "0.0.12345",
  "maxTimeoutSeconds": 120,
  "extra": {
    "feePayer": "0.0.9185802"
  }
}
```

## Testing

### Unit Tests
```bash
bun test
```

**45 unit tests** including:
- Policy enforcement (budgets, limits, allowlists)
- Amount precision (tinybar/bigint)
- HCS audit chain verification
- HTTP 402 flow
- Official x402 integration
- Facilitator capabilities

### Integration Tests

Requires testnet credentials:
```bash
export RUN_HEDERA_INTEGRATION=1
export HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
export HEDERA_TESTNET_PRIVATE_KEY=302e...
export HEDERA_HCS_TOPIC_ID=0.0.xxxxx
bun test src/integration.test.ts
```

## Architecture

### Payment Flow

1. **Policy Check** - Guard checks budgets/limits/allowlist BEFORE signing
2. **Partially Sign** - Client creates and signs TransferTransaction
3. **Facilitator Verify** - Facilitator validates transaction structure
4. **Facilitator Settle** - Facilitator adds signature, pays fee, submits
5. **Mirror Node Verify** - Verify settlement via Hedera mirror node REST API
6. **HCS Audit** - Record decision to tamper-evident audit log

### Policy Guard

```
1. Duplicate check (same requestId)
2. Recipient allowlist check
3. Total budget check (hard limit)
4. Per-merchant limit check (hard limit)
5. Approval threshold check (soft limit - requires approval)
6. Reserve budget and proceed
```

## Examples

### HBAR Payment
```typescript
const result = await client.fetch(url, {
  requestId: "req_hbar_1",
  recipient: "0.0.12345",
  amount: 10_000_000n, // 0.1 HBAR = 10,000,000 tinybars
  asset: "HBAR",
})
```

### HTS Token Payment (USDC)
```typescript
const result = await client.fetch(url, {
  requestId: "req_usdc_1",
  recipient: "0.0.12345",
  amount: 1_000_000n, // 1 USDC = 1,000,000 (6 decimals)
  asset: "0.0.429274", // Testnet USDC token ID
})
```

### Approval Flow
```typescript
// First request - exceeds threshold
const result1 = await client.fetch(url, intent)
if (result1.status === "APPROVAL_REQUIRED") {
  // Human approves via dashboard/UI
  await approvalService.approve(result1.paymentId)
  
  // Retry with approval
  const result2 = await client.approveAndFetch(url, intent)
  // result2.status === "CONFIRMED"
}
```

## Token Association

HTS tokens require account association before first use:

```typescript
import { AccountId, Client, PrivateKey, TokenAssociateTransaction, TokenId } from "@x402/hedera"

const client = Client.forTestnet().setOperator(
  AccountId.fromString(accountId),
  PrivateKey.fromStringECDSA(privateKey)
)

await new TokenAssociateTransaction()
  .setAccountId(AccountId.fromString(accountId))
  .setTokenIds([TokenId.fromString("0.0.429274")]) // testnet USDC
  .execute(client)
  .then(response => response.getReceipt(client))

client.close()
```

## Testnet Setup

1. **Create Account**: https://portal.hedera.com/
2. **Fund with HBAR**: Portal faucet
3. **Get USDC**: https://faucet.circle.com/ (select Hedera Testnet)
4. **Associate Tokens**: See Token Association above
5. **Create HCS Topic**: `bun run scripts/setup-testnet.ts`

## References

- [Official x402 Docs](https://docs.hedera.com/solutions/ai/x402)
- [Exact Scheme Spec](https://docs.hedera.com/solutions/ai/x402/exact-scheme)
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [HCS Documentation](https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service)
- [ETHGlobal Mumbai Prize](https://ethglobal.com/events/mumbai/prizes/hedera)

## License

Apache-2.0

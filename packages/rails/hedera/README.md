# Railguard Hedera Testnet Rail

Official x402 payment protocol implementation for Hedera testnet with policy enforcement, facilitator settlement, and mirror node verification.

## Features

### ✅ Official x402 Protocol
- **HTTP 402 Payment Required** flow via `@x402/core` and `@x402/hedera`
- **Exact Hedera Scheme** with facilitator settlement
- **Public facilitator** support via `https://x402.org/facilitator`
- **ED25519 and ECDSA** key support

### ✅ Policy Enforcement
- **Total budget** limits across all payments
- **Per-merchant limits** per recipient account
- **Recipient allowlist** - only approved accounts
- **Approval thresholds** - human approval for large payments
- **Idempotent retries** - same request ID = same decision

### ✅ Settlement Verification
- **Facilitator settlement** via x402.org public facilitator
- **Mirror node verification** via Hedera REST API
- **Transaction status** checking (SUCCESS, PENDING, FAILED)
- **Amount validation** (exact match required)

### ✅ HCS Audit Logging (Optional)
- **Hash-chained entries** via Hedera Consensus Service
- **Tamper-evident log** of all payment decisions (when HCS topic configured)
- **Chain integrity verification** (prevHash validation)
- **Optional enhancement** - not required for x402 flow

## Installation

```bash
npm install @railguard/rail-hedera
```

## Quick Start

### x402 Client (Guarded)

```typescript
import { createX402RealClient, fetchX402Resource, HederaPaymentGuard } from "@railguard/rail-hedera"

// Create guard with policy
const guard = new HederaPaymentGuard({
  totalBudget: 100_000_000n, // 1 HBAR
  perMerchantLimit: 50_000_000n, // 0.5 HBAR per recipient
  recipientAllowlist: ["0.0.12345", "0.0.67890"],
  approvalThreshold: 20_000_000n, // 0.2 HBAR requires approval
})

// Create x402 client (REQUIRES guard)
const client = createX402RealClient({
  accountId: "0.0.12345",
  privateKey: "302e...", // ED25519 or ECDSA
  guard,
})

// Fetch protected resource
const result = await fetchX402Resource(client, "https://api.example.com/data", {
  requestId: "req_123", // Optional caller request ID
  guard, // Pass guard to enable checking before signing
})

console.log(result.paymentStatus) // "SETTLED_BY_FACILITATOR" | "failed" | "none"
console.log(result.transactionId) // Hedera transaction ID if settled
```

### x402 Server

```typescript
import { createX402RealServer } from "@railguard/rail-hedera"

const server = createX402RealServer({
  facilitatorUrl: "https://x402.org/facilitator",
  facilitatorAccountId: "0.0.9185802",
})

const handler = async (request: Request): Promise<Response> => {
  const result = await server.handle(request)
  
  if (result.settled) {
    // Payment successful, return protected resource
    return new Response(JSON.stringify({ data: "protected content" }), {
      status: 200,
      headers: result.headers, // Includes PAYMENT-RESPONSE header
    })
  }
  
  // Return 402 challenge or error
  return result.response
}
```

## Demo Commands

### Mocked Demo (No Network)

```bash
bun test packages/rails/hedera
```

Runs 45+ unit tests with mocked facilitator and network calls.

### Known Limitations

⚠️ **ExactHederaScheme (from `@x402/hedera`) only supports HTS tokens, not HBAR (0.0.0)**

The official x402 Exact Hedera scheme does not support HBAR payments directly. For production use with HBAR, you would need to:
- Use an HTS-wrapped HBAR token
- Implement a custom scheme
- Use a different payment protocol

The tests in this package use mocked facilitator responses and work correctly for demonstrating the integration patterns, but real HBAR payments via ExactHederaScheme are not currently supported by the upstream library.

### Live Integration Tests (Optional)

```bash
export HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
export HEDERA_TESTNET_PRIVATE_KEY=302e...
export HEDERA_HCS_TOPIC_ID=0.0.xxxxx  # Optional for HCS audit tests
export RUN_HEDERA_INTEGRATION=1

bun test packages/rails/hedera/src/integration.test.ts
```

Real testnet integration tests (skipped by default):
- Real facilitator verify/settle
- Real Hedera transactions
- Mirror node verification
- HCS audit logging (if topic configured)

## API Reference

### Client

#### `createX402RealClient(config)`

Creates a guarded x402 HTTP client (REQUIRED for production).

```typescript
interface X402RealClientConfig {
  accountId: string // Hedera account ID
  privateKey: string // ED25519 or ECDSA private key
  guard: HederaPaymentGuard // Policy enforcement
  spendControls?: false | { ... } // Default: false (testnet only)
}
```

#### `createUnguardedX402TestClient(config)`

Creates an unguarded client for testing only.

```typescript
interface X402TestClientConfig {
  accountId: string
  privateKey: string
  allowWithoutGuardForTest: true // Explicit flag required
}
```

#### `fetchX402Resource(client, url, options?)`

Fetches a protected resource with x402 payment flow.

```typescript
interface FetchX402Options extends RequestInit {
  requestId?: string // Caller request ID (for idempotency)
  guard?: HederaPaymentGuard // Guard instance (required if using guarded client)
}

interface FetchX402Result {
  status: number
  body: unknown
  paid: boolean
  paymentStatus: "none" | "paid" | "SETTLED_BY_FACILITATOR" | "failed"
  transactionId?: string // Hedera transaction ID if settled
}
```

**Guard Check:** The guard is called BEFORE `createPaymentPayload` with the caller-provided `requestId` or deterministic ID. If guard denies, no signing occurs and `paymentStatus: "failed"` is returned immediately.

### Server

#### `createX402RealServer(config)`

Creates an x402 HTTP resource server with facilitator settlement.

```typescript
interface X402RealServerConfig {
  facilitatorUrl: string // e.g. "https://x402.org/facilitator"
  facilitatorAccountId: string // e.g. "0.0.9185802"
}
```

### Guard

#### `HederaPaymentGuard`

Policy enforcement with budget tracking and allowlists.

⚠️ **In-memory demo implementation** - budgets/allowlists are not persisted. For production use, implement durable storage.

```typescript
class HederaPaymentGuard {
  constructor(config: {
    totalBudget: bigint // Total budget across all payments (in-memory)
    perMerchantLimit: bigint // Per-recipient limit (in-memory)
    recipientAllowlist: string[] // Allowed recipient account IDs (in-memory)
    approvalThreshold?: bigint // Amount requiring approval
  })

  checkPayment(params: {
    requestId: string
    recipient: string
    amount: bigint
    asset: string
  }): { decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED"; reason?: string }

  approvePayment(requestId: string): void
  rollbackPayment(requestId: string): void
}
```

## Testing

### All Tests

```bash
bun test packages/rails/hedera
```

**45 unit tests:**
- x402 Real Implementation (10 tests)
  - Client/server creation
  - Facilitator live check
  - Full payment flow with mocked facilitator
  - HTS token payments
  - 402 retry failure handling
  - Guard requestId correlation and denial
- Policy enforcement
- Amount precision (tinybar/bigint)
- HCS audit chain verification
- HTTP 402 flow

### Integration Tests (Optional)

Requires testnet credentials:

```bash
export RUN_HEDERA_INTEGRATION=1
export HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
export HEDERA_TESTNET_PRIVATE_KEY=302e...
export HEDERA_HCS_TOPIC_ID=0.0.xxxxx

bun test packages/rails/hedera/src/integration.test.ts
```

## Testnet Setup

1. **Create Account**: https://portal.hedera.com/
2. **Fund with HBAR**: Portal faucet
3. **Get USDC** (optional): https://faucet.circle.com/ (select Hedera Testnet)
4. **Associate Tokens** (if using HTS): See Token Association below

### Token Association

HTS tokens require account association before first use:

```typescript
import { AccountId, Client, PrivateKey, TokenAssociateTransaction, TokenId } from "@hashgraph/sdk"

const client = Client.forTestnet().setOperator(
  AccountId.fromString(accountId),
  PrivateKey.fromString(privateKey)
)

await new TokenAssociateTransaction()
  .setAccountId(AccountId.fromString(accountId))
  .setTokenIds([TokenId.fromString("0.0.429274")]) // testnet USDC
  .execute(client)
  .then(response => response.getReceipt(client))

client.close()
```

## Payment Flow

1. **Client → Server:** Initial request
2. **Server → Client:** 402 Payment Required with Hedera exact scheme
3. **Client:** Guard checks policy (budget, allowlist, limits) with caller `requestId`
4. **Client:** Creates partially signed TransferTransaction (if guard allows)
5. **Facilitator:** Verifies transaction structure
6. **Facilitator:** Adds signature, pays fee, submits to Hedera
7. **Client → Server:** Retry with PAYMENT-SIGNATURE header
8. **Server:** Calls facilitator settle, returns resource with PAYMENT-RESPONSE
9. **Client:** Parses settlement result (transaction ID, status)
10. **Mirror Node:** Verification (optional, for confirmation beyond facilitator)

## Amount Formats

- **HBAR:** 1 HBAR = 100,000,000 tinybars (8 decimals)
  - Example: 0.001 HBAR = 100,000 tinybars = `100000n`
- **USDC:** 1 USDC = 1,000,000 units (6 decimals)
  - Example: 1 USDC = `1000000n`

## Security Notes

- **Testnet Only:** This implementation enforces `hedera:testnet` network
- **Guard Required:** Production clients MUST use `createX402RealClient` with guard
- **No Mainnet:** Mainnet is explicitly disabled for safety
- **Credentials:** Never commit private keys or account IDs

## References

- [Official x402 Docs](https://docs.hedera.com/solutions/ai/x402)
- [Merchant Integration](https://docs.hedera.com/solutions/ai/x402/merchant-integration)
- [Facilitators](https://docs.hedera.com/solutions/ai/x402/facilitators)
- [x402 Foundation GitHub](https://github.com/x402-foundation/x402)
- [Hedera Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)

## License

Apache-2.0

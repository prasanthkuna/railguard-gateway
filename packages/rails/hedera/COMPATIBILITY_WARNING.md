# ⚠️ Hedera x402 Compatibility Warning

## Current Implementation Status

**This implementation is NOT compatible with official Hedera x402 specification.**

### What We Built

A custom HTTP 402 payment protocol for Hedera that:
- Uses raw Hedera transaction IDs as payment proof
- Verifies settlements via mirror node REST API
- Implements replay protection with payment-identifier
- Enforces payment policy (budgets, allowlists, approvals)

### Official Hedera x402 Specification

According to [docs.hedera.com/solutions/ai/x402](https://docs.hedera.com/solutions/ai/x402), the official spec requires:

1. **Scheme**: `"exact"` (not `"hedera"`)
2. **Network**: `"hedera:testnet"` or `"hedera:mainnet"` (CAIP-2 format, not `"hedera-testnet"`)
3. **Facilitator Model**: Uses a fee-payer facilitator that:
   - Client creates partially-signed `TransferTransaction`
   - Facilitator adds signature as `feePayer`
   - Facilitator pays network fees and submits transaction
   - Returns settlement result with transaction ID
4. **Payload Structure**:
   ```json
   {
     "x402Version": 2,
     "accepted": {
       "scheme": "exact",
       "network": "hedera:testnet",
       "amount": "1000",
       "asset": "0.0.0",
       "payTo": "0.0.1234",
       "maxTimeoutSeconds": 180,
       "extra": {
         "feePayer": "0.0.9185802"
       }
     },
     "payload": {
       "transaction": "AAAAAAAAAAAAA...AAAAAAAAAAAAA="
     }
   }
   ```
5. **Official Packages**: `@x402/core` and `@x402/hedera` (npm packages)
6. **Facilitator Endpoints**: `/verify` and `/settle` endpoints

### ETHGlobal Mumbai Prize Requirements

From [ethglobal.com/events/mumbai/prizes/hedera](https://ethglobal.com/events/mumbai/prizes/hedera):

> **Qualification Requirements:**
> - At least one x402-protected endpoint that settles on Hedera testnet or mainnet **through any facilitator listed in the Hedera docs** (Official x402, Ax402, or Blocky402), or through a facilitator you run yourself.
> - An agent or client that finds the endpoint and completes at least one paid request end to end, with no human approving.
> - A public GitHub repo with a README that covers setup, architecture, and the payment flow, **including the Hedera transaction ID of at least one settled payment**.
> - A demo video of 5 minutes or less that shows a payment settling and **links to it on HashScan**.

### Known Type Errors

1. **Verifier Interface Mismatch**:
   - `x402Server.ts` calls `verifier.verifyTransaction(transactionId, intent)`
   - Real `HederaPaymentVerifier` has `verifyPayment(transactionId, expected: HederaExpectedPayment)`
   - Mock returns `{ status: "SUCCESS" }` but real returns `{ status: "CONFIRMED" | "NOT_FOUND" | "FAILED" | "RECONCILIATION_REQUIRED" }`

2. **Missing Sender Validation**:
   - No verification that payer matches expected account
   - Allows anyone's transaction as proof

3. **Transaction Replay Vulnerability**:
   - Same transaction ID can be reused with different `payment-identifier` across multiple resources
   - Fingerprint only binds `requirements + path + tx`, not the actual resource or request
   - Need transaction ID → resource mapping to prevent replay

4. **RequestId Generation**:
   - Client derives deterministic requestId from URL+requirements
   - Allows unlimited replays of same resource
   - Should use server-issued unique challenge ID

### Required Changes for Official Compatibility

To match official Hedera x402 spec:

1. **Integrate with facilitator**:
   - Use `@x402/hedera` official package
   - Implement `/verify` and `/settle` via facilitator (e.g., https://x402.org/facilitator)
   - Use `ExactHederaScheme` from `@x402/hedera/exact/server`

2. **Fix payload structure**:
   - Change `scheme` from `"hedera"` to `"exact"`
   - Change `network` from `"hedera-testnet"` to `"hedera:testnet"`
   - Add `feePayer` in `extra`
   - Use base64-encoded partially-signed `TransferTransaction` instead of transaction ID

3. **Client integration**:
   - Use `@x402/hedera` client with `createClientHederaSigner`
   - Build `TransferTransaction` with `PrivateKey.sign()`
   - Let facilitator submit and pay fees

4. **Fix type errors** (see below)

### Immediate Type Fixes Needed

```typescript
// x402Server.ts - Fix verifier interface
const expected: HederaExpectedPayment = {
  tokenId: req.asset === "HBAR" ? "HBAR" : req.asset,
  recipient: req.payTo,
  amount: BigInt(req.amount),
  sender: undefined, // Add sender validation
  memo: payload.payload.memo,
}

const verified = await options.verifier.verifyPayment(
  payload.payload.transactionId,
  expected,
)

if (verified.status !== "CONFIRMED") {
  // Handle NOT_FOUND, FAILED, RECONCILIATION_REQUIRED
}
```

### Recommendation

**For ETHGlobal Mumbai prize eligibility:**

1. **Use official `@x402/hedera` package** instead of custom implementation
2. **Integrate with listed facilitator** (Official x402, Ax402, or Blocky402)
3. **Test with official packages** to ensure compatibility
4. **Get transaction ID from facilitator settlement response**

**OR:**

Build a compliant facilitator implementing the exact scheme specification.

### Current Value

What we have IS useful as:
- **Reference implementation** of Hedera payment verification via mirror node
- **Policy enforcement layer** (budgets, allowlists, approvals) - missing from official x402
- **HCS audit logging** (tamper-evident spending log) - prize extra points
- **Foundation for facilitator** - could be extended to run a compliant facilitator

But it's NOT a drop-in x402 implementation for the prize as-is.

---

## References

- [Hedera x402 Docs](https://docs.hedera.com/solutions/ai/x402)
- [x402 Exact Scheme Spec](https://docs.hedera.com/solutions/ai/x402/exact-scheme)
- [ETHGlobal Mumbai Hedera Prize](https://ethglobal.com/events/mumbai/prizes/hedera)
- [Official x402 Facilitator](https://x402.org/facilitator)
- [x402 NPM Packages](https://www.npmjs.com/search?q=%40x402)

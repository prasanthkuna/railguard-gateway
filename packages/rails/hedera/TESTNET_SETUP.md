# Hedera Testnet Setup Guide

**Goal:** Get your Hedera testnet account and run actual payments on testnet.

**Time:** ~10 minutes  
**Cost:** Free (testnet only)

---

## Step 1: Get Free Testnet Account (5 min)

### Option A: Hedera Portal (Recommended)

1. **Go to:** https://portal.hedera.com
2. **Sign up** with email (free account)
3. **Select "Testnet"** from the network dropdown
4. **Create a new testnet account:**
   - Click "Create Account" or "Get Testnet Account"
   - You'll receive:
     - Account ID (format: `0.0.12345`)
     - Private Key (starts with `302e` for ED25519)
     - Initial balance: ~10 HBAR testnet funds

5. **Save credentials securely:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export HEDERA_TESTNET_ACCOUNT_ID="0.0.YOUR_ACCOUNT_ID"
   export HEDERA_TESTNET_PRIVATE_KEY="302e...YOUR_KEY"
   ```

### Option B: HashPack Wallet (Alternative)

1. Install HashPack browser extension
2. Create new wallet
3. Switch to Testnet
4. Get free testnet HBAR from faucet
5. Export private key from wallet settings

---

## Step 2: Verify Account (1 min)

```bash
cd packages/rails/hedera

# Check your account balance
bun run scripts/check-balance.ts
```

Expected output:
```
✅ Account ID: 0.0.12345
📊 Balance: 10 HBAR
```

---

## Step 3: Create HCS Audit Topic (2 min)

```bash
# Run setup script (creates topic automatically)
bun run scripts/setup-testnet.ts
```

Expected output:
```
✅ Topic created: 0.0.67890
   Memo: Railguard Testnet Audit Log

Add this to your environment:
export HEDERA_HCS_TOPIC_ID="0.0.67890"

View your topic on HashScan:
https://hashscan.io/testnet/topic/0.0.67890
```

**Save the topic ID:**
```bash
export HEDERA_HCS_TOPIC_ID="0.0.YOUR_TOPIC_ID"
```

---

## Step 4: Run Integration Tests (2 min)

```bash
# Enable integration tests
export RUN_HEDERA_INTEGRATION=1

# Run tests (actual testnet execution)
bun test src/integration.test.ts
```

Expected output:
```
✅ executes HBAR payment and verifies on chain
   Transaction ID: 0.0.12345@1699123456.789012345
   Payment CONFIRMED: 0.0.12345@1699123456.789012345

✅ denies payment to non-allowlisted recipient
✅ prevents duplicate payment with same request ID
✅ handles over-budget payment
✅ submits and retrieves audit entries
   Audit entry submitted: 0.0.12345@1699123457.123456789
```

---

## Step 5: Run Demo (Optional)

```bash
# Full demo with multiple payment scenarios
bun run scripts/testnet-demo.ts
```

---

## Required Environment Variables

**Minimum (for reading only):**
- None - unit tests work without credentials

**For testnet execution:**
- `HEDERA_TESTNET_ACCOUNT_ID` - Your testnet account (format: `0.0.12345`)
- `HEDERA_TESTNET_PRIVATE_KEY` - Your ED25519 private key (starts with `302e`)

**For HCS audit logging:**
- `HEDERA_HCS_TOPIC_ID` - HCS topic for audit (format: `0.0.67890`)

**For integration tests:**
- `RUN_HEDERA_INTEGRATION=1` - Enable live testnet tests

---

## Testnet USDC (Optional)

For HTS token testing:

1. **Find testnet USDC faucet** (check Hedera Discord)
2. **Request testnet USDC** to your account
3. **Associate token** with your account:
   ```bash
   # Token association required before receiving HTS tokens
   bun run scripts/associate-token.ts 0.0.429274
   ```

---

## Troubleshooting

### "Insufficient account balance"

**Problem:** Not enough HBAR for fees  
**Solution:** Get more testnet HBAR from portal or faucet

### "Invalid private key format"

**Problem:** Wrong key format  
**Solution:** Use ED25519 key (starts with `302e`), not mnemonic phrase

### "Topic not found"

**Problem:** Topic ID incorrect or not created  
**Solution:** Re-run `setup-testnet.ts` to create topic

### "Token not associated with account"

**Problem:** HTS token not associated before transfer  
**Solution:** Run `associate-token.ts` first

---

## View on HashScan

All testnet activity is publicly visible:

**Your account:**  
`https://hashscan.io/testnet/account/YOUR_ACCOUNT_ID`

**Your HCS topic:**  
`https://hashscan.io/testnet/topic/YOUR_TOPIC_ID`

**Specific transaction:**  
`https://hashscan.io/testnet/transaction/TRANSACTION_ID`

---

## Security Notes

1. **Testnet keys only** - Never use mainnet keys
2. **No real value** - Testnet HBAR/tokens have no value
3. **Public testnet** - All transactions are publicly visible
4. **Don't commit keys** - Add `.env` to `.gitignore`

---

## Getting Help

- **Hedera Discord:** https://hedera.com/discord
- **Hedera Docs:** https://docs.hedera.com
- **Testnet Explorer:** https://hashscan.io/testnet
- **Portal:** https://portal.hedera.com

---

## Next Steps

After setup is complete:

1. ✅ Run integration tests to verify everything works
2. ✅ Get at least one confirmed transaction ID
3. ✅ View your audit log on HashScan
4. ✅ Integrate with Railguard kernel (see main README)

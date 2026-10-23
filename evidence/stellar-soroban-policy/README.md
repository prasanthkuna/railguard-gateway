# Stellar testnet - Railguard Soroban policy contract

On-chain policy for agent payments on Stellar: per-agent budget, intent binding (recipient / asset / amount),
deterministic request id, duplicates and replays rejected. Asset: **Circle testnet USDC**.

| Field | Value |
|-------|-------|
| Contract | [`CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N`](https://stellar.expert/explorer/testnet/contract/CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N) |
| Source | [`contracts/soroban/railguard-policy`](../../contracts/soroban/railguard-policy) (wasm sha256 `c9cd982b...b8db5`) |
| Asset | USDC `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (SAC `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`) |
| Admin (operator) | `GB62LQKQ7UDFSYSKCF4B7WCPVHDNAYBAFITIQJNNINAKMKZVEP3RBE7X` |
| Agent | `GDX7EBCAC4NVLPBE4TGDNEUEA2TAGOYCKELCQP245YMHA66GV6PIDLP5` |
| Recipient | `GATQQK34YWBIHF3KTSFL4EFEPTIFH5UJK347CLKAJGYO437KRKTU22VO` |
| Budget | 5 USDC |
| Intent | 1.25 USDC, nonce 1 |
| Request id | `a51ce40f43414f30b131c12b6812200053d1db0d93fa679f004f0a49114268db` |
| Settlement | **CONFIRMED** (settlement verified on Horizon) |

## Transactions (2026-10-23, IST)

| Step | Tx | Time (IST) |
|------|----|------------|
| Deploy | [d9c74cb0...](https://stellar.expert/explorer/testnet/tx/d9c74cb081c1b5cf03fc921bec3b21e02b9995b93614eaf5d5b53c14206462d8) | 10:02:47 |
| set_budget 5 USDC | [6bca3dcc...](https://stellar.expert/explorer/testnet/tx/6bca3dcc2ad8522fc0208590c50c4d2f9b1025b9a574b1e738b54e2be4003bc8) | 10:03:02 |
| grant 1.25 USDC | [063cfeb9...](https://stellar.expert/explorer/testnet/tx/063cfeb9165754d71309bd996ae5b117b34caf1e5d887fc6facbe2bee2be076e) | 10:03:07 |
| execute (USDC agent -> recipient) | [2e8c13fa...](https://stellar.expert/explorer/testnet/tx/2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353) | 10:03:22 |

Horizon (execute): https://horizon-testnet.stellar.org/transactions/2e8c13fab4feb88a451ec617dc9c5a129a600e7e6dc62c1868d67336702f8353/operations

## Rejections (contract errors, recorded 2026-10-23)

| Attempt | Result |
|---------|--------|
| Grant the same intent again | `DuplicateRequest` (#4) |
| Execute to a different recipient | `IntentMismatch` (#6) |
| Execute 1 stroop more than granted | `IntentMismatch` (#6) |
| Execute again after success (replay) | `AlreadyExecuted` (#7) |
| Grant 4 USDC with 1.25 already spent of 5 | `BudgetExceeded` (#3) |

Anyone can reproduce these as **simulations** (nothing is sent) with any funded testnet key:

```bash
C=CBUY5JNZEGYR7I3QJEIALF2DR4NNS3OHEBOS7CGEXY2J4VU64IM7ZL5N
U=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
AG=GDX7EBCAC4NVLPBE4TGDNEUEA2TAGOYCKELCQP245YMHA66GV6PIDLP5
RC=GATQQK34YWBIHF3KTSFL4EFEPTIFH5UJK347CLKAJGYO437KRKTU22VO
R=a51ce40f43414f30b131c12b6812200053d1db0d93fa679f004f0a49114268db
stellar keys generate judge --network testnet --fund
# replay -> Error(Contract, #7)
stellar contract invoke --id $C --source judge --network testnet --send no -- execute --request_id $R --recipient $RC --asset $U --amount 12500000
# duplicate grant -> Error(Contract, #4)
stellar contract invoke --id $C --source judge --network testnet --send no -- grant --agent $AG --recipient $RC --asset $U --amount 12500000 --nonce 1
# deterministic id -> "a51ce40f..."
stellar contract invoke --id $C --source judge --network testnet --send no -- request_id --agent $AG --recipient $RC --asset $U --amount 12500000 --nonce 1
```

## Off-chain verification

```bash
bun run stellar-soroban-policy-evidence   # rewrites manifest.json, exits 0 only on CONFIRMED
```

`packages/settlement/src/stellar-soroban-policy.ts` recomputes the request id from the intent, then checks the
Horizon `invoke_host_function` operation: contract id, `execute` function, request id argument, and exactly one
USDC transfer from the agent to the recipient for the exact amount. Anything else is `RECONCILIATION_REQUIRED`.

Testnet keys live only in the local `.env` (`STELLAR_TESTNET_*_SECRET`), never in git.

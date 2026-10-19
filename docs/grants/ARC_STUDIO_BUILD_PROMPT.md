# Arc Studio build prompt — Railguard Spend Gate

Use this prompt inside **Arc Studio** (web or CLI). The microgrant requires the contract, tests, and app to be built in Arc Studio, so do not replace this step with a normal local-only implementation.

## Prompt

Build a small production-quality Arc app called **Railguard Spend Gate**.

Purpose: demonstrate a financial execution firewall for AI-agent payments on Arc. An authorized agent can send native USDC only when a payment is within policy. The contract must prevent oversized payments, cumulative budget overflow, and replayed payment IDs.

### Smart contract

Create a Solidity contract named `RailguardArcGate` with:

- immutable `owner`
- configurable `agent`
- `perPaymentCap`
- `totalCap`
- `spent`
- replay protection with `mapping(bytes32 => bool) usedPaymentIds`
- constructor parameters: agent, perPaymentCap, totalCap
- owner-only setters for agent and both caps
- `checkPayment(bytes32 paymentId, address recipient, uint256 amount)` view function returning `(bool allowed, string memory reason)`
- `executePayment(bytes32 paymentId, address payable recipient)` external payable
- `executePayment` must require caller == agent, recipient != zero, paymentId unused, msg.value > 0, msg.value <= perPaymentCap, and spent + msg.value <= totalCap
- mark paymentId used before the external transfer
- use checks-effects-interactions
- transfer native Arc USDC to recipient
- revert if transfer fails
- no upgradeability, no delegatecall, no arbitrary external-call surface

Use these exact events:

```solidity
event PolicyUpdated(address indexed agent, uint256 perPaymentCap, uint256 totalCap);
event PaymentExecuted(
    bytes32 indexed paymentId,
    address indexed agent,
    address indexed recipient,
    uint256 amount,
    uint256 totalSpent
);
```

Use clear custom errors for unauthorized caller, zero recipient, zero amount, replay, per-payment cap, total budget, and transfer failure.

### Tests

Write Arc Studio tests covering at least:

1. authorized payment succeeds and recipient receives exact value
2. non-agent cannot execute
3. amount above per-payment cap reverts
4. cumulative spend above total cap reverts
5. duplicate paymentId reverts
6. zero recipient reverts
7. state updates before external transfer
8. owner can update policy
9. non-owner cannot update policy

Keep tests deterministic and minimal.

### App

Build a clean single-page app in Arc Studio that calls the deployed contract.

The UI should show:

- network: Arc
- contract address
- connected wallet
- configured agent
- per-payment cap
- total budget
- spent
- remaining budget
- recipient input
- amount input
- payment ID input with a Generate button
- **Preflight** button calling `checkPayment`
- **Execute payment** button calling `executePayment` with native USDC value
- success state with transaction hash + Arc explorer link
- blocked/error state with the exact policy reason
- a small execution flow: Intent → Authorize → Execute → Evidence

Design should match Railguard: near-black background, restrained mint accent, Space Grotesk/Geist-style typography, technical rather than crypto-casino visuals.

### Mainnet readiness

First build, test, and validate on Arc testnet in Arc Studio. Then make the code exportable for Arc mainnet deployment by the builder's own wallet/tooling.

Do not claim Arc Studio broadcasts mainnet transactions. The final mainnet deploy and USDC transaction will be signed externally by the builder.

### Deliverables

At the end provide:

- Arc Studio project URL
- generated contract source
- test results
- app source
- deployment instructions for Arc mainnet
- exact constructor args
- exported ABI
- one short list of files to push to GitHub

Do not add unrelated features.

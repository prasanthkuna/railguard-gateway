# Arc Studio microgrant evidence

This directory is intentionally free of fabricated transaction data.

After the Arc Studio-built contract and app are deployed and a real Arc mainnet USDC payment succeeds, run:

```bash
ARC_STUDIO_PROJECT_URL="https://studio.arc.io/..." \
ARC_STUDIO_APP_URL="https://..." \
ARC_STUDIO_CONTRACT_ADDRESS="0x..." \
ARC_STUDIO_TX_HASH="0x..." \
bun run verify-arc-studio-mainnet
```

The verifier writes `manifest.json` and replaces this README with the confirmed proof details.

Do not commit a manifest until the mainnet transaction has actually succeeded.

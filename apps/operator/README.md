# Railguard Operator Console

Reference **operator UI** for demos, grants, and ops testing (hosted on Vercel).

**Vercel:** set root directory to `apps/operator` (renamed from `apps/web`).

This is **not** the public Railguard brand surface — the marketing site (`apps/site`) hosts Failure Lab, ecosystems, and public testnet proof pages. Product name: **Railguard Operator**; `prebroadcast.vercel.app` is a legacy testnet hostname.

| Env | Purpose |
|-----|---------|
| `NEXT_PUBLIC_API_URL` / Encore | Gateway API (default staging) |
| WorkOS | Auth for operator flows |

Public reviewer paths without login: `/zebpay`, future `/attack` demo routes.

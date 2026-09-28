# Railguard Operator Console

Reference **operator UI** for demos, grants, and ops testing (hosted on Vercel).

**Vercel:** set root directory to `apps/operator` (renamed from `apps/web`).

This is **not** the public Railguard brand surface — marketing site and Failure Lab front door are separate (`apps/site` planned; see [plan28.1-EXECUTION.md](../../../plan28.1-EXECUTION.md)).

| Env | Purpose |
|-----|---------|
| `NEXT_PUBLIC_API_URL` / Encore | Gateway API (default staging) |
| WorkOS | Auth for operator flows |

Public reviewer paths without login: `/zebpay`, future `/attack` demo routes.

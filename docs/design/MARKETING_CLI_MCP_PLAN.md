# Marketing gap — CLI & MCP discoverability

## Problem

- Recipe cards show `railguard scan` **without** `$`, install context, or **`bun run`** — visitors assume it is a global binary or random text, not a **terminal command**.
- **MCP** is invisible on the marketing site; agent builders never see Cursor/Claude wiring.
- **`npx @railguard/cli`** is **not** valid today (`@railguard/cli` is `private: true` in the monorepo). Promising `npx` before npm publish erodes trust.

## Principles

| Rule | Why |
| --- | --- |
| Label every block | **Terminal command**, **MCP config (JSON)**, **Environment variable** |
| Show `$` prompt + copy | Affordance borrowed from Stripe/Vercel docs |
| Honest install path | Clone → `bun install` → `bun run railguard …` until packages ship to npm |
| MCP points at repo file | `docs/mcp-cursor.example.json` — copy into Cursor settings |
| Separate “agent pseudocode” from CLI | SDK `check(intent)` ≠ shell |

## Site IA (implemented)

1. **`#integrate`** — `AgentIntegrationsSection`: CLI · MCP · API table + install strip  
2. **Recipes** — `CliCommand` with comment line + `bun run` prefix + copy  
3. **Evaluate** — one verify command with full context  
4. **Hero** — anchor link “CLI & MCP” → `#integrate`

## Future (when `@railguard/cli` is public)

- Add tab: **From npm** `npx @railguard/cli doctor` vs **From source** `bun run railguard doctor`  
- Pin version in copy; link to npm package page  

## Not in scope

- Coinbase CDP portal flows (different product path — keep on `/ecosystems` only)  
- Embedding live MCP in the browser  

## Success

- A non-developer can answer: “Do I type this in a terminal?” within 2 seconds of seeing a command block.  
- An agent developer finds MCP JSON + env vars without reading the whole README.

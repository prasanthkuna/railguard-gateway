import { GITHUB_GATEWAY } from "./constants"

/** Shown on marketing site — matches root package.json scripts (not published npm yet). */
export const REPO_CLONE_HINT = "git clone https://github.com/prasanthkuna/railguard-gateway.git && cd railguard-gateway && bun install"

export const CLI_VERBS = ["scan", "attack", "protect", "status", "receipts"] as const

export function cliBunRun(subcommand: string): string {
  return `bun run railguard ${subcommand}`
}

export const INTEGRATION_SNIPPETS = {
  installComment: "# Terminal — after clone & bun install (repo root)",
  verifyDemo: cliBunRun("verify"),
  doctor: cliBunRun("doctor"),
  failureLab: cliBunRun("attack"),
  arbitrumSepoliaEvidence: "bun run arbitrum-sepolia-evidence",
  stellarTestnetEvidence: "bun run stellar-testnet-evidence",
  verifyPublicProofs: "bun run verify-arbitrum-sepolia-pack && bun run verify-stellar-testnet-pack",
  mcpDocPath: `${GITHUB_GATEWAY}/blob/main/docs/mcp-cursor.example.json`,
  mcpRun: "bun run railguard:mcp",
  apiDoc: `${GITHUB_GATEWAY}/blob/main/docs/INTEGRATION.md`,
} as const

/** Minimal MCP fragment for copy (paths relative to cloned repo). */
export const MCP_CURSOR_SNIPPET = `{
  "mcpServers": {
    "railguard": {
      "command": "bun",
      "args": ["run", "packages/mcp/src/server.ts"],
      "env": {
        "RAILGUARD_BASE_URL": "http://127.0.0.1:4000",
        "RAILGUARD_ACCESS_TOKEN": "<your-token>"
      }
    }
  }
}`

import Link from "next/link"
import { EXTERNAL_LINK, GITHUB_GATEWAY } from "../lib/constants"
import {
  CLI_VERBS,
  INTEGRATION_SNIPPETS,
  MCP_CURSOR_SNIPPET,
  REPO_CLONE_HINT,
  cliBunRun,
} from "../lib/integration-snippets"
import { CliCommand } from "./CliCommand"
import { ConfigSnippet } from "./ConfigSnippet"

export function AgentIntegrationsSection() {
  return (
    <section className="section" id="integrate">
      <h2>CLI, MCP, and API — same lifecycle</h2>
      <p className="section-intro">
        Lines that start with <span className="mono">$</span> are <strong>terminal commands</strong>{" "}
        (PowerShell, bash, or Windows Terminal). JSON blocks are <strong>config files</strong> for
        Cursor or Claude Desktop — do not paste them into a shell. Packages are developed in the
        open repo; there is no public <span className="mono">npx @railguard/cli</span> yet.
      </p>

      <CliCommand
        label="Install (terminal)"
        comments={["# One-time — requires Bun from https://bun.sh"]}
        command={REPO_CLONE_HINT}
        bunRunRailguard={false}
      />

      <div className="integrate-grid">
        <article className="integrate-card">
          <h3>CLI</h3>
          <p className="recipe-persona">
            Humans, CI, and demos — authorize, execute, verify from the terminal.
          </p>
          <p className="rg-caption">
            Verbs: <span className="mono">{CLI_VERBS.join(" · ")}</span>
          </p>
          <CliCommand
            command={`${cliBunRun("doctor")} && ${cliBunRun("attack")}`}
            comments={[INTEGRATION_SNIPPETS.installComment]}
          />
          <p className="integrate-foot">
            <a href={`${GITHUB_GATEWAY}/tree/main/packages/cli`} {...EXTERNAL_LINK}>
              packages/cli README
            </a>
          </p>
        </article>

        <article className="integrate-card">
          <h3>MCP (agents in Cursor / Claude)</h3>
          <p className="recipe-persona">
            Tool calls for <span className="mono">create_intent</span>,{" "}
            <span className="mono">authorize</span>, <span className="mono">verify</span> — same API
            as the CLI.
          </p>
          <ConfigSnippet label="MCP config (JSON)" code={MCP_CURSOR_SNIPPET} />
          <CliCommand
            label="Run MCP server (terminal)"
            command={INTEGRATION_SNIPPETS.mcpRun}
            comments={[
              INTEGRATION_SNIPPETS.installComment,
              "# Terminal 1: bun run dev:api — then start MCP in Terminal 2",
            ]}
            bunRunRailguard={false}
          />
          <p className="integrate-foot">
            <a href={INTEGRATION_SNIPPETS.mcpDocPath} {...EXTERNAL_LINK}>
              Full example + tool list
            </a>
          </p>
        </article>

        <article className="integrate-card">
          <h3>REST + TypeScript SDK</h3>
          <p className="recipe-persona">
            Backend services and the operator UI call <span className="mono">/v1/*</span> directly.
          </p>
          <CliCommand
            label="Verify testnet evidence (terminal)"
            command={INTEGRATION_SNIPPETS.arbitrumSepoliaEvidence}
            comments={[INTEGRATION_SNIPPETS.installComment]}
            bunRunRailguard={false}
          />
          <p className="integrate-foot">
            <a href={INTEGRATION_SNIPPETS.apiDoc} {...EXTERNAL_LINK}>
              Integration guide
            </a>
            {" · "}
            <Link href="/proof/stellar-testnet">Stellar proof</Link>
            {" · "}
            <Link href="/proof/arbitrum-sepolia">Arbitrum proof</Link>
          </p>
        </article>
      </div>
    </section>
  )
}

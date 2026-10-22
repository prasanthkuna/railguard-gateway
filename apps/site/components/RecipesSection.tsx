import { INTEGRATION_SNIPPETS } from "../lib/integration-snippets"
import { RECIPES } from "../lib/recipes"
import { CliCommand } from "./CliCommand"

export function RecipesSection() {
  const wedge = RECIPES.filter((r) => r.wedge)
  const rest = RECIPES.filter((r) => !r.wedge)

  return (
    <section className="section" id="recipes">
      <h2>One firewall. Different money flows.</h2>
      <p className="section-intro">
        Same five CLI verbs —{" "}
        <span className="mono">scan · attack · protect · status · receipts</span> — run in your{" "}
        <strong>terminal</strong> after <a href="#integrate">clone &amp; install</a> (
        <span className="mono">bun run railguard …</span>
        ). Built first for agent developers and treasury operators; security properties are shown in
        the <a href="/attack">Failure Lab</a> and repo tests. Agent tools use{" "}
        <a href="#integrate">MCP</a>, not these shell lines.
      </p>
      <div className="recipes-wedge-grid">
        {wedge.map((r) => (
          <article key={r.id} className="recipe-card wedge recipe-large">
            <h3>{r.title}</h3>
            <p className="recipe-persona">{r.persona}</p>
            <CliCommand
              command={r.command}
              comments={[INTEGRATION_SNIPPETS.installComment]}
              bunRunRailguard={r.id !== "agent"}
              label={r.id === "agent" ? "SDK call (TypeScript — not a shell command)" : undefined}
            />
          </article>
        ))}
      </div>
      <div className="recipes-compact-grid">
        {rest.map((r) => (
          <article key={r.id} className="recipe-card recipe-compact">
            <h3>{r.title}</h3>
            <CliCommand
              command={r.command}
              comments={[INTEGRATION_SNIPPETS.installComment]}
              bunRunRailguard={!r.command.includes("(")}
            />
          </article>
        ))}
      </div>
    </section>
  )
}

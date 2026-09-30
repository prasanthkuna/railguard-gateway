import { RECIPES } from "../lib/recipes"
import { CliCommand } from "./CliCommand"

export function RecipesSection() {
  const wedge = RECIPES.filter((r) => r.wedge)
  const rest = RECIPES.filter((r) => !r.wedge)

  return (
    <section className="section" id="recipes">
      <h2>One firewall. Different money flows.</h2>
      <p className="section-intro">
        Same five commands —{" "}
        <span className="mono">scan · attack · protect · status · receipts</span>. Built first for
        agent developers and treasury operators; the same controls extend to payouts, trading bots,
        DAOs, and shared wallets. Security properties are demonstrated per rail in the{" "}
        <a href="/attack">Failure Lab</a> and repository tests.
      </p>
      <div className="recipes-wedge-grid">
        {wedge.map((r) => (
          <article key={r.id} className="recipe-card wedge recipe-large">
            <h3>{r.title}</h3>
            <p className="recipe-persona">{r.persona}</p>
            <CliCommand command={r.command} />
          </article>
        ))}
      </div>
      <div className="recipes-compact-grid">
        {rest.map((r) => (
          <article key={r.id} className="recipe-card recipe-compact">
            <h3>{r.title}</h3>
            <CliCommand command={r.command} />
          </article>
        ))}
      </div>
    </section>
  )
}

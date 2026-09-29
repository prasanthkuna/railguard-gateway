import { ECOSYSTEMS } from "../lib/ecosystems"
import { IntegrationLogo } from "./IntegrationLogo"

export function IntegrationsStrip() {
  return (
    <section className="integrations-strip" aria-label="Execution rails">
      <p className="integrations-strip-label mono">Execution infrastructure</p>
      <ul className="integrations-strip-list">
        {ECOSYSTEMS.map((eco) => (
          <li key={eco.id}>
            <IntegrationLogo id={eco.id} size={24} />
            <span>{eco.label}</span>
          </li>
        ))}
      </ul>
      <p className="integrations-disclaimer">
        Logos are trademarks of their respective owners. Railguard is an independent open-source
        project.
      </p>
    </section>
  )
}

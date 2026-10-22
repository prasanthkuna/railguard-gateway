import { api } from "encore.dev/api"
import {
  type AirwallexIncidentDemoResult,
  runAirwallexIncidentDemo,
} from "../../packages/kernel/src/adapters/airwallex/demo"

interface AirwallexIncidentDemoResponse {
  rail: "airwallex"
  /** Always "simulated": the public demo never calls Airwallex or moves money. */
  mode: "simulated"
  demo: AirwallexIncidentDemoResult
}

/** Public, read-only Payment Ops Incident Commander demo (Airwallex Track 3). Simulator only. */
export const airwallexIncidentDemo = api(
  { expose: true, method: "GET", path: "/v1/airwallex/incident-demo" },
  async (): Promise<AirwallexIncidentDemoResponse> => {
    const demo = await runAirwallexIncidentDemo()
    return { rail: "airwallex", mode: "simulated", demo }
  },
)

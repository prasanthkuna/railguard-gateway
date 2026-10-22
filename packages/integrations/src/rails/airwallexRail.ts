import {
  AIRWALLEX_SANDBOX_BASE_URL,
  type AirwallexExecutionRail,
  createAirwallexClient,
  createAirwallexExecutionRail as createKernelAirwallexRail,
} from "@railguard/kernel/airwallex"

export interface AirwallexRailEnv {
  AIRWALLEX_CLIENT_ID?: string
  AIRWALLEX_API_KEY?: string
  AIRWALLEX_BASE_URL?: string
  AIRWALLEX_SOURCE_CURRENCY?: string
}

/**
 * Airwallex payout rail (kernel implementation). Configured only when sandbox keys are present;
 * otherwise execute/observe/reconcile fail closed with "not configured".
 */
export function createAirwallexExecutionRail(
  env: AirwallexRailEnv = process.env as AirwallexRailEnv,
): AirwallexExecutionRail {
  const clientId = env.AIRWALLEX_CLIENT_ID
  const apiKey = env.AIRWALLEX_API_KEY
  const client =
    clientId && apiKey
      ? createAirwallexClient({
          credentials: { clientId, apiKey },
          baseUrl: env.AIRWALLEX_BASE_URL ?? AIRWALLEX_SANDBOX_BASE_URL,
        })
      : undefined
  return createKernelAirwallexRail({
    client,
    sourceCurrency: env.AIRWALLEX_SOURCE_CURRENCY ?? "USD",
  })
}

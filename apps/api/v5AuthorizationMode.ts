/** Guard against demo-only authorizations in live money paths. */
export function requiresLivePolicy(
  paymentMode: "demo" | "live",
  guardEnabled: boolean,
): boolean {
  return paymentMode === "live" && !guardEnabled
}

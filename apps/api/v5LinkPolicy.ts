import type { V5ExecutionStatus } from "../../packages/kernel/src/executionRail"

/** Only link an intent to the legacy payment identified when it was authorized. */
export function canLinkV5Intent(
  status: V5ExecutionStatus,
  requestedPaymentIntentId: string,
  alreadyLinkedPaymentIntentId: string | undefined,
  authorizedContextPaymentIntentId: unknown,
): boolean {
  return (
    (status === "AUTHORIZED" || status === "RESERVED") &&
    requestedPaymentIntentId.length > 0 &&
    authorizedContextPaymentIntentId === requestedPaymentIntentId &&
    (alreadyLinkedPaymentIntentId === undefined ||
      alreadyLinkedPaymentIntentId === requestedPaymentIntentId)
  )
}

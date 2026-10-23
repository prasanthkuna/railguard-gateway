/** x402 v2 wire types and HTTP header helpers (exact scheme, EVM, EIP-3009). */
export const HEADER_PAYMENT_REQUIRED = "PAYMENT-REQUIRED"
export const HEADER_PAYMENT_SIGNATURE = "PAYMENT-SIGNATURE"
/** v1 name; still sent for compatibility with older resource servers. */
export const HEADER_X_PAYMENT = "X-PAYMENT"
export const HEADER_PAYMENT_RESPONSE = "PAYMENT-RESPONSE"

export interface PaymentRequirements {
  scheme: "exact" | string
  network: string
  amount: string
  asset: string
  payTo: string
  maxTimeoutSeconds: number
  extra?: Record<string, unknown> | undefined
}

export interface ResourceInfo {
  url: string
  description?: string | undefined
  mimeType?: string | undefined
  serviceName?: string | undefined
}

export interface PaymentRequired {
  x402Version: 2
  error?: string | undefined
  resource: ResourceInfo
  accepts: PaymentRequirements[]
  extensions?:
    | Record<string, { info: Record<string, unknown>; schema?: Record<string, unknown> }>
    | undefined
}

export interface Eip3009Authorization {
  from: string
  to: string
  value: string
  validAfter: string
  validBefore: string
  nonce: string
}

export interface PaymentPayload {
  x402Version: 2
  resource?: ResourceInfo | undefined
  accepted: PaymentRequirements
  payload: { signature: string; authorization: Eip3009Authorization }
  extensions?: Record<string, unknown> | undefined
}

export interface SettleResponse {
  success: boolean
  transaction?: string | undefined
  network?: string | undefined
  payer?: string | undefined
  errorReason?: string | undefined
}

export function encodeX402Header(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64")
}

export function decodeX402Header<T>(value: string | null | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as T
  } catch {
    return null
  }
}

export const PAYMENT_IDENTIFIER_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    required: { type: "boolean" },
    id: { type: "string", minLength: 16, maxLength: 128 },
  },
  required: ["required"],
} as const

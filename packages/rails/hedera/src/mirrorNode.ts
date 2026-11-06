/**
 * Hedera Mirror Node REST API client
 * Docs: https://docs.hedera.com/hedera/sdks-and-apis/rest-api
 */

export interface MirrorNodeConfig {
  baseUrl: string
}

export interface MirrorNodeTransaction {
  consensus_timestamp: string
  transaction_id: string
  result: string
  name: string
  charged_tx_fee: number
  memo_base64?: string
  token_transfers?: Array<{
    token_id: string
    account: string
    amount: number
  }>
  transfers?: Array<{
    account: string
    amount: number
  }>
}

export class HederaMirrorNode {
  constructor(private config: MirrorNodeConfig) {}

  /**
   * Get transaction by ID from mirror node
   * @param transactionId Format: "0.0.12345-1635360000-123456789" or "0.0.12345@1635360000.123456789"
   */
  async getTransaction(transactionId: string): Promise<MirrorNodeTransaction | null> {
    // Normalize transaction ID format for API (use dashes)
    const normalized = transactionId.replace(/@/g, "-")
    const url = `${this.config.baseUrl}/api/v1/transactions/${normalized}`

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Mirror node error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.transactions?.[0] ?? null
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(`Mirror node unreachable: ${this.config.baseUrl}`)
      }
      throw error
    }
  }

  /**
   * Decode base64 memo to UTF-8 string
   */
  decodeMemo(memoBase64: string | undefined): string | undefined {
    if (!memoBase64) return undefined
    try {
      return Buffer.from(memoBase64, "base64").toString("utf-8")
    } catch {
      return undefined
    }
  }
}

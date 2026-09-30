/**
 * Etherscan API V2 (multi-chain). Replaces deprecated per-chain V1 hosts (e.g. api.arbiscan.io).
 * @see https://docs.etherscan.io/v2-migration
 */

const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api"

export type EtherscanTokenTx = {
  hash: string
  from: string
  to: string
  contractAddress: string
  value: string
}

type EtherscanV2Response = {
  status: string
  message: string
  result: EtherscanTokenTx[] | string
}

export async function fetchErc20TokenTransfers(input: {
  chainId: number
  address: string
  contractAddress?: string
  page?: number
  offset?: number
  sort?: "asc" | "desc"
  apiKey?: string
}): Promise<EtherscanTokenTx[]> {
  const apiKey = input.apiKey ?? process.env.ETHERSCAN_API_KEY
  if (!apiKey) {
    throw new Error("ETHERSCAN_API_KEY required for Etherscan API V2 explorer lookup")
  }

  const params = new URLSearchParams({
    chainid: String(input.chainId),
    module: "account",
    action: "tokentx",
    address: input.address,
    page: String(input.page ?? 1),
    offset: String(input.offset ?? 25),
    sort: input.sort ?? "desc",
    apikey: apiKey,
  })
  if (input.contractAddress) {
    params.set("contractaddress", input.contractAddress)
  }

  const url = `${ETHERSCAN_V2_BASE}?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`etherscan v2 HTTP ${res.status}`)
  }

  const body = (await res.json()) as EtherscanV2Response
  if (body.status === "1" && Array.isArray(body.result)) {
    return body.result
  }
  const detail = typeof body.result === "string" ? body.result : body.message
  if (
    detail.toLowerCase().includes("no transactions found") ||
    detail.toLowerCase().includes("no record found")
  ) {
    return []
  }
  throw new Error(`etherscan v2: ${detail}`)
}

/** Latest transfer from `from` to `to` for a given token contract. */
export async function discoverTokenTransferTxHash(input: {
  chainId: number
  tokenAddress: string
  fromAddress: string
  toAddress: string
  apiKey?: string
}): Promise<string | null> {
  const rows = await fetchErc20TokenTransfers({
    chainId: input.chainId,
    address: input.fromAddress,
    contractAddress: input.tokenAddress,
    offset: 50,
    sort: "desc",
    apiKey: input.apiKey,
  })

  const from = input.fromAddress.toLowerCase()
  const to = input.toAddress.toLowerCase()
  const token = input.tokenAddress.toLowerCase()

  for (const row of rows) {
    if (
      row.from.toLowerCase() === from &&
      row.to.toLowerCase() === to &&
      row.contractAddress.toLowerCase() === token
    ) {
      return row.hash
    }
  }
  return null
}

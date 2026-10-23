/**
 * Celo network facts used by the rail. Testnet (Celo Sepolia) only: by the owner's decision this build
 * never signs or sends anything on Celo mainnet. Mainnet identifiers are listed only so the guard can
 * recognise and refuse them.
 */
import type { Address } from "viem"

export const CELO_SEPOLIA = {
  caip2: "eip155:11142220",
  chainId: 11142220,
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  explorerTx: (hash: string) => `https://celo-sepolia.blockscout.com/tx/${hash}`,
  explorerAddress: (addr: string) => `https://celo-sepolia.blockscout.com/address/${addr}`,
  facilitatorUrl: "https://api.x402.sepolia.celo.org",
  usdc: {
    address: "0x01C5C0122039549AD1493B8220cABEdD739BC44E" as Address,
    symbol: "USDC",
    name: "USDC",
    version: "2",
    decimals: 6,
  },
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address,
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address,
} as const

/** Celo mainnet CAIP-2 id. Recognised so it can be refused. */
export const CELO_MAINNET_CAIP2 = "eip155:42220"

export class MainnetDisabledError extends Error {
  constructor(network: string) {
    super(
      `celo: ${network} is mainnet; this Railguard build is Celo Sepolia testnet only (owner decision)`,
    )
    this.name = "MainnetDisabledError"
  }
}

export function assertCeloTestnet(network: string): void {
  if (network === CELO_MAINNET_CAIP2 || network === "celo" || network === "eip155:42220")
    throw new MainnetDisabledError(network)
  if (network !== CELO_SEPOLIA.caip2) throw new Error(`celo: unsupported network ${network}`)
}

export function assertCeloTestnetRpc(chainId: number): void {
  if (chainId !== CELO_SEPOLIA.chainId) throw new MainnetDisabledError(`chainId ${chainId}`)
}

/** USDC amounts: 6 decimals. */
export function usdcToAtomic(usd: string): bigint {
  const [whole, frac = ""] = usd.replace(/^\$/, "").split(".")
  return BigInt(whole || "0") * 1_000_000n + BigInt(`${frac}000000`.slice(0, 6))
}

export function atomicToUsdc(atomic: bigint): string {
  const neg = atomic < 0n
  const v = neg ? -atomic : atomic
  return `${neg ? "-" : ""}${v / 1_000_000n}.${(v % 1_000_000n).toString().padStart(6, "0")}`
}

/**
 * ERC-8004 agent identity on Celo Sepolia. Railguard uses it two ways:
 *  1. Our buyer agent registers itself (an ERC-721 agent id whose registration file names its wallet).
 *  2. Before paying a seller, Railguard resolves the seller's agent id to its on-chain agentWallet and
 *     refuses any 402 whose payTo is a different address (a changed or spoofed payee).
 */
import {
  http,
  type Address,
  type Hex,
  type LocalAccount,
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  encodeFunctionData,
  parseAbi,
  zeroAddress,
} from "viem"
import { celoSepolia } from "viem/chains"
import { CELO_SEPOLIA, assertCeloTestnetRpc } from "./chain"
import { appendAttribution, erc8021Schema0Suffix } from "./erc8021"

export const IDENTITY_REGISTRY_ABI = parseAbi([
  "function register(string agentURI) returns (uint256)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
])

export interface AgentIdentity {
  agentId: bigint
  owner: Address
  agentWallet: Address
  agentURI: string
  registry: Address
  caip10Registry: string
}

export interface IdentityResolver {
  resolve(agentId: bigint): Promise<AgentIdentity | null>
}

export function createErc8004Resolver(
  rpcUrl: string = CELO_SEPOLIA.rpcUrl,
  registry: Address = CELO_SEPOLIA.identityRegistry,
): IdentityResolver {
  const client = createPublicClient({
    chain: celoSepolia,
    transport: http(rpcUrl, { timeout: 20_000 }),
  })
  const cache = new Map<string, AgentIdentity>()
  return {
    async resolve(agentId) {
      const hit = cache.get(agentId.toString())
      if (hit) return hit
      assertCeloTestnetRpc(await client.getChainId())
      try {
        const [owner, wallet, uri] = await Promise.all([
          client.readContract({
            address: registry,
            abi: IDENTITY_REGISTRY_ABI,
            functionName: "ownerOf",
            args: [agentId],
          }),
          client
            .readContract({
              address: registry,
              abi: IDENTITY_REGISTRY_ABI,
              functionName: "getAgentWallet",
              args: [agentId],
            })
            .catch(() => zeroAddress),
          client
            .readContract({
              address: registry,
              abi: IDENTITY_REGISTRY_ABI,
              functionName: "tokenURI",
              args: [agentId],
            })
            .catch(() => ""),
        ])
        const identity: AgentIdentity = {
          agentId,
          owner,
          agentWallet: wallet === zeroAddress ? owner : wallet,
          agentURI: uri,
          registry,
          caip10Registry: `${CELO_SEPOLIA.caip2}:${registry}`,
        }
        cache.set(agentId.toString(), identity)
        return identity
      } catch {
        return null
      }
    },
  }
}

export function createStaticResolver(
  entries: Array<{ agentId: bigint; wallet: Address; uri?: string }>,
): IdentityResolver {
  return {
    async resolve(agentId) {
      const e = entries.find((x) => x.agentId === agentId)
      if (!e) return null
      return {
        agentId,
        owner: e.wallet,
        agentWallet: e.wallet,
        agentURI: e.uri ?? "",
        registry: CELO_SEPOLIA.identityRegistry,
        caip10Registry: `${CELO_SEPOLIA.caip2}:${CELO_SEPOLIA.identityRegistry}`,
      }
    },
  }
}

/** ERC-8004 registration file (agent card). */
export function buildAgentRegistration(input: {
  name: string
  description: string
  wallet: Address
  repoUrl: string
  agentId?: bigint | undefined
  services?: Array<{ name: string; endpoint: string }> | undefined
}) {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: input.name,
    description: input.description,
    image: "",
    services: [
      { name: "web", endpoint: input.repoUrl },
      { name: "agentWallet", endpoint: `${CELO_SEPOLIA.caip2}:${input.wallet}` },
      ...(input.services ?? []),
    ],
    x402Support: true,
    active: true,
    registrations:
      input.agentId !== undefined
        ? [
            {
              agentId: Number(input.agentId),
              agentRegistry: `${CELO_SEPOLIA.caip2}:${CELO_SEPOLIA.identityRegistry}`,
            },
          ]
        : [],
    supportedTrust: ["reputation"],
  }
}

export function registrationDataUri(registration: unknown): string {
  return `data:application/json;base64,${Buffer.from(JSON.stringify(registration)).toString("base64")}`
}

/** register(agentURI) calldata with the ERC-8021 attribution suffix appended (when a code is given). */
export function registerCalldata(agentURI: string, attributionCode?: string | undefined): Hex {
  const data = encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [agentURI],
  })
  return attributionCode ? appendAttribution(data, erc8021Schema0Suffix(attributionCode)) : data
}

/** Sends register() on Celo Sepolia (testnet gas only). Returns the new agent id. */
export async function registerAgentOnCeloSepolia(input: {
  account: LocalAccount
  agentURI: string
  attributionCode?: string | undefined
  rpcUrl?: string | undefined
}): Promise<{ agentId: bigint; txHash: Hex; blockNumber: bigint }> {
  const transport = http(input.rpcUrl ?? CELO_SEPOLIA.rpcUrl, { timeout: 30_000 })
  const pub = createPublicClient({ chain: celoSepolia, transport })
  assertCeloTestnetRpc(await pub.getChainId())
  const wallet = createWalletClient({ account: input.account, chain: celoSepolia, transport })
  const txHash = await wallet.sendTransaction({
    to: CELO_SEPOLIA.identityRegistry,
    data: registerCalldata(input.agentURI, input.attributionCode),
  })
  const receipt = await pub.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 })
  if (receipt.status !== "success") throw new Error(`erc8004: register reverted (${txHash})`)
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CELO_SEPOLIA.identityRegistry.toLowerCase()) continue
    try {
      const ev = decodeEventLog({ abi: IDENTITY_REGISTRY_ABI, data: log.data, topics: log.topics })
      if (ev.eventName === "Registered")
        return {
          agentId: (ev.args as { agentId: bigint }).agentId,
          txHash,
          blockNumber: receipt.blockNumber,
        }
      if (ev.eventName === "Transfer")
        return {
          agentId: (ev.args as { tokenId: bigint }).tokenId,
          txHash,
          blockNumber: receipt.blockNumber,
        }
    } catch {
      // not ours
    }
  }
  throw new Error(`erc8004: no Registered event in ${txHash}`)
}

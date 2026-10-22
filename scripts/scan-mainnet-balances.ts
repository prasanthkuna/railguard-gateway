#!/usr/bin/env bun
/** Read-only USDC + native gas scan for grant wallets on common mainnets. */
import { createPublicClient, formatUnits, http, parseAbi, type Chain } from "viem"
import { getAddress } from "viem"

const WALLETS = [
  { label: "builder", address: getAddress("0x9a3f50804306fDB12046243bDF2dB33D61dcBA2d") },
  { label: "demo-recipient", address: getAddress("0x8c7E2543Aa8bf69dc8458Dc28104234f6A334233") },
  { label: "cdp-smoke", address: getAddress("0xc2216a65E6C1320f290E50885679437AF563cB10") },
] as const

type Net = {
  name: string
  chain: Chain
  usdc?: `0x${string}`
  usdcDecimals?: number
  nativeSymbol: string
}

const NETS: Net[] = [
  {
    name: "ethereum",
    chain: {
      id: 1,
      name: "Ethereum",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://ethereum.publicnode.com"] } },
    },
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "arbitrum-one",
    chain: {
      id: 42161,
      name: "Arbitrum One",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://arb1.arbitrum.io/rpc"] } },
    },
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "base",
    chain: {
      id: 8453,
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://mainnet.base.org"] } },
    },
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "optimism",
    chain: {
      id: 10,
      name: "Optimism",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://mainnet.optimism.io"] } },
    },
    usdc: "0x0b2C639c533813c4Aa291D685007fC7048a8C89",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "polygon",
    chain: {
      id: 137,
      name: "Polygon",
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      rpcUrls: { default: { http: ["https://polygon-rpc.com"] } },
    },
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    usdcDecimals: 6,
    nativeSymbol: "POL",
  },
  {
    name: "avalanche",
    chain: {
      id: 43114,
      name: "Avalanche",
      nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
      rpcUrls: { default: { http: ["https://api.avax.network/ext/bc/C/rpc"] } },
    },
    usdc: "0xB97EF9Ef8734C71908D7058DF8dA0A664544F812",
    usdcDecimals: 6,
    nativeSymbol: "AVAX",
  },
  {
    name: "linea",
    chain: {
      id: 59144,
      name: "Linea",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.linea.build"] } },
    },
    usdc: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "scroll",
    chain: {
      id: 534352,
      name: "Scroll",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.scroll.io"] } },
    },
    usdc: "0x06eFdBFf2a14a7c8E15944D5016155949e97CC8A",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "zksync-era",
    chain: {
      id: 324,
      name: "zkSync Era",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://mainnet.era.zksync.io"] } },
    },
    usdc: "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "unichain",
    chain: {
      id: 130,
      name: "Unichain",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://mainnet.unichain.org"] } },
    },
    usdc: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
    usdcDecimals: 6,
    nativeSymbol: "ETH",
  },
  {
    name: "arc-mainnet",
    chain: {
      id: 5042,
      name: "Arc",
      nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
    },
    usdc: "0x3600000000000000000000000000000000000000",
    usdcDecimals: 6,
    nativeSymbol: "USDC",
  },
]

const abi = parseAbi(["function balanceOf(address) view returns (uint256)"])

type Row = {
  wallet: string
  network: string
  native: string
  usdc: string
  note?: string
}

const rows: Row[] = []

for (const net of NETS) {
  const client = createPublicClient({ chain: net.chain, transport: http() })
  for (const w of WALLETS) {
    try {
      const nativeBal = await client.getBalance({ address: w.address })
      let usdcHuman = "0"
      if (net.usdc) {
        const raw = await client.readContract({
          address: net.usdc,
          abi,
          functionName: "balanceOf",
          args: [w.address],
        })
        usdcHuman = formatUnits(raw, net.usdcDecimals ?? 6)
      }
      const nativeHuman =
        net.name === "arc-mainnet"
          ? `${formatUnits(nativeBal, 18)} USDC(gas)`
          : `${formatUnits(nativeBal, 18)} ${net.nativeSymbol}`

      const usdcN = Number(usdcHuman)
      const nativeN = Number(formatUnits(nativeBal, 18))
      if (usdcN > 0.000001 || nativeN > 0.0000001) {
        rows.push({
          wallet: w.label,
          network: net.name,
          native: nativeHuman,
          usdc: usdcHuman,
        })
      }
    } catch (e) {
      rows.push({
        wallet: w.label,
        network: net.name,
        native: "?",
        usdc: "?",
        note: String(e).slice(0, 80),
      })
    }
  }
}

console.log(JSON.stringify({ scannedAt: new Date().toISOString(), nonzero: rows }, null, 2))

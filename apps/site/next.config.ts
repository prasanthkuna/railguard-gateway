import type { NextConfig } from "next"

const operatorUrl = process.env.NEXT_PUBLIC_OPERATOR_URL || "https://prebroadcast.vercel.app"

const nextConfig: NextConfig = {
  transpilePackages: ["@railguard/brand"],
  async redirects() {
    return [
      { source: "/app", destination: `${operatorUrl}/`, permanent: false },
      { source: "/operator", destination: operatorUrl, permanent: false },
      // v2 information architecture: old routes keep working.
      { source: "/attack", destination: "/demo", permanent: true },
      { source: "/r/:id", destination: "/demo#receipt", permanent: true },
      { source: "/ecosystems", destination: "/proof", permanent: true },
      { source: "/ecosystems/failure-lab", destination: "/demo", permanent: true },
      { source: "/ecosystems/:id", destination: "/proof#:id", permanent: true },
      { source: "/proof/metal", destination: "/proof/metal-testnet", permanent: true },
    ]
  },
}

export default nextConfig

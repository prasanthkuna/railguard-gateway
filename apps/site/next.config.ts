import type { NextConfig } from "next"

const operatorUrl = process.env.NEXT_PUBLIC_OPERATOR_URL || "https://prebroadcast.vercel.app"

const nextConfig: NextConfig = {
  transpilePackages: ["@railguard/brand"],
  async redirects() {
    return [
      { source: "/app", destination: `${operatorUrl}/`, permanent: false },
      { source: "/operator", destination: operatorUrl, permanent: false },
    ]
  },
}

export default nextConfig

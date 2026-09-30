/** Strip secrets from RPC URLs before writing evidence manifests. */
export function redactRpcUrlForEvidence(rpcUrl: string, publicDefault: string): string {
  try {
    const u = new URL(rpcUrl)
    if (u.username || u.password) return publicDefault
    for (const key of u.searchParams.keys()) {
      const k = key.toLowerCase()
      if (k.includes("key") || k.includes("token") || k.includes("secret")) {
        return publicDefault
      }
    }
    if (/alchemy\.com|infura\.io|quicknode\.com|ankr\.com/i.test(u.hostname) && u.pathname.length > 1) {
      return publicDefault
    }
    return rpcUrl
  } catch {
    return publicDefault
  }
}

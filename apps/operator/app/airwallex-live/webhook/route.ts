import { NextResponse } from "next/server"
import { handleLiveWebhook } from "../../../lib/airwallexLiveRunner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Airwallex sandbox webhook endpoint: verify the raw body signature, then relay (signed) to the API. */
export async function POST(req: Request) {
  const rawBody = await req.text()
  if (rawBody.length > 256_000) return NextResponse.json({ accepted: false }, { status: 413 })
  const out = await handleLiveWebhook(rawBody, req.headers)
  return NextResponse.json(out.body, { status: out.status })
}

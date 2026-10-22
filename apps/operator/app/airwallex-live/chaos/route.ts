import { NextResponse } from "next/server"
import { runLiveChaos } from "../../../lib/airwallexLiveRunner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

/** Live Airwallex SANDBOX chaos run: timeout after create, agent retry, reconcile, one transfer. */
export async function POST(req: Request) {
  try {
    const out = await runLiveChaos(req.headers.get("x-railguard-operator-token"))
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: out.status })
    return NextResponse.json(out)
  } catch (error) {
    return NextResponse.json(
      { error: `Live run failed: ${(error as Error).message}`.slice(0, 300) },
      { status: 502 },
    )
  }
}

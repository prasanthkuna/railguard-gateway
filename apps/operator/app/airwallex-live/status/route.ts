import { NextResponse } from "next/server"
import {
  OPERATOR_LIVE_RUNS_PER_HOUR,
  PUBLIC_LIVE_RUNS_PER_HOUR,
  liveConfig,
} from "../../../lib/airwallexLiveRunner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Which live pieces are configured (booleans only, never values). */
export async function GET() {
  const cfg = liveConfig()
  return NextResponse.json({
    configured: cfg.configured,
    sandboxHost: cfg.baseUrlHost,
    gemini: cfg.gemini,
    relay: cfg.relay,
    webhookSecret: cfg.webhookSecret,
    publicRunsPerHour: PUBLIC_LIVE_RUNS_PER_HOUR,
    operatorRunsPerHour: OPERATOR_LIVE_RUNS_PER_HOUR,
  })
}

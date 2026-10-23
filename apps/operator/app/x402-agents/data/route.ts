import { NextResponse } from "next/server"
import { recordedKit11Run } from "../../../lib/kit11"

export const runtime = "nodejs"

/** The recorded Metal testnet + Airwallex sandbox run (public, non-secret evidence). */
export async function GET() {
  return NextResponse.json(recordedKit11Run())
}

import { NextResponse } from "next/server"
import { allowSimRun, runSimulatedKit11 } from "../../../lib/kit11"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/** Simulated Kit 11 run: same Railguard code as the Metal testnet run, in-memory chain and bank. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (!allowSimRun(ip))
    return NextResponse.json(
      { error: "Too many runs from this address; try again later." },
      { status: 429 },
    )
  let body: { approve?: boolean; lostAnswer?: boolean; useModel?: boolean } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {}
  try {
    const out = await runSimulatedKit11({
      approve: body.approve !== false,
      lostAnswer: body.lostAnswer === true,
      useModel: body.useModel !== false,
    })
    return NextResponse.json(out)
  } catch (error) {
    return NextResponse.json(
      { error: `Run failed: ${(error as Error).message}`.slice(0, 300) },
      { status: 500 },
    )
  }
}

/** Offline agent + policy demo on the simulator (public, deterministic, no keys, no money). */
import {
  type AgentMessage,
  type AgentTranscriptStep,
  type PaymentOpsModel,
  createPaymentOpsToolbox,
  createScriptedPaymentOpsModel,
  runPaymentOpsAgent,
} from "./agent"
import { chaosPayees } from "./chaos"
import { createAirwallexClient } from "./client"
import { createIncidentCommander } from "./incidentCommander"
import { createPayoutPolicyGuard } from "./policy"
import { createAirwallexExecutionRail } from "./rail"
import { createAirwallexSimulator } from "./simulator"

export interface AgentDemoStep {
  id: string
  title: string
  request: string
  outcome: string
  code?: string | undefined
  transcript: AgentTranscriptStep[]
}

export interface AgentPolicyDemoResult {
  mode: "simulated"
  model: string
  generatedAt: string
  policy: {
    approvalThreshold: number
    perPayeeDailyCap: number
    dailyCap: number
    newPayeeHoldHours: number
    version: string
  }
  steps: AgentDemoStep[]
  transfersCreated: number
}

function simulatedStack(model: PaymentOpsModel, start: Date) {
  let clock = start.getTime()
  const now = () => new Date(clock)
  const sim = createAirwallexSimulator({ now })
  const client = createAirwallexClient({
    credentials: { clientId: "sim", apiKey: "sim" },
    fetch: sim.fetch,
    now: () => clock,
  })
  const rail = createAirwallexExecutionRail({ client, now })
  const commander = createIncidentCommander({ rail, now })
  const guard = createPayoutPolicyGuard({ payees: chaosPayees("sim_beneficiary_acme", now()), now })
  const toolbox = createPaymentOpsToolbox({ guard, commander, rail })
  return {
    sim,
    rail,
    commander,
    guard,
    toolbox,
    model,
    advance: (ms: number) => {
      clock += ms
    },
  }
}

function lastResult(transcript: AgentTranscriptStep[]) {
  return [...transcript]
    .reverse()
    .find((s) => s.kind === "tool_result" && s.tool === "create_payout")?.result
}

/** Human-in-the-loop story: approval, caps, new-payee hold, unknown payee, sneaky re-pay. */
export async function runAgentPolicyDemo(
  model: PaymentOpsModel = createScriptedPaymentOpsModel(),
  start = new Date(),
): Promise<AgentPolicyDemoResult> {
  const stack = simulatedStack(model, start)
  const steps: AgentDemoStep[] = []
  const history: AgentMessage[] = []

  async function ask(id: string, title: string, request: string) {
    const transcript: AgentTranscriptStep[] = []
    await runPaymentOpsAgent({ model, toolbox: stack.toolbox, history, request, transcript })
    const result = lastResult(transcript) ?? {}
    const step: AgentDemoStep = {
      id,
      title,
      request,
      outcome: String(result.status ?? "NONE"),
      code: typeof result.code === "string" ? result.code : undefined,
      transcript,
    }
    steps.push(step)
    return { step, result }
  }

  const first = await ask("1", "Over the approval threshold", "Pay Acme $1,200 for invoice 42")
  const key = first.result.approval_key
  if (typeof key === "string") {
    stack.guard.approve(key, "finance@railguard.demo (human)")
    first.step.transcript.push({
      kind: "system",
      text: `Human approver signed ${key} for exactly 1200.00 USD to Acme Supplies, invoice 42. The agent has no tool that can do this.`,
    })
  }
  await ask("2", "Same terms, after human approval", "Pay Acme $1,200 for invoice 42")
  stack.advance(60_000)
  await ask("3", "Sneaky re-pay of invoice 42 under the threshold", "Pay Acme $999 for invoice 42")
  await ask("4", "Per-payee daily cap", "Pay Acme $1,500 for invoice 43")
  await ask("5", "New payee hold", "Pay Globex $300 for invoice 7")
  await ask("6", "Payee not in the directory", "Pay Initech $50 for invoice 9")

  return {
    mode: "simulated",
    model: model.name,
    generatedAt: new Date().toISOString(),
    policy: {
      approvalThreshold: stack.guard.config.approvalThreshold,
      perPayeeDailyCap: stack.guard.config.perPayeeDailyCap,
      dailyCap: stack.guard.config.dailyCap,
      newPayeeHoldHours: stack.guard.config.newPayeeHoldMs / 3_600_000,
      version: stack.guard.config.version,
    },
    steps,
    transfersCreated: stack.sim.transfers().length,
  }
}

/** One free-form request against a fresh simulated stack. `approvals` come from the human UI only. */
export async function runSimulatedAgentRequest(input: {
  request: string
  approvals?: string[] | undefined
  model?: PaymentOpsModel | undefined
}) {
  const model = input.model ?? createScriptedPaymentOpsModel()
  const stack = simulatedStack(model, new Date())
  for (const key of input.approvals ?? []) {
    try {
      stack.guard.approve(key, "operator (human, simulated)")
    } catch {
      // ignore malformed keys
    }
  }
  const transcript: AgentTranscriptStep[] = []
  const { reply } = await runPaymentOpsAgent({
    model,
    toolbox: stack.toolbox,
    history: [],
    request: input.request.slice(0, 300),
    transcript,
  })
  return {
    mode: "simulated" as const,
    model: model.name,
    reply,
    transcript,
    transfersCreated: stack.sim.transfers().length,
  }
}

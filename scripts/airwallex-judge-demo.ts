/**
 * Airwallex Track 3 judge demo: one command, no keys, no network, about 1 second.
 *   bun scripts/airwallex-judge-demo.ts
 * Runs the Payment Ops Incident Commander on the in-memory Airwallex simulator and prints the three
 * numbers that matter: transfers created, create calls sent, retries blocked. Exits 1 if any
 * scenario would have paid twice.
 */
import {
  runAgentPolicyDemo,
  runAirwallexIncidentDemo,
  runChaosTimeout,
} from "../packages/kernel/src/adapters/airwallex"

const line = (s = "") => console.log(s)
let ok = true

line("Railguard x Airwallex - Payment Ops Incident Commander (simulated sandbox, fake money)")
line("=".repeat(84))

const chaos = await runChaosTimeout({ mode: "simulated" })
line("1) Chaos: the create reaches Airwallex, the response is dropped, the agent pays again,")
line("   and a queue redelivers the job.")
line(`   request_id ............ ${chaos.requestId}`)
line(`   transfers created ..... ${chaos.airwallexTransfersCreated}`)
line(`   create calls sent ..... ${chaos.createCalls}`)
line(`   retries blocked ....... ${chaos.retriesBlocked}`)
line(`   final label ........... ${chaos.label} (via ${chaos.confirmation})`)
line(`   forged webhook ........ ${chaos.forgedWebhook.accepted ? "ACCEPTED (bad)" : `rejected (${chaos.forgedWebhook.reason})`}`)
if (chaos.airwallexTransfersCreated !== 1 || chaos.createCalls !== 1 || !chaos.ok) ok = false
line()

const demo = await runAirwallexIncidentDemo()
line("2) Incident scenarios")
for (const s of demo.scenarios) {
  line(`   ${s.id}. ${s.title}`)
  line(`      transfers created ${s.airwallexTransfersCreated}, create calls ${s.createCallsSent}, incident ${s.incident.status}`)
  if (s.airwallexTransfersCreated !== 1) ok = false
}
line(`   Forged webhook: ${demo.webhookRejection.accepted ? "ACCEPTED (bad)" : `rejected (${demo.webhookRejection.reason})`}`)
if (demo.webhookRejection.accepted) ok = false
line()

const policy = await runAgentPolicyDemo()
line(`3) Payment-ops agent + policy guard (model: ${policy.model})`)
for (const s of policy.steps) line(`   - ${s.title}: ${s.outcome}${s.code ? ` [${s.code}]` : ""}`)
line(`   transfers created by the agent: ${policy.transfersCreated}`)
line()
line(ok ? "PASS: no scenario paid twice." : "FAIL: a scenario created more than one transfer.")
process.exit(ok ? 0 : 1)

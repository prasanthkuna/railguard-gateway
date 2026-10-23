import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { checkQuote, parseChallenge, policyFromEnv, type GuardResult } from "./guard.js";
import { proposeX402, x402OutputSchema } from "./paybox.js";

const PROTOCOL_VERSION = "2026-07-28";
const endpoint = z.url().max(2048);
const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

async function quoteAndCheck(url: string, purpose: string, expectedPayTo?: string): Promise<GuardResult> {
  const policy = policyFromEnv(process.env);
  // Host allowlist first: never contact a host the owner did not allow.
  const pre = await checkQuote({ url, purpose, policy, challengeError: { code: "QUOTE_INVALID", detail: "pending" } });
  if (pre.decision === "DENY" && pre.code === "HOST_NOT_ALLOWED") return pre;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal, redirect: "error" });
    const parsed = parseChallenge({
      status: res.status,
      headerPaymentRequired: res.headers.get("payment-required"),
      bodyText: await res.text(),
    });
    return parsed.ok
      ? checkQuote({ url, purpose, policy, quote: parsed.quote, expectedPayTo })
      : checkQuote({ url, purpose, policy, challengeError: parsed });
  } catch (err) {
    return checkQuote({ url, purpose, policy, challengeError: { code: "QUOTE_INVALID", detail: `quote fetch failed: ${(err as Error).name}` } });
  } finally {
    clearTimeout(timer);
  }
}

const decisionSchema = z
  .object({
    decision: z.enum(["ALLOW", "DENY"]),
    requestId: z.string(),
    code: z.string().optional(),
    detail: z.string().optional(),
    quotedAmountAtomic: z.string().optional(),
    payTo: z.string().optional(),
  })
  .strict();

function createServer() {
  const server = new McpServer(
    { name: "railguard-guard", version: "0.1.0" },
    { supportedProtocolVersions: [PROTOCOL_VERSION] },
  );

  server.registerTool(
    "railguard_policy",
    {
      title: "Show spend policy",
      description: "Shows the owner's Railguard policy for paid requests: allowed hosts and the per-call cap in atomic USDC (1 USDC = 1000000).",
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({ allowedHosts: z.array(z.string()), perCallCapAtomic: z.string() }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const p = policyFromEnv(process.env);
      const out = { allowedHosts: p.allowedHosts, perCallCapAtomic: p.perCallCap.toString() };
      return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out };
    },
  );

  server.registerTool(
    "check_paid_request",
    {
      title: "Check a paid API before paying",
      description: "Fetches the endpoint's unpaid x402 quote and checks it against the owner's policy (allowed host, USDC on Base, per-call cap, expected payee). Never pays.",
      inputSchema: z.object({ endpoint, purpose: z.string().min(3).max(200), expectedPayTo: evmAddress.optional() }).strict(),
      outputSchema: decisionSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ endpoint: url, purpose, expectedPayTo }) => {
      const r = await quoteAndCheck(url, purpose, expectedPayTo);
      const out =
        r.decision === "ALLOW"
          ? { decision: r.decision, requestId: r.requestId, quotedAmountAtomic: r.quote.amount, payTo: r.quote.payTo }
          : { decision: r.decision, requestId: r.requestId, code: r.code, detail: r.detail };
      return { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out };
    },
  );

  server.registerTool(
    "propose_guarded_paid_request",
    {
      title: "Propose a paid API request (guarded)",
      description: "Checks the x402 quote against the owner's policy, then proposes paying exactly the quoted USDC on Base. If the price changes before you approve, PayBox will not pay it. Denied requests return the reason and no proposal.",
      inputSchema: z.object({ endpoint, purpose: z.string().min(3).max(200), expectedPayTo: evmAddress.optional() }).strict(),
      outputSchema: x402OutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ endpoint: url, purpose, expectedPayTo }) => {
      const r = await quoteAndCheck(url, purpose, expectedPayTo);
      if (r.decision === "DENY") {
        return {
          isError: true,
          content: [{ type: "text", text: `Railguard denied this payment: ${r.code}. ${r.detail}. Nothing was proposed or paid.` }],
        };
      }
      return proposeX402({ chain: "eip155:8453", url, maxAmount: r.quote.amount });
    },
  );

  return server;
}

serveStdio(createServer, { legacy: "reject" });

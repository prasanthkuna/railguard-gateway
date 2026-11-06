/**
 * Real x402 client implementation using official @x402/core and @x402/hedera libraries.
 * Connects to x402.org/facilitator for Hedera testnet payments.
 */
import { HTTPFacilitatorClient } from "@x402/core/http"
import { x402HTTPClient, x402Client } from "@x402/core/client"
import { ExactHederaScheme } from "@x402/hedera/exact/client"
import type { ClientHederaSigner } from "@x402/hedera"
import { PrivateKey } from "@hiero-ledger/sdk"

export interface X402RealClientConfig {
	/** Hedera account ID for the payer */
	accountId: string
	/** Private key for signing transactions (testnet only) */
	privateKey: string
	/** Optional facilitator URL (defaults to x402.org) */
	facilitatorUrl?: string
	/** Optional network (defaults to hedera:testnet) */
	network?: string
}

/**
 * Creates a real x402 HTTP client that handles 402 payment challenges.
 * Uses the official x402 libraries with Hedera Exact scheme.
 */
export function createX402RealClient(config: X402RealClientConfig): x402HTTPClient {
	// Create Hedera signer
	const signer = createHederaSigner(config.accountId, config.privateKey, config.network)

	// Create Hedera scheme client
	const hederaScheme = new ExactHederaScheme(signer)

	// Create base x402 client with Hedera scheme
	// The client communicates payment requirements to schemes; it does not directly use facilitators
	const baseClient = new x402Client()
		.register(config.network ?? "hedera:testnet", hederaScheme)
		// Disable spend controls for testnet (in production, set proper limits)
		.setSpendControls(false)

	// Create HTTP client wrapper
	const httpClient = new x402HTTPClient(baseClient)

	return httpClient
}

/**
 * Creates a minimal Hedera signer for the client.
 */
function createHederaSigner(accountId: string, privateKeyStr: string, network?: string): ClientHederaSigner {
	const privateKey = PrivateKey.fromStringED25519(privateKeyStr)

	return {
		accountId,
		async createPartiallySignedTransferTransaction(requirements) {
			// Import from @hiero-ledger/sdk to create the transfer transaction
			const { TransferTransaction, AccountId, Client, Hbar } = await import("@hiero-ledger/sdk")

			// Create client for the network
			const client = network === "hedera:mainnet" ? Client.forMainnet() : Client.forTestnet()
			client.setOperator(AccountId.fromString(accountId), privateKey)

			try {
				// Create transfer transaction based on asset type
				let transaction: typeof TransferTransaction.prototype

				if (requirements.asset === "0.0.0") {
					// HBAR transfer
					const amount = BigInt(requirements.amount)
					transaction = new TransferTransaction()
						.addHbarTransfer(accountId, Hbar.fromTinybars(-amount))
						.addHbarTransfer(requirements.payTo, Hbar.fromTinybars(amount))
				} else {
					// HTS token transfer
					const tokenId = requirements.asset
					const amount = BigInt(requirements.amount)
					transaction = new TransferTransaction()
						.addTokenTransfer(tokenId, accountId, -amount)
						.addTokenTransfer(tokenId, requirements.payTo, amount)
				}

				// Freeze and sign the transaction
				transaction.freezeWith(client)
				await transaction.sign(privateKey)

				// Serialize to base64
				const transactionBytes = transaction.toBytes()
				return Buffer.from(transactionBytes).toString("base64")
			} finally {
				client.close()
			}
		},
	}
}

/**
 * Fetches a protected resource using x402 payment flow.
 */
export async function fetchX402Resource(
	client: x402HTTPClient,
	url: string,
	init?: RequestInit,
): Promise<{
	status: number
	body: unknown
	paid: boolean
	transactionId?: string
}> {
	// Initial fetch - may return 402
	let response = await fetch(url, init)

	// If not 402, return directly
	if (response.status !== 402) {
		return {
			status: response.status,
			body: await parseBody(response),
			paid: false,
		}
	}

	// Parse payment required from 402 response
	const paymentRequired = client.getPaymentRequiredResponse(
		(name) => response.headers.get(name),
		await response.clone().json(),
	)

	// Create payment payload
	const paymentPayload = await client.createPaymentPayload(paymentRequired)

	// Encode payment signature header
	const paymentHeaders = client.encodePaymentSignatureHeader(paymentPayload)

	// Retry with payment
	response = await fetch(url, {
		...init,
		headers: {
			...(init?.headers || {}),
			...paymentHeaders,
		},
	})

	// Process payment result
	const paymentResult = await client.processPaymentResult(
		paymentPayload,
		(name) => response.headers.get(name),
		response.status,
	)

	// Extract transaction ID from payload
	const transactionId =
		typeof paymentPayload.payload === "object" &&
		paymentPayload.payload !== null &&
		"transactionId" in paymentPayload.payload
			? String(paymentPayload.payload.transactionId)
			: undefined

	return {
		status: response.status,
		body: await parseBody(response),
		paid: true,
		transactionId,
	}
}

async function parseBody(response: Response): Promise<unknown> {
	const contentType = response.headers.get("content-type") || ""
	if (contentType.includes("application/json")) {
		return response.json()
	}
	return response.text()
}

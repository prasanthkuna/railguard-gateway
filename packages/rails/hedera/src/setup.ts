/**
 * Hedera testnet setup utilities
 * Create accounts, topics, and configure test environment
 */

import {
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  TopicCreateTransaction,
} from "@hashgraph/sdk"

export interface HederaTestnetAccount {
  accountId: string
  privateKey: string
  publicKey: string
}

export interface HederaTopicInfo {
  topicId: string
  memo: string
}

/**
 * Create a new Hedera testnet account
 * Requires an existing funded account to pay for creation
 */
export async function createTestnetAccount(params: {
  /** Existing account that will pay for account creation */
  operatorAccountId: string
  operatorPrivateKey: string
  /** Initial balance in HBAR */
  initialBalance?: number
}): Promise<HederaTestnetAccount> {
  const client = Client.forTestnet()
  const operatorKey = PrivateKey.fromStringED25519(params.operatorPrivateKey)
  const operatorId = AccountId.fromString(params.operatorAccountId)
  client.setOperator(operatorId, operatorKey)

  try {
    // Generate new key pair
    const newPrivateKey = PrivateKey.generateED25519()
    const newPublicKey = newPrivateKey.publicKey

    // Create account
    const transaction = new AccountCreateTransaction()
      .setKey(newPublicKey)
      .setInitialBalance(new Hbar(params.initialBalance ?? 10))

    const response = await transaction.execute(client)
    const receipt = await response.getReceipt(client)

    if (!receipt.accountId) {
      throw new Error("Account creation failed: no account ID in receipt")
    }

    return {
      accountId: receipt.accountId.toString(),
      privateKey: newPrivateKey.toStringDer(),
      publicKey: newPublicKey.toStringDer(),
    }
  } finally {
    client.close()
  }
}

/**
 * Create a new HCS topic for audit logging
 */
export async function createAuditTopic(params: {
  accountId: string
  privateKey: string
  memo?: string
}): Promise<HederaTopicInfo> {
  const client = Client.forTestnet()
  const operatorKey = PrivateKey.fromStringED25519(params.privateKey)
  const operatorId = AccountId.fromString(params.accountId)
  client.setOperator(operatorId, operatorKey)

  try {
    const transaction = new TopicCreateTransaction().setTopicMemo(
      params.memo ?? "Railguard HCS Audit Log",
    )

    const response = await transaction.execute(client)
    const receipt = await response.getReceipt(client)

    if (!receipt.topicId) {
      throw new Error("Topic creation failed: no topic ID in receipt")
    }

    return {
      topicId: receipt.topicId.toString(),
      memo: params.memo ?? "Railguard HCS Audit Log",
    }
  } finally {
    client.close()
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(params: {
  accountId: string
  privateKey: string
}): Promise<{ hbar: string; tokens: Record<string, string> }> {
  const client = Client.forTestnet()
  const operatorKey = PrivateKey.fromStringED25519(params.privateKey)
  const operatorId = AccountId.fromString(params.accountId)
  client.setOperator(operatorId, operatorKey)

  try {
    const balance = await client.getAccountBalance(operatorId)

    const tokens: Record<string, string> = {}
    for (const [tokenId, amount] of balance.tokens._map) {
      tokens[tokenId.toString()] = amount.toString()
    }

    return {
      hbar: balance.hbars.toString(),
      tokens,
    }
  } finally {
    client.close()
  }
}

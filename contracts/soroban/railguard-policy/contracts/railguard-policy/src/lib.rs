#![no_std]
//! Railguard policy contract for Soroban.
//!
//! An operator (admin) sets a per-agent budget for one asset, then grants
//! single payment intents. Each intent is bound to recipient, asset and amount
//! and gets a deterministic request id: sha256(XDR(agent, recipient, asset,
//! amount, nonce)). The agent can only execute a granted intent with the exact
//! same fields, exactly once. Duplicates, replays, field mismatches and
//! over-budget grants are rejected on-chain.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, xdr::ToXdr, Address,
    BytesN, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    NoBudget = 2,
    BudgetExceeded = 3,
    DuplicateRequest = 4,
    UnknownRequest = 5,
    IntentMismatch = 6,
    AlreadyExecuted = 7,
    Revoked = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Budget(Address, Address),
    Grant(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Budget {
    pub limit: i128,
    pub reserved: i128,
    pub spent: i128,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum GrantStatus {
    Granted = 0,
    Executed = 1,
    Revoked = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Grant {
    pub agent: Address,
    pub recipient: Address,
    pub asset: Address,
    pub amount: i128,
    pub nonce: u64,
    pub status: GrantStatus,
}

#[contractevent(topics = ["rg_grant"])]
pub struct Granted {
    #[topic]
    pub agent: Address,
    pub request_id: BytesN<32>,
    pub amount: i128,
}

#[contractevent(topics = ["rg_exec"])]
pub struct Executed {
    #[topic]
    pub agent: Address,
    pub request_id: BytesN<32>,
    pub recipient: Address,
    pub asset: Address,
    pub amount: i128,
}

#[contractevent(topics = ["rg_revoke"])]
pub struct RevokedEvt {
    #[topic]
    pub agent: Address,
    pub request_id: BytesN<32>,
}

const DAY_LEDGERS: u32 = 17_280;
const TTL_EXTEND: u32 = 30 * DAY_LEDGERS;
const TTL_THRESHOLD: u32 = 7 * DAY_LEDGERS;

#[contract]
pub struct RailguardPolicy;

fn admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

fn bump(env: &Env, key: &DataKey) {
    env.storage().persistent().extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND);
}

fn compute_request_id(
    env: &Env,
    agent: &Address,
    recipient: &Address,
    asset: &Address,
    amount: i128,
    nonce: u64,
) -> BytesN<32> {
    let payload = (agent.clone(), recipient.clone(), asset.clone(), amount, nonce).to_xdr(env);
    env.crypto().sha256(&payload).to_bytes()
}

#[contractimpl]
impl RailguardPolicy {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn admin(env: Env) -> Address {
        admin(&env)
    }

    /// Deterministic request id for an intent (pure, no storage).
    pub fn request_id(
        env: Env,
        agent: Address,
        recipient: Address,
        asset: Address,
        amount: i128,
        nonce: u64,
    ) -> BytesN<32> {
        compute_request_id(&env, &agent, &recipient, &asset, amount, nonce)
    }

    /// Admin sets (or resets the limit of) an agent's budget for one asset.
    pub fn set_budget(env: Env, agent: Address, asset: Address, limit: i128) -> Result<(), Error> {
        admin(&env).require_auth();
        if limit < 0 {
            return Err(Error::InvalidAmount);
        }
        let key = DataKey::Budget(agent, asset);
        let mut b: Budget = env.storage().persistent().get(&key).unwrap_or(Budget {
            limit: 0,
            reserved: 0,
            spent: 0,
        });
        b.limit = limit;
        env.storage().persistent().set(&key, &b);
        bump(&env, &key);
        env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
        Ok(())
    }

    pub fn budget(env: Env, agent: Address, asset: Address) -> Option<Budget> {
        env.storage().persistent().get(&DataKey::Budget(agent, asset))
    }

    /// Admin grants one intent. Reserves budget. Same intent twice is rejected.
    pub fn grant(
        env: Env,
        agent: Address,
        recipient: Address,
        asset: Address,
        amount: i128,
        nonce: u64,
    ) -> Result<BytesN<32>, Error> {
        admin(&env).require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let id = compute_request_id(&env, &agent, &recipient, &asset, amount, nonce);
        let gkey = DataKey::Grant(id.clone());
        if env.storage().persistent().has(&gkey) {
            return Err(Error::DuplicateRequest);
        }
        let bkey = DataKey::Budget(agent.clone(), asset.clone());
        let mut b: Budget = env.storage().persistent().get(&bkey).ok_or(Error::NoBudget)?;
        let committed = b.spent.checked_add(b.reserved).ok_or(Error::BudgetExceeded)?;
        let after = committed.checked_add(amount).ok_or(Error::BudgetExceeded)?;
        if after > b.limit {
            return Err(Error::BudgetExceeded);
        }
        b.reserved += amount;
        env.storage().persistent().set(&bkey, &b);
        bump(&env, &bkey);
        let g = Grant {
            agent: agent.clone(),
            recipient,
            asset,
            amount,
            nonce,
            status: GrantStatus::Granted,
        };
        env.storage().persistent().set(&gkey, &g);
        bump(&env, &gkey);
        Granted { agent, request_id: id.clone(), amount }.publish(&env);
        Ok(id)
    }

    pub fn get_grant(env: Env, request_id: BytesN<32>) -> Option<Grant> {
        env.storage().persistent().get(&DataKey::Grant(request_id))
    }

    /// Agent executes a granted intent. Fields must match the grant exactly.
    /// Moves `amount` of `asset` from agent to recipient, once.
    pub fn execute(
        env: Env,
        request_id: BytesN<32>,
        recipient: Address,
        asset: Address,
        amount: i128,
    ) -> Result<(), Error> {
        let gkey = DataKey::Grant(request_id.clone());
        let mut g: Grant = env.storage().persistent().get(&gkey).ok_or(Error::UnknownRequest)?;
        g.agent.require_auth();
        match g.status {
            GrantStatus::Executed => return Err(Error::AlreadyExecuted),
            GrantStatus::Revoked => return Err(Error::Revoked),
            GrantStatus::Granted => {}
        }
        if g.recipient != recipient || g.asset != asset || g.amount != amount {
            return Err(Error::IntentMismatch);
        }
        let bkey = DataKey::Budget(g.agent.clone(), g.asset.clone());
        let mut b: Budget = env.storage().persistent().get(&bkey).ok_or(Error::NoBudget)?;
        // Effects before interaction.
        b.reserved -= amount;
        b.spent += amount;
        env.storage().persistent().set(&bkey, &b);
        g.status = GrantStatus::Executed;
        env.storage().persistent().set(&gkey, &g);
        bump(&env, &gkey);
        token::Client::new(&env, &asset).transfer(&g.agent, &recipient, &amount);
        Executed {
            agent: g.agent,
            request_id,
            recipient,
            asset,
            amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Admin revokes an unexecuted grant and releases its reservation.
    pub fn revoke(env: Env, request_id: BytesN<32>) -> Result<(), Error> {
        admin(&env).require_auth();
        let gkey = DataKey::Grant(request_id.clone());
        let mut g: Grant = env.storage().persistent().get(&gkey).ok_or(Error::UnknownRequest)?;
        match g.status {
            GrantStatus::Executed => return Err(Error::AlreadyExecuted),
            GrantStatus::Revoked => return Err(Error::Revoked),
            GrantStatus::Granted => {}
        }
        let bkey = DataKey::Budget(g.agent.clone(), g.asset.clone());
        let mut b: Budget = env.storage().persistent().get(&bkey).ok_or(Error::NoBudget)?;
        b.reserved -= g.amount;
        env.storage().persistent().set(&bkey, &b);
        g.status = GrantStatus::Revoked;
        env.storage().persistent().set(&gkey, &g);
        RevokedEvt { agent: g.agent, request_id }.publish(&env);
        Ok(())
    }
}

mod test;

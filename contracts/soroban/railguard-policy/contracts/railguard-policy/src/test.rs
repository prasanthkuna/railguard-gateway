#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, Address, Env};

struct Setup {
    env: Env,
    client: RailguardPolicyClient<'static>,
    admin: Address,
    agent: Address,
    recipient: Address,
    asset: Address,
}

fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let recipient = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let asset = sac.address();
    StellarAssetClient::new(&env, &asset).mint(&agent, &1_000_0000000);
    let id = env.register(RailguardPolicy, (&admin,));
    let client = RailguardPolicyClient::new(&env, &id);
    Setup { env, client, admin, agent, recipient, asset }
}

fn balance(s: &Setup, who: &Address) -> i128 {
    token::Client::new(&s.env, &s.asset).balance(who)
}

#[test]
fn admin_is_set_by_constructor() {
    let s = setup();
    assert_eq!(s.client.admin(), s.admin);
}

#[test]
fn request_id_is_deterministic_and_field_sensitive() {
    let s = setup();
    let a = s.client.request_id(&s.agent, &s.recipient, &s.asset, &10, &1);
    let b = s.client.request_id(&s.agent, &s.recipient, &s.asset, &10, &1);
    assert_eq!(a, b);
    assert_ne!(a, s.client.request_id(&s.agent, &s.recipient, &s.asset, &11, &1));
    assert_ne!(a, s.client.request_id(&s.agent, &s.recipient, &s.asset, &10, &2));
    assert_ne!(a, s.client.request_id(&s.agent, &s.agent, &s.asset, &10, &1));
}

#[test]
fn grant_returns_request_id_and_reserves_budget() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    let id = s.client.grant(&s.agent, &s.recipient, &s.asset, &40, &1);
    assert_eq!(id, s.client.request_id(&s.agent, &s.recipient, &s.asset, &40, &1));
    let b = s.client.budget(&s.agent, &s.asset).unwrap();
    assert_eq!((b.limit, b.reserved, b.spent), (100, 40, 0));
    assert_eq!(s.client.get_grant(&id).unwrap().status, GrantStatus::Granted);
}

#[test]
fn duplicate_grant_is_rejected() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    s.client.grant(&s.agent, &s.recipient, &s.asset, &10, &7);
    let r = s.client.try_grant(&s.agent, &s.recipient, &s.asset, &10, &7);
    assert_eq!(r, Err(Ok(Error::DuplicateRequest)));
    assert_eq!(s.client.budget(&s.agent, &s.asset).unwrap().reserved, 10);
}

#[test]
fn grant_without_budget_is_rejected() {
    let s = setup();
    let r = s.client.try_grant(&s.agent, &s.recipient, &s.asset, &10, &1);
    assert_eq!(r, Err(Ok(Error::NoBudget)));
}

#[test]
fn over_budget_grant_is_rejected_including_reservations() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    s.client.grant(&s.agent, &s.recipient, &s.asset, &60, &1);
    let r = s.client.try_grant(&s.agent, &s.recipient, &s.asset, &41, &2);
    assert_eq!(r, Err(Ok(Error::BudgetExceeded)));
    s.client.grant(&s.agent, &s.recipient, &s.asset, &40, &3);
}

#[test]
fn invalid_amounts_are_rejected() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    assert_eq!(s.client.try_grant(&s.agent, &s.recipient, &s.asset, &0, &1), Err(Ok(Error::InvalidAmount)));
    assert_eq!(s.client.try_grant(&s.agent, &s.recipient, &s.asset, &-5, &1), Err(Ok(Error::InvalidAmount)));
    assert_eq!(s.client.try_set_budget(&s.agent, &s.asset, &-1), Err(Ok(Error::InvalidAmount)));
}

#[test]
fn execute_moves_funds_once_and_records_spend() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    let id = s.client.grant(&s.agent, &s.recipient, &s.asset, &25, &1);
    let before = balance(&s, &s.agent);
    s.client.execute(&id, &s.recipient, &s.asset, &25);
    assert_eq!(balance(&s, &s.recipient), 25);
    assert_eq!(balance(&s, &s.agent), before - 25);
    let b = s.client.budget(&s.agent, &s.asset).unwrap();
    assert_eq!((b.reserved, b.spent), (0, 25));
    assert_eq!(s.client.get_grant(&id).unwrap().status, GrantStatus::Executed);
}

#[test]
fn replayed_execute_is_rejected() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    let id = s.client.grant(&s.agent, &s.recipient, &s.asset, &25, &1);
    s.client.execute(&id, &s.recipient, &s.asset, &25);
    let r = s.client.try_execute(&id, &s.recipient, &s.asset, &25);
    assert_eq!(r, Err(Ok(Error::AlreadyExecuted)));
    assert_eq!(balance(&s, &s.recipient), 25);
}

#[test]
fn execute_with_other_recipient_is_rejected() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    let id = s.client.grant(&s.agent, &s.recipient, &s.asset, &25, &1);
    let attacker = Address::generate(&s.env);
    let r = s.client.try_execute(&id, &attacker, &s.asset, &25);
    assert_eq!(r, Err(Ok(Error::IntentMismatch)));
    assert_eq!(balance(&s, &attacker), 0);
}

#[test]
fn execute_with_other_amount_or_asset_is_rejected() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    let id = s.client.grant(&s.agent, &s.recipient, &s.asset, &25, &1);
    assert_eq!(s.client.try_execute(&id, &s.recipient, &s.asset, &26), Err(Ok(Error::IntentMismatch)));
    let other = s.env.register_stellar_asset_contract_v2(Address::generate(&s.env)).address();
    assert_eq!(s.client.try_execute(&id, &s.recipient, &other, &25), Err(Ok(Error::IntentMismatch)));
}

#[test]
fn unknown_request_is_rejected() {
    let s = setup();
    let fake = BytesN::from_array(&s.env, &[7u8; 32]);
    assert_eq!(s.client.try_execute(&fake, &s.recipient, &s.asset, &1), Err(Ok(Error::UnknownRequest)));
}

#[test]
fn revoke_releases_reservation_and_blocks_execute() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    let id = s.client.grant(&s.agent, &s.recipient, &s.asset, &80, &1);
    s.client.revoke(&id);
    assert_eq!(s.client.budget(&s.agent, &s.asset).unwrap().reserved, 0);
    assert_eq!(s.client.try_execute(&id, &s.recipient, &s.asset, &80), Err(Ok(Error::Revoked)));
    assert_eq!(s.client.try_revoke(&id), Err(Ok(Error::Revoked)));
    s.client.grant(&s.agent, &s.recipient, &s.asset, &100, &2);
}

#[test]
#[should_panic]
fn set_budget_requires_admin_auth() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let agent = Address::generate(&env);
    let id = env.register(RailguardPolicy, (&admin,));
    let client = RailguardPolicyClient::new(&env, &id);
    let asset = Address::generate(&env);
    // No mocked auths: admin signature missing.
    client.set_budget(&agent, &asset, &100);
}

#[test]
fn execute_requires_agent_auth() {
    let s = setup();
    s.client.set_budget(&s.agent, &s.asset, &100);
    let id = s.client.grant(&s.agent, &s.recipient, &s.asset, &5, &1);
    s.client.execute(&id, &s.recipient, &s.asset, &5);
    let auths = s.env.auths();
    assert!(auths.iter().any(|(addr, _)| *addr == s.agent));
}

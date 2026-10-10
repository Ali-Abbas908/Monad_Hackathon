# ARCHITECTURE: Group Pay

## Overview

Money state lives onchain in one `GroupPool` contract that manages many groups, plus a mock stablecoin. Social state (feed, comments, profiles) lives in Supabase. A small keeper process triggers recurring pulls and copies onchain events into the feed.

```text
Browser: Next.js PWA + Privy embedded wallet
   |  wagmi/viem transactions            |  Supabase client (realtime)
   v                                     v
Monad testnet                         Supabase
  GroupPool + MockUSD                   profiles, feed_items, comments, sync_state
   ^                                     ^
   | pull(groupId, member)               | inserts feed rows (service role)
   |                                     |
   +---------- Keeper (Node, cron) ------+
              1. periodic pull   2. event indexer
```

## What lives where

| Data | Where | Why |
| --- | --- | --- |
| Pool balances, contributions, member limits, proposals, approvals, IOUs | GroupPool contract | Enforced by code; no trusted party holds funds |
| Token balances and allowances | MockUSD contract | Standard ERC-20 |
| Display names, avatars, wallet to profile mapping | Supabase `profiles` | Keeps addresses out of the UI |
| Feed items | Supabase `feed_items`, written from onchain events | Fast realtime reads |
| Comments | Supabase `comments` | Off-chain, members only |
| Last indexed block | Supabase `sync_state` | Lets the indexer resume |

## Stack

Record the exact version you install in the Version column at scaffold time (for example the output of `forge --version` and each package's `npm ls`), and paste these versions into model prompts.

| Layer | Choice | Version |
| --- | --- | --- |
| Contracts | Solidity, Foundry, OpenZeppelin | Solidity 0.8.24, forge 1.8.5, OpenZeppelin v5.7.0 |
| Network | Monad testnet (EVM) | Chain ID 10143, RPC https://testnet-rpc.monad.xyz |
| Token | MockUSD, 6 decimals, faucet | ERC-20 with 1-hr cooldown |
| Login | Privy embedded wallets (Dynamic is the fallback) | @privy-io/react-auth ^1.88.4 |
| App | Next.js, TypeScript, Tailwind, wagmi, viem, PWA manifest | Next.js 14.2.15, React 18.3.1, TypeScript 5.6.3, Tailwind 3.4.13, wagmi 2.12.17, viem 2.21.26 |
| Social data | Supabase (Postgres, Auth, Realtime) | @supabase/supabase-js ^2.45.4 |
| Keeper | Node script on a cron (GitHub Actions or Vercel cron) | Node v18.19.1, viem ^2.21.26, GitHub Actions |
| Gas | Sponsored via paymaster or relayer if supported; else pre-funded wallets | decision D11 |
| Debugging | Tenderly for simulation, Quicknode or Alchemy RPC | n/a |

## Consent and settlement model

- Each member approves the `GroupPool` contract once as spender of their mUSD (standard ERC-20 approve).
- Because an ERC-20 allowance is global per spender, the contract enforces its own per-member, per-action limit (`maxPerAction`) set when joining.
- The contract only ever pulls from a member for: a periodic contribution, their share of a group payment, or a manual contribution they trigger themselves.
- `pull` is permissionless (anyone can call it) but limited to once per period and to the member's limit, so a keeper needs no special trust.

## Keeper

Two jobs in one process:

1. **Periodic pull.** On a schedule, for each group with a contribution amount and each member whose period has elapsed, call `pull(groupId, member)`. Failures are logged and skipped.
2. **Event indexer.** Read `GroupPool` logs from the block stored in `sync_state`, insert one `feed_items` row per event, then advance `sync_state`. Inserts are idempotent through a unique constraint on `(tx_hash, log_index)`.

The keeper holds only a gas-funded key with no special rights, plus the Supabase service role key (server side only).

## Supabase schema (starting point)

```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table feed_items (
  id bigint generated always as identity primary key,
  group_id bigint not null,
  kind text not null,
  actor text,
  payload jsonb not null default '{}',
  tx_hash text not null,
  log_index int not null,
  created_at timestamptz default now(),
  unique (tx_hash, log_index)
);

create table comments (
  id bigint generated always as identity primary key,
  feed_item_id bigint references feed_items(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz default now()
);

create table sync_state (
  id int primary key default 1,
  last_block bigint not null default 0
);
```

Row level security: members of a group can read its `feed_items` and read and write its `comments`. Membership is checked against the indexed `MemberJoined` and `MemberLeft` events.

## Security notes

- Money logic uses SafeERC20, updates state before external calls, and uses custom errors.
- No private keys or the Supabase service role key in the browser bundle or the repo.
- The contract is not audited and handles testnet tokens only.
- Review every contract change against the money-logic checklist in the workflow doc.

## Frontend structure (suggested)

```text
app/
  src/
    app/            routes: /, /groups/[id], /groups/[id]/pay, /join/[code]
    components/     feed, pay sheet, proposal card, pool progress
    lib/
      contracts.ts  addresses and ABIs, exported after each deploy
      wagmi.ts      chain and transport config
      supabase.ts   client
```

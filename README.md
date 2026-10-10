# Group Pay

Group payments on Monad where shared wallets and group spending settle without an intermediary. Built for Monad Metropolis, Track 2 (Consumer Products and Payments).

Testnet only. The token is a mock stablecoin (mUSD) with a faucet. No real money moves, and there is no UPI or bank integration.

## What it does

1. **Pools.** A group saves toward a goal. Each member approves recurring contributions once, and anyone can trigger the periodic pull. Spending follows one of three rules per group:
   - Delegate: one elected member spends at their discretion, and the group can vote to replace them.
   - Approval: any member proposes a payment, and it runs once a majority approves, before it expires.
   - Open: any member spends freely, with an optional per-spend cap.
2. **Pay for the group.** One member pays a payee, then the contract pulls an equal share from every other member's wallet and repays the payer. A member who cannot cover their share becomes an IOU, not a failed payment.
3. **Split bill.** A member records an expense they paid, participants owe equal shares as IOUs, and everyone settles up onchain.
4. **Activity feed.** Every group has a realtime feed of contributions, payments, approvals and comments.

Users sign in with email, Google or a passkey and never see a seed phrase, hex address or gas prompt.

## Repo layout

```text
group-pay/
  README.md
  docs/
    SPEC.md
    ARCHITECTURE.md
    INTERFACES.md
    TASKS.md
    DECISIONS.md
  contracts/   Foundry project: src, test, script
  app/         Next.js app
  keeper/      Node script: periodic pull and event indexer
```

## Quickstart

Fill in exact versions in `docs/ARCHITECTURE.md` as you scaffold.

```bash
# contracts
cd contracts
forge build
forge test -vv

# app
cd ../app
npm install
npm run dev

# keeper
cd ../keeper
npm install
npm start
```

## Environment variables

Copy to `.env.local` (app) and `.env` (keeper). Never commit real values.

```text
# app (public)
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_CHAIN_ID=
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_GROUP_POOL_ADDRESS=
NEXT_PUBLIC_MUSD_ADDRESS=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# keeper and deploy scripts (secret, never in the browser)
RPC_URL=
KEEPER_PRIVATE_KEY=
DEPLOYER_PRIVATE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Deployed contracts

| Contract | Address | Network |
| --- | --- | --- |
| MockUSD | TBD | Monad testnet |
| GroupPool | TBD | Monad testnet |

## Demo script (2 to 3 minutes)

1. Sign up with email as Alice; tap the faucet; create a group "Goa trip" in Approval mode with a goal.
2. Invite Bob (second account); Bob joins and approves recurring contributions.
3. Trigger a contribution period; both balances move into the pool and the feed updates.
4. Alice taps **Pay for the group** for a payee; Bob's share is debited automatically and shown in the feed.
5. Alice proposes a spend from the pool; Bob approves; it executes.

## Docs

Start with `docs/SPEC.md`, then `docs/INTERFACES.md`. Choices and open questions are logged in `docs/DECISIONS.md`, and the work list is `docs/TASKS.md`.

## Team

- Builder 1: contracts, deployment, keeper
- Builder 2: app, login, feed

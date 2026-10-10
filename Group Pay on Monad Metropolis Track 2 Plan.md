# Group Pay on Monad: Metropolis Track 2 Plan

Oct 8, 2026 · @READER

## Verdict

Group Pay fits Track 2 if the shared pool and the pay-for-group flow are the core, and chat shrinks to an activity feed. The submission deadline is 13 Oct, five days from today, and there are two of you, so scope decides the outcome more than the idea does.

The track lists "shared wallets and group spending that settle up without an intermediary" as an example idea. It favors product teams who care about a user's first five minutes more than the architecture underneath, so the demo should feel like a normal payments app.

## Keep, cut and change

Build the shared pool and pay-for-group first; they are the onchain-native parts that a bank app cannot copy without a trusted middleman.

- **Keep:** shared pools with a goal and recurring contributions, the three spending modes, and "Pay for the group" as a button at the top of every group.
- **Keep, cheap:** standard split bill as an onchain ledger that nets debts, so A owes B and B owes C settles in one transaction.
- **Cut:** a full WhatsApp-style chat app. Ship an activity feed with comments instead, for example "Riya contributed 2,000" or "Payment awaiting approval". Add real chat only if time is left.
- **Change:** the approval mode should use a majority threshold plus an expiry, not strict unanimity, so one inactive friend cannot block a trip payment. The delegate mode needs a vote to replace the delegate.

## Pay for the group

One member pays from their own wallet, then the contract reimburses them by pulling each other member's equal share, so the group settles without anyone chasing money. This works without an intermediary because every member approves the group contract once when they join.

&#91;embedded content: pay-for-group flow · 4 steps, 1 decision\]

The payer's own wallet pays first; the contract pulls the others' shares only after that succeeds, and any share that cannot be covered becomes an IOU.

- **One-time consent:** on joining, each member approves a spending allowance to the group contract, capped per payment and in total. Leaving the group revokes it.
- **Shortfall handling:** if a member's balance is too low when the share is pulled, the payer is still reimbursed from the others and the gap is recorded as an IOU in the split-bill ledger, to be settled later.
- **Visibility:** every auto-debit appears in the group's activity feed with the payee, amount and each member's share.
- **Later, if time allows:** uneven splits (percentages or itemized) on top of the equal average.

## Tech stack for two builders

Use Solidity with Foundry for the contracts and Next.js with Privy for the app, keeping money state onchain and everything social in Supabase. Every choice below is picked for speed over novelty, and the free sponsor credits cover the infrastructure.

| Layer | Choice | Why |
| --- | --- | --- |
| Contracts | Solidity, Foundry, OpenZeppelin | Fast tests and deploys; audited ERC-20 and access-control building blocks |
| Network | Monad testnet | EVM-compatible, so standard tooling works unchanged |
| Money | Our own mock stablecoin ERC-20 with a faucet button | Free test funds for every demo user; no dependence on real token addresses |
| Login and wallets | Privy embedded wallets (email, Google or passkey) | No seed phrase, so the first five minutes feel like a normal app; Dynamic is the alternative |
| Gas | Sponsored gas via a paymaster or a small relayer | Check which one Privy or Dynamic supports on Monad testnet first; fallback is pre-funding wallets from the faucet |
| App | Next.js, TypeScript, Tailwind, wagmi and viem, installable as a PWA | One codebase that feels like a phone app in the demo |
| Feed, comments, group metadata | Supabase (Postgres, Auth, Realtime) | Realtime activity feed in hours; XMTP is optional if you want real chat |
| Event reading | viem event watching first, Envio if time remains | Keeps the feed in sync with onchain payments; Envio has its own bounty |
| Recurring contributions | A cron script (GitHub Actions or Vercel cron) calling a permissionless `pull()`; Chainlink CRE as a stretch | Anyone can trigger it, so no trusted server holds funds |
| Debugging and RPC | Tenderly, plus Quicknode or Alchemy credits | Simulate failed transactions; free for participants |

**Suggested split for two people.** Builder 1 owns the contracts, tests, deployment and the cron script. Builder 2 owns login, the group screens, the pay-for-group button and the feed. Swap if your strengths run the other way.

## Savings pool design decisions

One `GroupPool` contract with a `mode` flag covers all three spending rules; settle these four decisions before writing it.

| Mode | Who can spend | Safeguard to build |
| --- | --- | --- |
| Delegate | One elected member, at their discretion | A vote to replace the delegate, so the group is never stuck |
| Approval | Any member proposes; the payment runs once enough members approve | Majority threshold and an expiry, not strict unanimity |
| Open | Any member, no permission needed | Optional per-person cap |

- **Recurring contributions:** a contract cannot pull money on a schedule by itself. Each member approves an allowance once, then anyone can call `pull(member)`, which only works once per period and only up to the agreed amount. A small cron script plays the "anyone" in the demo.
- **Goal reached:** when the pool balance hits the target, the pool flips state (for example from "saving" to "ready to spend") and the feed announces it.
- **Exits and refunds:** if a member leaves or the goal is cancelled, they withdraw their own contributions pro rata. Judges will ask about this.
- **Merchants:** GPay pays UPI merchants, but onchain you pay addresses. Demo with a payee address and a clear "pay a payee" screen; do not imply UPI support.

## Invisible blockchain and sponsor bounties

The demo should never show a seed phrase, a hex address or a gas prompt, and that same login stack lines up with several sponsor bounties.

- Sign up with email, Google or passkey into an embedded wallet.
- Show amounts in a stable currency, with names and avatars instead of addresses.
- Sponsor gas, or pre-fund wallets from the faucet, so no one sees a fee screen.
- Treat "Pay for the group" as one tap with one confirmation.

| Bounty | Prize (USD) | Fit for this project |
| --- | --- | --- |
| Privy | 5,000 | Embedded wallet login |
| Dynamic, Best Use of Dynamic | 5,000 | Alternative login stack; pick one of the two |
| Monad Foundation, Mera: One Passkey, Many Keys | 2,500 | Passkey login, if you adopt Mera |
| Monad Foundation, Best Mera-Powered UX | 2,500 | Same, judged on UX |
| Chainlink, Best workflow with CRE | 3,000 | Stretch: run the recurring pull as a CRE workflow |
| Envio, Best Use of Envio | 1,000 | Stretch: index pool events for the feed |
| Agora, Best Cross-Border Payments App on Monad | 10,000 | Only if you add a cross-border angle to group payments |

Bounty rules are on the application platform, so read each one before building toward it.

## Five-day plan

Contracts land by 10 Oct and the app by 12 Oct, which leaves 13 Oct for the demo video and a submission with margin. Submit a working product with a public project profile, a demo, a short write-up and a link to the code; judging runs 14 to 27 Oct and winners are announced 3 Nov.

&#91;embedded content: build plan by day · 7 workstreams, Oct 9 to 13\]

B1 is Builder 1 (contracts and keeper) and B2 is Builder 2 (app); the last two days are shared for polish and submission.

## Sources

- [Metropolis hackathon page](https://monad.xyz/developers/hackathons/metropolis): tracks, prizes, bounties, dates and submission requirements, as of 8 Oct 2026.
- Stack choices, contract design and the timeline are recommendations, not sourced facts; confirm paymaster and bundler support on Monad testnet in the Privy or Dynamic docs before relying on sponsored gas.

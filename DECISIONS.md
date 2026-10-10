# DECISIONS: Group Pay

Running log. Paste this file into every model session so all sessions work from the same choices. Add a row when you decide something; never edit an old row, add a new one that supersedes it.

## Decided

| ID | Date | Decision | Why |
| --- | --- | --- | --- |
| D1 | 2026-10-10 | One `GroupPool` contract manages many groups by `groupId` | One address for the app to track; simpler deploy |
| D2 | 2026-10-10 | Token is MockUSD (mUSD), 6 decimals, with a faucet | Free funds for every demo user; no dependence on real token addresses |
| D3 | 2026-10-10 | Approval mode: default threshold 5001 basis points (strict majority) of the member count at proposal time; default window 24 hours; the proposer's approval counts | Unanimity would let one inactive member block payments |
| D4 | 2026-10-10 | In Pay for the group, the payer keeps their own share plus the rounding remainder | Shares always sum exactly to the total |
| D5 | 2026-10-10 | Spending is allowed at any time, not only after the goal is reached | Trips need deposits before the goal; the goal drives status and the feed only |
| D6 | 2026-10-10 | Periodic pulls stop once the group is Ready | The goal is a saving target |
| D7 | 2026-10-10 | Consent: one ERC-20 approve to GroupPool plus a per-member `maxPerAction` stored in the contract | ERC-20 allowance is global per spender, so per-group limits must live in the contract |
| D8 | 2026-10-10 | `pull` is permissionless, limited to once per period and to `maxPerAction` | No trusted server; the keeper is just a caller |
| D9 | 2026-10-10 | A member who cannot cover their share becomes an IOU; the payer is never blocked | Settling without chasing money; no all-or-nothing failures |
| D10 | 2026-10-10 | Feed, comments and profiles live in Supabase; money state lives onchain | Fast realtime UI without putting social data onchain |
| D11 | 2026-10-10 | Gas: use sponsored gas if the login provider supports it on Monad testnet; otherwise pre-fund wallets from the faucet | Hide fees from users; the fallback must work without extra services |
| D12 | 2026-10-10 | Equal splits only; mode is fixed at group creation | Scope for a three-day build |
| D13 | 2026-10-10 | Testnet only; no UPI, fiat or bank integration | Onchain addresses are not UPI merchants; do not imply otherwise |
| D14 | 2026-10-10 | Chat is an activity feed with comments, not a full messenger | Chat is a commodity and would consume the schedule |
| D15 | 2026-10-10 | Monad testnet chain ID: 10143, RPC: https://testnet-rpc.monad.xyz, Explorer: https://testnet.monadexplorer.com | Official Monad testnet parameters confirmed |
| D16 | 2026-10-10 | Privy chosen for embedded wallet onboarding (@privy-io/react-auth) | Provides seedless email/Google login for demo UX |
| D17 | 2026-10-10 | Equal split is sufficient for Track 2 core demo path; uneven splits deferred to stretch | Meets Track 2 scope within hackathon timeline |
| D18 | 2026-10-10 | Invite format is deep link (`/join/[groupId]`) | Fastest frictionless join path for new users |

## Open questions

| ID | Question | Owner | Needed by |
| --- | --- | --- | --- |
| Q1 | Exact submission time and time zone on the application platform | Both | 10 Oct |

## Deployed addresses

| Contract | Address | Date |
| --- | --- | --- |
| MockUSD | TBD | |
| GroupPool | TBD | |

## Change log

Add one line per change to INTERFACES.md or SPEC.md: date, what changed, who agreed.

# SPEC: Group Pay

Source of truth for what the product does. If code and this file disagree, this file wins; change it deliberately and log the change in DECISIONS.md.

## Goal

Show that a group can hold and spend money together onchain, with the rules enforced by a contract instead of a trusted middleman, while feeling like an ordinary payments app. Target track: Monad Metropolis, Consumer Products and Payments. The first five minutes of use matter more than the architecture underneath.

## Scope and non-goals

In scope:

- Groups (pools) with a goal, recurring contributions and three spending modes.
- Pay for the group (one pays, equal shares are auto-debited from the others).
- Split bill with IOUs and settle up.
- Activity feed with comments.
- Email, Google or passkey login with an embedded wallet.

Out of scope:

- Real money, fiat, UPI or bank rails. The token is a testnet mock (mUSD).
- Uneven or itemized splits (equal average only for now).
- Full chat. The feed with comments is the only messaging.
- Mainnet deployment and audits.

## Users and terms

- **Member:** a wallet that has joined a group.
- **Pool:** the mUSD balance a group holds in the contract.
- **Delegate:** the single spender in Delegate mode.
- **Payer:** the member who initiates Pay for the group.
- **Share:** the equal slice of a payment owed by each member.
- **IOU:** a recorded debt between two members, created when a share could not be pulled or when an expense is added.

All amounts are mUSD with 6 decimals. The UI shows dollars-style amounts and names with avatars; addresses are never shown by default.

## Feature rules

### 1. Groups and membership

- Anyone can create a group by choosing a name, spending mode, optional goal, optional recurring contribution (amount and period) and mode settings. The creator becomes the first member, and the delegate in Delegate mode.
- Members join with an invite link. Joining records the member's per-action limit (`maxPerAction`), the most the contract may pull from their wallet in one action.
- A member can leave at any time. They receive their pro rata share of the pool: `pool balance x their contributions / total contributions`. Their IOUs stay recorded.
- Membership is open to all while the group exists; there is no kick feature.

### 2. Saving toward a goal

- A group may set a goal in mUSD. The status is Saving until the pool balance reaches the goal, then Ready; the feed announces it.
- Recurring contributions: once per period, `pull(groupId, member)` takes the group's contribution amount from that member's wallet into the pool. Anyone may call it. It fails if called too early, if the amount exceeds the member's `maxPerAction`, or if the group is already Ready.
- Members can also contribute manually at any time.
- Spending is allowed at any time, not only after the goal is reached.

### 3. Spending modes

| Mode | Who can spend | Rule |
| --- | --- | --- |
| Delegate | The delegate only | Members vote to replace the delegate; a candidate with more than half of members' votes becomes delegate |
| Approval | Any member proposes; the pool pays when approved | The proposer counts as one approval; executes when approvals reach `approvalBps` of the member count at proposal time (default 5001 basis points, a strict majority); expires after `approvalWindow` (default 24 hours); one approval per member |
| Open | Any member | Each spend must be at or under `openSpendCap`; zero means no cap |

The mode is fixed when the group is created.

### 4. Pay for the group

1. A member taps **Pay for the group**, chooses a payee and an amount.
2. In one transaction the contract takes the full amount from the payer's wallet and sends it to the payee. If this fails, nothing else happens and nobody is debited.
3. The contract then splits the amount equally across all members. The payer keeps their own share plus any rounding remainder.
4. For each other member, the contract pulls their share straight to the payer, provided their balance, allowance and `maxPerAction` cover it.
5. If a member cannot cover their share, the payer is not blocked: the share is recorded as an IOU from that member to the payer and the feed shows it.

### 5. Split bill

- A member who paid something outside the app records an expense: an amount, the participants, and a note.
- Each participant owes the payer an equal share, recorded as an IOU.
- A debtor settles an IOU by paying the creditor onchain; partial settlement is allowed.
- If two members owe each other, either can call offset to cancel the overlap.

### 6. Activity feed and comments

- Every onchain event listed in INTERFACES.md becomes a feed item for the group, in order.
- Members can comment on feed items. Comments live off-chain and are visible only to members.

### 7. Login and first five minutes

- New users sign in with email, Google or a passkey and receive an embedded wallet. No seed phrase screen.
- A faucet button gives test mUSD. Gas is sponsored if supported on the testnet; otherwise wallets are pre-funded.
- No hex addresses, chain names or gas prompts in the default UI. Show a transaction link only in an expandable "details" area.

## Acceptance criteria

- A fresh user can sign up, get funds and join a group in under two minutes.
- Pay for the group with three members debits both other members and credits the payer in one flow, with a feed entry.
- A member with too little balance produces an IOU and does not block the payer.
- Approval mode: a proposal with one of three approvals does not execute; with two it does; after expiry it cannot be approved.
- Delegate mode: only the delegate can spend; a majority vote replaces them.
- Recurring pull works once per period and not before.
- Leaving a group returns the member's pro rata share.

## Demo path

Two accounts (Alice, Bob) and one group. Sign up, faucet, create group in Approval mode, join, run a contribution period, Pay for the group, propose and approve a spend. The path must run three times in a row without manual fixes.

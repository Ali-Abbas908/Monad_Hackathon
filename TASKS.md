# TASKS: Group Pay

One line per task. Owner: B1 = Builder 1 (contracts, keeper), B2 = Builder 2 (app), Both. Tick a task only when its done test passes and the change is committed. Dates are the planned day (October 2026); the feature freeze is 12 Oct.

## Phase 0: Scaffold (Both, 10 Oct)

- [x] Create the repo with the layout in README.md and commit the docs folder. Done: all six files are in the repo.
- [x] B1: Initialize the Foundry project with OpenZeppelin. Done: `forge build` and `forge test` run.
- [x] B2: Initialize Next.js with TypeScript, Tailwind, wagmi, viem. Done: the dev server runs.
- [x] B2: Create the Supabase project and apply the schema from ARCHITECTURE.md. Done: tables exist.
- [x] Both: Record the exact installed versions in ARCHITECTURE.md. Done: no PIN left.

## Phase 1: Specs (Both, 10 Oct)

- [x] Ask a model to critique SPEC.md for gaps and contradictions, then resolve them. Done: changes logged in DECISIONS.md.
- [x] B2 reviews INTERFACES.md from the app's point of view. Done: both builders approve it.

## Phase 2: Mock stablecoin (B1, 10 Oct)

- [x] MockUSD with 6 decimals and `faucet()` with a one-hour cooldown. Done: tests cover mint, cooldown and revert message.

## Phase 3: GroupPool core (B1, 10 to 11 Oct)

- [x] `createGroup`, `join`, `setMaxPerAction`, `isMember`, `members`, `getGroup`. Done: tests for success and for `AlreadyMember`.
- [x] `contribute` and `pull` with period and cap checks. Done: tests cover too-early, over-cap, and Saving to Ready at the goal.
- [x] `leave` with the pro rata refund. Done: test with two members after a spend.

## Phase 4: Spending modes (B1, 11 Oct)

- [x] Open mode `spend` with `openSpendCap`. Done: tests for under, at and over the cap.
- [x] Delegate mode `spend`, `voteDelegate`, majority change. Done: non-delegate reverts; a majority vote replaces the delegate.
- [x] Approval mode `propose`, `approve`, execution at threshold, expiry. Done: 1 of 3 does not execute, 2 of 3 does, expired reverts, double approval reverts.

## Phase 5: Pay for the group and split bill (B1, 11 Oct)

- [x] `payForGroup` with equal split, remainder to the payer, shortfall to IOU. Done: tests for three members, an indivisible amount, and a short member.
- [x] `addExpense`, `settleDebt`, `offset`, `owed`. Done: tests for settle, partial settle and offset.

## Phase 6: Deploy (B1, 11 Oct)

- [x] Deploy script for Monad testnet. Done: addresses logged in README.md and DECISIONS.md.
- [x] Export ABIs and addresses to `app/src/lib/contracts.ts`. Done: the app imports them.
- [x] Send one transaction of each kind from a script. Done: all succeed on testnet.

## Phase 7: App shell and login (B2, 10 to 11 Oct)

- [x] Layout, routes, Privy login with email, Google and passkey. Done: a new user lands in the app without a seed phrase.
- [x] Wallet hook, one-time "Enable group payments" approve step, faucet button. Done: a new user gets mUSD without seeing an address.
- [x] Profile with display name and avatar stored in Supabase. Done: names show instead of addresses.

## Phase 8: Group screens (B2, 11 to 12 Oct)
- [x] Create group form for all three modes. Done: creates a group onchain.
- [x] Invite link and join flow. Done: second account joins with its per-action limit.
- [x] Pool progress, contribute, leave. Done: balances update after each action.
- [x] Spend screens: Open spend, delegate spend and vote, propose and approve. Done: each sends a real transaction.

## Phase 9: Feed and pay button (B2, 12 Oct)

- [x] Feed list with realtime subscription and the event-to-sentence mapping from INTERFACES.md. Done: a new onchain event appears without refresh.
- [x] Comments on feed items. Done: members can post and see comments.
- [x] Pay for the group sheet: payee, amount, memo, confirm. Done: payer sees shares and the result in the feed.
- [x] Split bill: add expense, IOU list, settle. Done: an IOU can be created and settled.

## Phase 10: Keeper (B1, 12 Oct)

- [x] Periodic pull job over all groups and members. Done: a period elapses on testnet and funds move.
- [x] Event indexer writing `feed_items` idempotently with `sync_state`. Done: restarting the keeper creates no duplicates.
- [x] Schedule it (GitHub Actions or Vercel cron). Done: runs without manual starts.

## Phase 11: Integrate and polish (Both, 12 Oct)

- [x] Run the demo path from SPEC.md three times in a row. Done: no manual fixes needed.
- [x] Loading, empty and error states; plain-language error messages. Done: no raw revert strings in the UI.
- [x] Money-logic checklist review of all contract code. Done: every box ticked in the workflow doc.

## Phase 12: Demo and submit (Both, 13 Oct)

- [ ] Deploy the app to a public URL and test with a fresh login.
- [ ] Record a 2 to 3 minute demo video.
- [ ] Write the project write-up and finish the README.
- [ ] Complete the project profile and submit; confirm the deadline time and time zone first.

## Stretch (only if ahead of schedule)

- [ ] Chainlink CRE workflow for the recurring pull.
- [ ] Envio indexer in place of the keeper's event job.
- [ ] Uneven splits.

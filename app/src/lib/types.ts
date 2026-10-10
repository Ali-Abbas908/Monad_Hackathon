// SPDX-License-Identifier: MIT
// TypeScript definitions matching INTERFACES.md

export type Mode = 'Delegate' | 'Approval' | 'Open';
export type GroupStatus = 'Saving' | 'Ready';

export interface GroupConfig {
  name: string;
  mode: Mode;
  goal: bigint;
  contributionAmount: bigint;
  period: bigint; // seconds
  openSpendCap: bigint;
  approvalBps: number;
  approvalWindow: bigint; // seconds
}

export interface Group {
  id: bigint;
  config: GroupConfig;
  status: GroupStatus;
  delegate: `0x${string}` | null;
  balance: bigint;
  totalContributed: bigint;
  memberCount: number;
  paymentCount: bigint;
  proposalCount: bigint;
}

export interface Proposal {
  id: bigint;
  proposer: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
  memo: string;
  expiresAt: bigint;
  approvals: number;
  memberSnapshot: number;
  executed: boolean;
}

export type FeedKind =
  | 'group_created'
  | 'member_joined'
  | 'member_left'
  | 'contributed'
  | 'goal_reached'
  | 'spent'
  | 'delegate_voted'
  | 'delegate_changed'
  | 'proposal_created'
  | 'proposal_approved'
  | 'proposal_executed'
  | 'group_payment'
  | 'share_debited'
  | 'share_shortfall'
  | 'expense_added'
  | 'debt_settled'
  | 'debt_offset';

export interface FeedItem {
  id: number;
  groupId: number;
  kind: FeedKind;
  actor: string | null;
  payload: Record<string, string | number>;
  txHash: string;
  logIndex: number;
  createdAt: string;
}

export interface Comment {
  id: number;
  feedItemId: number;
  author: string;
  body: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  walletAddress: string;
  displayName: string;
  avatarUrl?: string | null;
}

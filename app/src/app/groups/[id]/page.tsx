'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  CreditCard,
  PlusCircle,
  Send,
  Receipt,
  UserMinus,
  Share2,
  ChevronLeft,
  Check,
  AlertCircle
} from 'lucide-react';
import { Header } from '@/components/Header';
import { PoolProgress } from '@/components/PoolProgress';
import { ProposalCard } from '@/components/ProposalCard';
import { FeedList } from '@/components/FeedList';
import { PaySheet } from '@/components/PaySheet';
import { SpendModal } from '@/components/SpendModal';
import { SplitBillModal } from '@/components/SplitBillModal';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';
import { Group, Proposal, Mode, GroupStatus } from '@/lib/types';

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const groupId = Number(params.id);

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isSpendOpen, setIsSpendOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();

  // Read group data
  const { data: rawGroup, refetch: refetchGroup } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'getGroup',
    args: [BigInt(groupId)],
  });

  // Read members
  const { data: rawMembers, refetch: refetchMembers } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'members',
    args: [BigInt(groupId)],
  });

  // Read caller membership
  const { data: isMember, refetch: refetchMember } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'isMember',
    args: address ? [BigInt(groupId), address] : undefined,
    query: { enabled: !!address },
  });

  const memberList = (rawMembers as string[]) || [];

  const group: Group | null = rawGroup ? {
    id: BigInt(groupId),
    config: {
      name: (rawGroup as any).config.name,
      mode: (['Delegate', 'Approval', 'Open'] as Mode[])[(rawGroup as any).config.mode],
      goal: (rawGroup as any).config.goal,
      contributionAmount: (rawGroup as any).config.contributionAmount,
      period: (rawGroup as any).config.period,
      openSpendCap: (rawGroup as any).config.openSpendCap,
      approvalBps: (rawGroup as any).config.approvalBps,
      approvalWindow: (rawGroup as any).config.approvalWindow,
    },
    status: ((rawGroup as any).status === 0 ? 'Saving' : 'Ready') as GroupStatus,
    delegate: (rawGroup as any).delegate,
    balance: (rawGroup as any).balance,
    totalContributed: (rawGroup as any).totalContributed,
    memberCount: (rawGroup as any).memberCount,
    paymentCount: (rawGroup as any).paymentCount,
    proposalCount: (rawGroup as any).proposalCount,
  } : null;

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/join/${groupId}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeAmount) return;
    try {
      setActionLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'contribute',
        args: [BigInt(groupId), parseUnits(contributeAmount, 6)],
      });
      setIsContributeOpen(false);
      setContributeAmount('');
      refetchGroup();
    } catch (err: any) {
      alert(err.message || 'Contribution failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group? You will receive your pro rata share of the remaining pool.')) return;
    try {
      setActionLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'leave',
        args: [BigInt(groupId)],
      });
      router.push('/');
    } catch (err: any) {
      alert(err.message || 'Failed to leave group');
    } finally {
      setActionLoading(false);
    }
  };

  if (!group) {
    return (
      <div className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6 text-slate-400 text-xs">
          Loading group #{groupId}...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <main className="flex-1 p-4 space-y-4">
        {/* Navigation & Invite */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> All Groups
          </button>

          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition border border-violet-200"
          >
            {copiedInvite ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
            {copiedInvite ? 'Link Copied!' : 'Invite Friends'}
          </button>
        </div>

        {/* Pool Progress Banner */}
        <PoolProgress group={group} />

        {/* Pay for the group button (Prominent hero action) */}
        <button
          onClick={() => setIsPayOpen(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm shadow-lg hover:shadow-xl transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-extrabold text-sm">Pay for the Group</div>
              <div className="text-[11px] text-slate-400 font-normal">
                Auto-debited equal shares from members
              </div>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 group-hover:bg-white/20 font-bold">
            Tap to Pay
          </span>
        </button>

        {/* Quick actions grid */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setIsContributeOpen(true)}
            className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-violet-300 text-center flex flex-col items-center gap-1 transition"
          >
            <PlusCircle className="h-5 w-5 text-violet-600" />
            <span className="text-xs font-bold text-slate-800">Contribute</span>
          </button>

          <button
            onClick={() => setIsSpendOpen(true)}
            className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-violet-300 text-center flex flex-col items-center gap-1 transition"
          >
            <Send className="h-5 w-5 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800">
              {group.config.mode === 'Approval' ? 'Propose' : 'Spend'}
            </span>
          </button>

          <button
            onClick={() => setIsSplitOpen(true)}
            className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-violet-300 text-center flex flex-col items-center gap-1 transition"
          >
            <Receipt className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Split Bill</span>
          </button>
        </div>

        {/* Proposals list if in Approval mode */}
        {group.config.mode === 'Approval' && Number(group.proposalCount) > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Active Proposals ({group.proposalCount.toString()})
            </div>
            {Array.from({ length: Number(group.proposalCount) }, (_, idx) => idx + 1).map(pId => (
              <ProposalItem
                key={pId}
                groupId={groupId}
                proposalId={BigInt(pId)}
                memberCount={group.memberCount}
                approvalBps={group.config.approvalBps}
                currentAddress={address}
                onApproved={refetchGroup}
              />
            ))}
          </div>
        )}

        {/* Realtime Activity Feed */}
        <FeedList groupId={groupId} currentAddress={address} />

        {/* Leave group */}
        {isMember && (
          <div className="pt-4 text-center">
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center justify-center gap-1 mx-auto transition"
            >
              <UserMinus className="h-3.5 w-3.5" /> Leave Group (Refund pro rata)
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <PaySheet
        groupId={groupId}
        memberCount={group.memberCount}
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        onSuccess={refetchGroup}
      />

      <SpendModal
        group={group}
        isOpen={isSpendOpen}
        onClose={() => setIsSpendOpen(false)}
        onSuccess={refetchGroup}
      />

      <SplitBillModal
        groupId={groupId}
        members={memberList}
        currentAddress={address}
        isOpen={isSplitOpen}
        onClose={() => setIsSplitOpen(false)}
        onSuccess={refetchGroup}
      />

      {/* Manual Contribute Modal */}
      {isContributeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Contribute to Pool</h3>
            <form onSubmit={handleContribute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (mUSD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={contributeAmount}
                  onChange={e => setContributeAmount(e.target.value)}
                  required
                  className="w-full text-base font-bold px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsContributeOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs"
                >
                  {actionLoading ? 'Contributing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProposalItem({
  groupId,
  proposalId,
  memberCount,
  approvalBps,
  currentAddress,
  onApproved,
}: {
  groupId: number;
  proposalId: bigint;
  memberCount: number;
  approvalBps: number;
  currentAddress?: `0x${string}`;
  onApproved?: () => void;
}) {
  const { data: rawProp, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'getProposal',
    args: [BigInt(groupId), proposalId],
  });

  const { data: hasApproved } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'hasApproved',
    args: currentAddress ? [BigInt(groupId), proposalId, currentAddress] : undefined,
    query: { enabled: !!currentAddress },
  });

  if (!rawProp) return null;

  const proposal: Proposal = {
    id: proposalId,
    proposer: (rawProp as any).proposer,
    to: (rawProp as any).to,
    amount: (rawProp as any).amount,
    memo: (rawProp as any).memo,
    expiresAt: (rawProp as any).expiresAt,
    approvals: (rawProp as any).approvals,
    memberSnapshot: (rawProp as any).memberSnapshot,
    executed: (rawProp as any).executed,
  };

  return (
    <ProposalCard
      groupId={groupId}
      proposal={proposal}
      hasUserApproved={!!hasApproved}
      memberCount={memberCount}
      approvalBps={approvalBps}
      currentAddress={currentAddress}
      onApproved={() => {
        refetch();
        if (onApproved) onApproved();
      }}
    />
  );
}

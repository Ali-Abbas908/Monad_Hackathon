'use client';

import React, { useState } from 'react';
import { formatUnits } from 'viem';
import { useWriteContract } from 'wagmi';
import { CheckCircle2, Clock, Check, AlertCircle } from 'lucide-react';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';
import { Proposal } from '@/lib/types';

interface ProposalCardProps {
  groupId: number;
  proposal: Proposal;
  hasUserApproved: boolean;
  memberCount: number;
  approvalBps: number;
  currentAddress?: `0x${string}`;
  onApproved?: () => void;
}

export function ProposalCard({
  groupId,
  proposal,
  hasUserApproved,
  memberCount,
  approvalBps,
  currentAddress,
  onApproved,
}: ProposalCardProps) {
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const isExpired = Date.now() / 1000 >= Number(proposal.expiresAt);
  const neededVotes = Math.ceil((Number(proposal.memberSnapshot) * approvalBps) / 10000);
  const progressPercent = Math.min(100, Math.round((proposal.approvals / neededVotes) * 100));

  const handleApprove = async () => {
    try {
      setLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'approve',
        args: [BigInt(groupId), proposal.id],
      });
      if (onApproved) onApproved();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-400 font-semibold uppercase">Proposal #{proposal.id.toString()}</div>
          <div className="text-base font-bold text-slate-900 mt-0.5">
            ${Number(formatUnits(proposal.amount, 6)).toFixed(2)} mUSD
          </div>
          {proposal.memo && (
            <div className="text-xs text-slate-600 mt-0.5">{proposal.memo}</div>
          )}
        </div>

        {proposal.executed ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Paid
          </span>
        ) : isExpired ? (
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Expired
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-bold flex items-center gap-1 border border-violet-200">
            <Clock className="h-3.5 w-3.5" /> Open
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500 font-medium">
          <span>Approvals</span>
          <span>{proposal.approvals} of {neededVotes} needed</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-violet-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {!proposal.executed && !isExpired && (
        <div className="pt-1 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Expires in {Math.max(0, Math.round((Number(proposal.expiresAt) - Date.now() / 1000) / 3600))}h
          </div>

          {hasUserApproved ? (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> You Approved
            </span>
          ) : (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 shadow-sm transition"
            >
              {loading ? 'Approving...' : 'Approve Spend'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

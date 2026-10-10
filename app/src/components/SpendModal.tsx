'use client';

import React, { useState } from 'react';
import { parseUnits } from 'viem';
import { useWriteContract } from 'wagmi';
import { Send, Vote, X, CheckCircle2 } from 'lucide-react';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';
import { Group } from '@/lib/types';

interface SpendModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SpendModal({ group, isOpen, onClose, onSuccess }: SpendModalProps) {
  const [activeTab, setActiveTab] = useState<'spend' | 'vote'>('spend');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [candidate, setCandidate] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  if (!isOpen) return null;

  const isDelegateMode = group.config.mode === 'Delegate';
  const isApprovalMode = group.config.mode === 'Approval';
  const isOpenMode = group.config.mode === 'Open';

  const handleSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    try {
      setLoading(true);
      const parsedAmount = parseUnits(amount, 6);

      if (isApprovalMode) {
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.groupPool,
          abi: GROUP_POOL_ABI,
          functionName: 'propose',
          args: [group.id, recipient as `0x${string}`, parsedAmount, memo || 'Pool Spend'],
        });
        setSuccessMsg('Proposal submitted! Waiting for approvals.');
      } else {
        await writeContractAsync({
          address: CONTRACT_ADDRESSES.groupPool,
          abi: GROUP_POOL_ABI,
          functionName: 'spend',
          args: [group.id, recipient as `0x${string}`, parsedAmount, memo || 'Pool Spend'],
        });
        setSuccessMsg('Payment sent successfully from the pool!');
      }

      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    try {
      setLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'voteDelegate',
        args: [group.id, candidate as `0x${string}`],
      });
      setSuccessMsg('Vote recorded for new delegate!');
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Voting failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {isApprovalMode ? 'Propose Pool Spend' : 'Spend From Pool'}
            </h3>
            <p className="text-xs text-slate-500">
              {isApprovalMode ? 'Requires group majority approval' : `${group.config.mode} mode rules apply`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isDelegateMode && (
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('spend')}
              className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'spend' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Spend (Delegate)
            </button>
            <button
              onClick={() => setActiveTab('vote')}
              className={`flex-1 py-1.5 rounded-md transition ${activeTab === 'vote' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Vote New Delegate
            </button>
          </div>
        )}

        {successMsg ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="font-bold text-slate-900 text-sm">{successMsg}</p>
          </div>
        ) : activeTab === 'vote' ? (
          <form onSubmit={handleVoteDelegate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Wallet Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={candidate}
                onChange={e => setCandidate(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A candidate receiving more than 50% of members' votes becomes the new delegate.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md transition"
            >
              {loading ? 'Submitting vote...' : 'Vote for Delegate'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSpend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipient Address
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (mUSD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full text-base font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Hotel deposit"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              {loading ? 'Submitting...' : isApprovalMode ? 'Create Spend Proposal' : 'Execute Spend'}
              {!loading && <Send className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

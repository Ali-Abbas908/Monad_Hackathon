'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { Plus, Users, ArrowRight, Shield, Target, Calendar, Sparkles } from 'lucide-react';
import { Header } from '@/components/Header';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';
import { Mode, Group } from '@/lib/types';

export default function HomePage() {
  const { address } = useAccount();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('Approval');
  const [goal, setGoal] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [periodDays, setPeriodDays] = useState('7');
  const [openSpendCap, setOpenSpendCap] = useState('');
  const [maxPerAction, setMaxPerAction] = useState('100');

  const { writeContractAsync } = useWriteContract();

  // Read total groups
  const { data: countData, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'groupCount',
  });

  const groupCount = countData ? Number(countData) : 0;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setCreateLoading(true);
      const modeIdx = mode === 'Delegate' ? 0 : mode === 'Approval' ? 1 : 2;
      const parsedGoal = goal ? parseUnits(goal, 6) : 0n;
      const parsedContrib = contributionAmount ? parseUnits(contributionAmount, 6) : 0n;
      const periodSecs = BigInt((parseInt(periodDays) || 7) * 86400);
      const parsedSpendCap = openSpendCap ? parseUnits(openSpendCap, 6) : 0n;
      const parsedMaxPerAction = parseUnits(maxPerAction || '100', 6);

      const cfg = {
        name,
        mode: modeIdx,
        goal: parsedGoal,
        contributionAmount: parsedContrib,
        period: periodSecs,
        openSpendCap: parsedSpendCap,
        approvalBps: 5001,
        approvalWindow: 86400n,
      };

      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'createGroup',
        args: [cfg, parsedMaxPerAction],
      });

      setIsCreateOpen(false);
      setName('');
      setGoal('');
      setContributionAmount('');
      refetchCount();
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <main className="flex-1 p-4 space-y-5">
        {/* Hero banner */}
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-5 text-white shadow-md">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200">
            <Sparkles className="h-3.5 w-3.5" /> Monad Metropolis Track 2
          </div>
          <h1 className="text-xl font-black mt-1">Shared Pools & Group Payments</h1>
          <p className="text-xs text-violet-100 mt-1 leading-relaxed">
            Settle up onchain without middleman trust. Pay for friends in 1-tap, save toward shared goals, and net debts automatically.
          </p>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-white text-violet-700 font-bold text-xs shadow-md hover:bg-violet-50 transition flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Create New Group
          </button>
        </div>

        {/* Groups list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            <span>Your Groups</span>
            <span>{groupCount} active</span>
          </div>

          {groupCount === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-violet-50 text-violet-600 mx-auto flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">No groups yet</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Create a shared pool for a trip, roommate expenses, or team projects to get started.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition"
              >
                Create Group
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {Array.from({ length: groupCount }, (_, i) => i + 1).map(id => (
                <a
                  key={id}
                  href={`/groups/${id}`}
                  className="block bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-violet-300 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400 font-semibold">Group #{id}</div>
                      <div className="text-base font-bold text-slate-900 mt-0.5">Goa Trip / Group #{id}</div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Group Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Create Group Pool</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-xs font-semibold text-slate-400">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Goa Trip, Apartment 4B"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Spending Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Approval', 'Delegate', 'Open'] as Mode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        mode === m
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {mode === 'Approval' && 'Any member proposes, strict majority approves.'}
                  {mode === 'Delegate' && 'One elected member spends; members vote to replace.'}
                  {mode === 'Open' && 'Any member can spend freely up to optional cap.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Savings Goal (optional mUSD)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500.00"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recurring Pull (mUSD)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={contributionAmount}
                    onChange={e => setContributionAmount(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Period (Days)
                  </label>
                  <input
                    type="number"
                    value={periodDays}
                    onChange={e => setPeriodDays(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {mode === 'Open' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Open Spend Cap (mUSD, 0 = unlimited)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={openSpendCap}
                    onChange={e => setOpenSpendCap(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Max Per Action Limit (mUSD)
                </label>
                <input
                  type="number"
                  value={maxPerAction}
                  onChange={e => setMaxPerAction(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The maximum amount the group contract can ever pull from your wallet in one payment.
                </p>
              </div>

              <button
                type="submit"
                disabled={createLoading}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition"
              >
                {createLoading ? 'Creating group onchain...' : 'Confirm & Create'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

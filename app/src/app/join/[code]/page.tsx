'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Users, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const groupId = Number(params.code);

  const [maxPerAction, setMaxPerAction] = useState('100');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const { data: rawGroup } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'getGroup',
    args: [BigInt(groupId)],
  });

  const { data: isAlreadyMember } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'isMember',
    args: address ? [BigInt(groupId), address] : undefined,
    query: { enabled: !!address },
  });

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      alert('Please connect your wallet first.');
      return;
    }

    try {
      setLoading(true);
      const parsedMaxPerAction = parseUnits(maxPerAction || '100', 6);

      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'join',
        args: [BigInt(groupId), parsedMaxPerAction],
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/groups/${groupId}`);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Join failed');
    } finally {
      setLoading(false);
    }
  };

  const groupName = rawGroup ? (rawGroup as any).config.name : `Group #${groupId}`;

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <main className="flex-1 p-4 flex items-center justify-center">
        <div className="bg-white w-full max-w-sm rounded-2xl p-6 border border-slate-200 shadow-xl space-y-5 text-center">
          <div className="h-14 w-14 rounded-2xl bg-violet-100 text-violet-700 mx-auto flex items-center justify-center shadow-inner">
            <Users className="h-7 w-7" />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              You are invited to join
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">{groupName}</h2>
          </div>

          {isAlreadyMember ? (
            <div className="space-y-3">
              <div className="text-xs bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-200 font-semibold">
                You are already a member of this group!
              </div>
              <button
                onClick={() => router.push(`/groups/${groupId}`)}
                className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition"
              >
                Go to Group
              </button>
            </div>
          ) : success ? (
            <div className="py-4 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-slate-900">Joined successfully!</p>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-violet-600" />
                  Your Per-Action Safety Limit (mUSD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={maxPerAction}
                    onChange={e => setMaxPerAction(e.target.value)}
                    required
                    className="w-full text-base font-bold pl-7 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The maximum amount this group contract can debit from you in a single group payment or pull.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {loading ? 'Joining group onchain...' : 'Join Group'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CreditCard, Users, ArrowRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';

export default function PayForGroupDedicatedPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = Number(params.id);

  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const { data: rawGroup } = useReadContract({
    address: CONTRACT_ADDRESSES.groupPool,
    abi: GROUP_POOL_ABI,
    functionName: 'getGroup',
    args: [BigInt(groupId)],
  });

  const memberCount = rawGroup ? (rawGroup as any).memberCount : 1;
  const numAmount = parseFloat(amount) || 0;
  const count = Math.max(1, memberCount);
  const share = numAmount > 0 ? (numAmount / count).toFixed(2) : '0.00';
  const othersShareSum = numAmount > 0 ? ((numAmount / count) * (count - 1)).toFixed(2) : '0.00';

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payee || !amount || numAmount <= 0) return;

    try {
      setLoading(true);
      const parsedAmount = parseUnits(amount, 6);

      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'payForGroup',
        args: [BigInt(groupId), payee as `0x${string}`, parsedAmount, memo || 'Group Expense'],
      });

      setSuccessMsg(`Paid $${amount} to payee! Reimbursed $${othersShareSum} from group.`);
      setTimeout(() => {
        router.push(`/groups/${groupId}`);
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header />

      <main className="flex-1 p-4 space-y-5">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Group
        </button>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg">Pay For The Group</h2>
              <p className="text-xs text-slate-500">Group #{groupId} settlement</p>
            </div>
          </div>

          {successMsg ? (
            <div className="py-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-bold text-slate-900 text-sm">{successMsg}</p>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payee / Merchant Address
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Bill Amount (mUSD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="w-full text-lg font-bold pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note / Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dinner, Hotel, Cab"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-xs space-y-2.5 border border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    Split across {count} members
                  </span>
                  <span className="font-semibold">${share} each</span>
                </div>
                <div className="flex justify-between font-bold text-violet-700 pt-2 border-t border-slate-200 text-sm">
                  <span>Reimbursed to you</span>
                  <span>+${othersShareSum} mUSD</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Any member without sufficient balance or allowance becomes an onchain IOU.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {loading ? 'Paying onchain...' : `Confirm & Pay $${amount || '0.00'}`}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

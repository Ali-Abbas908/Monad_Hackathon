'use client';

import React, { useState } from 'react';
import { parseUnits } from 'viem';
import { useWriteContract } from 'wagmi';
import { CreditCard, Users, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';

interface PaySheetProps {
  groupId: number;
  memberCount: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaySheet({
  groupId,
  memberCount,
  isOpen,
  onClose,
  onSuccess,
}: PaySheetProps) {
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  if (!isOpen) return null;

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
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pay For The Group</h3>
              <p className="text-xs text-slate-500">Pay now, get reimbursed automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
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
                Payee Address / Merchant
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={payee}
                onChange={e => setPayee(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Amount (mUSD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  className="w-full text-base font-bold pl-7 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                What is this for? (Memo)
              </label>
              <input
                type="text"
                placeholder="e.g. Dinner, Drinks, Taxi"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-violet-600"
              />
            </div>

            {/* Split breakdown breakdown */}
            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  Split across {count} members
                </span>
                <span className="font-semibold">${share} each</span>
              </div>
              <div className="flex justify-between font-bold text-violet-700 pt-1 border-t border-slate-200">
                <span>Auto-reimbursed to you</span>
                <span>+${othersShareSum} mUSD</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              {loading ? 'Processing onchain...' : `Confirm & Pay $${amount || '0.00'}`}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

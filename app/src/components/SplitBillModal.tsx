'use client';

import React, { useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { useWriteContract, useReadContract } from 'wagmi';
import { Receipt, X, PlusCircle, CheckCircle2, ArrowRightLeft, DollarSign } from 'lucide-react';
import { CONTRACT_ADDRESSES, GROUP_POOL_ABI } from '@/lib/contracts';

interface SplitBillModalProps {
  groupId: number;
  members: string[];
  currentAddress?: `0x${string}`;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SplitBillModal({
  groupId,
  members,
  currentAddress,
  isOpen,
  onClose,
  onSuccess,
}: SplitBillModalProps) {
  const [tab, setTab] = useState<'add' | 'settle'>('add');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [creditor, setCreditor] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [offsetA, setOffsetA] = useState('');
  const [offsetB, setOffsetB] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  if (!isOpen) return null;

  const toggleParticipant = (addr: string) => {
    if (selectedParticipants.includes(addr)) {
      setSelectedParticipants(selectedParticipants.filter(a => a !== addr));
    } else {
      setSelectedParticipants([...selectedParticipants, addr]);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || selectedParticipants.length === 0) return;

    try {
      setLoading(true);
      const parsedAmount = parseUnits(amount, 6);

      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'addExpense',
        args: [
          BigInt(groupId),
          parsedAmount,
          selectedParticipants as `0x${string}`[],
          memo || 'Split Expense',
        ],
      });

      setSuccessMsg('Expense added and split into IOUs!');
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditor || !settleAmount) return;

    try {
      setLoading(true);
      const parsedAmount = parseUnits(settleAmount, 6);

      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'settleDebt',
        args: [BigInt(groupId), creditor as `0x${string}`, parsedAmount],
      });

      setSuccessMsg(`Settled $${settleAmount} to creditor!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to settle debt');
    } finally {
      setLoading(false);
    }
  };

  const handleOffset = async () => {
    if (!offsetA || !offsetB) return;
    try {
      setLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.groupPool,
        abi: GROUP_POOL_ABI,
        functionName: 'offset',
        args: [BigInt(groupId), offsetA as `0x${string}`, offsetB as `0x${string}`],
      });

      setSuccessMsg('Debts netted and offset successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to offset debts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Split Bill & IOUs</h3>
              <p className="text-xs text-slate-500">Track and settle debts onchain</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setTab('add')}
            className={`flex-1 py-1.5 rounded-md transition ${tab === 'add' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Add Outside Expense
          </button>
          <button
            onClick={() => setTab('settle')}
            className={`flex-1 py-1.5 rounded-md transition ${tab === 'settle' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Settle or Offset
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="font-bold text-slate-900 text-sm">{successMsg}</p>
          </div>
        ) : tab === 'add' ? (
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Expense Amount (mUSD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="w-full text-base font-bold px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Note
              </label>
              <input
                type="text"
                placeholder="e.g. Taxi fare, Groceries"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Participants Sharing This Expense
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50">
                {members.map(m => {
                  const isSelected = selectedParticipants.includes(m);
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => toggleParticipant(m)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition ${
                        isSelected ? 'bg-indigo-600 text-white font-semibold' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span>{m.slice(0, 8)}...{m.slice(-6)}</span>
                      <span>{isSelected ? 'Included' : 'Tap to add'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || selectedParticipants.length === 0}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition"
            >
              {loading ? 'Recording expense...' : 'Record Split Expense'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleSettle} className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Settle IOU Debt
              </h4>
              <input
                type="text"
                placeholder="Creditor address (0x...)"
                value={creditor}
                onChange={e => setCreditor(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount to pay (mUSD)"
                value={settleAmount}
                onChange={e => setSettleAmount(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-bold"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                {loading ? 'Settling...' : 'Pay Creditor Onchain'}
              </button>
            </form>

            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600" />
                Offset Overlapping Debts
              </h4>
              <p className="text-[11px] text-slate-500">
                Cancel reciprocal IOUs between two members in one call.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Member A"
                  value={offsetA}
                  onChange={e => setOffsetA(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 font-mono"
                />
                <input
                  type="text"
                  placeholder="Member B"
                  value={offsetB}
                  onChange={e => setOffsetB(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleOffset}
                disabled={loading || !offsetA || !offsetB}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition"
              >
                {loading ? 'Netting...' : 'Offset Overlapping IOUs'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, maxUint256 } from 'viem';
import { Coins, ShieldCheck, User as UserIcon, LogOut, CheckCircle2 } from 'lucide-react';
import { CONTRACT_ADDRESSES, MOCK_USD_ABI } from '@/lib/contracts';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

export function Header() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { address } = useAccount();
  const walletAddress = address || (user?.wallet?.address as `0x${string}`);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  // Read mUSD balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSD,
    abi: MOCK_USD_ABI,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: !!walletAddress },
  });

  // Read allowance to GroupPool
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACT_ADDRESSES.mockUSD,
    abi: MOCK_USD_ABI,
    functionName: 'allowance',
    args: walletAddress ? [walletAddress, CONTRACT_ADDRESSES.groupPool] : undefined,
    query: { enabled: !!walletAddress },
  });

  const isApproved = allowance ? (allowance as bigint) > 1000000000n : false;

  useEffect(() => {
    if (!walletAddress) return;
    async function loadProfile() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', walletAddress.toLowerCase())
          .single();

        if (data) {
          setProfile({
            id: data.id,
            walletAddress: data.wallet_address,
            displayName: data.display_name,
            avatarUrl: data.avatar_url,
          });
        } else {
          // Set fallback profile
          const short = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
          setProfile({
            id: 'local',
            walletAddress: walletAddress.toLowerCase(),
            displayName: user?.email?.address?.split('@')[0] || short,
            avatarUrl: null,
          });
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    }
    loadProfile();
  }, [walletAddress, user]);

  const handleFaucet = async () => {
    if (!walletAddress) return;
    try {
      setFaucetLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.mockUSD,
        abi: MOCK_USD_ABI,
        functionName: 'faucet',
      });
      setNotification('Received 1,000 mUSD from faucet!');
      setTimeout(() => setNotification(null), 4000);
      refetchBalance();
    } catch (err: any) {
      alert(err.message || 'Faucet cooldown active or error');
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleEnableGroupPayments = async () => {
    if (!walletAddress) return;
    try {
      setApproveLoading(true);
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.mockUSD,
        abi: MOCK_USD_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.groupPool, maxUint256],
      });
      setNotification('Group payments enabled!');
      setTimeout(() => setNotification(null), 4000);
      refetchAllowance();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setApproveLoading(false);
    }
  };

  const formattedBalance = balance ? Number(formatUnits(balance as bigint, 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  return (
    <header className="border-b border-slate-100 bg-white px-4 py-3 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-violet-700 font-bold text-lg tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white font-extrabold text-base shadow-sm">
            GP
          </span>
          <span>Group Pay</span>
        </a>

        {ready && authenticated ? (
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-800">
                {profile?.displayName || 'Member'}
              </div>
              <div className="text-xs text-violet-600 font-medium">
                ${formattedBalance} mUSD
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 shadow-sm transition"
          >
            Sign In
          </button>
        )}
      </div>

      {notification && (
        <div className="mt-2 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {notification}
        </div>
      )}

      {ready && authenticated && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
          <button
            onClick={handleFaucet}
            disabled={faucetLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            {faucetLoading ? 'Minting...' : 'Get Test mUSD'}
          </button>

          {!isApproved ? (
            <button
              onClick={handleEnableGroupPayments}
              disabled={approveLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium border border-violet-200 transition"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
              {approveLoading ? 'Approving...' : 'Enable Group Pay'}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Payments Enabled
            </span>
          )}
        </div>
      )}
    </header>
  );
}

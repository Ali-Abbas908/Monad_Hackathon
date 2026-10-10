'use client';

import React from 'react';
import { formatUnits } from 'viem';
import { Target, Users, Shield, CheckCircle } from 'lucide-react';
import { Group } from '@/lib/types';

interface PoolProgressProps {
  group: Group;
}

export function PoolProgress({ group }: PoolProgressProps) {
  const balance = Number(formatUnits(group.balance, 6));
  const goal = Number(formatUnits(group.config.goal, 6));
  const progressPercent = goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0;

  return (
    <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-medium">
              {group.config.mode} Mode
            </span>
            {group.status === 'Ready' ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-bold flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Ready
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-bold">
                Saving
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight">{group.config.name}</h2>
        </div>

        <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-xs">
          <Users className="h-3.5 w-3.5 text-violet-200" />
          <span>{group.memberCount} members</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-xs text-violet-200 uppercase tracking-wider font-semibold">
          Pool Balance
        </div>
        <div className="text-3xl font-extrabold tracking-tight">
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-sm font-normal text-violet-200 ml-1.5">mUSD</span>
        </div>
      </div>

      {goal > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-violet-100 mb-1 font-medium">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" /> Goal: ${goal.toLocaleString('en-US')}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

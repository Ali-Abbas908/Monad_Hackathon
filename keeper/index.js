import dotenv from 'dotenv';
dotenv.config();

import { createPublicClient, createWalletClient, http, decodeEventLog } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@supabase/supabase-js';
import { GROUP_POOL_ABI } from './abi.js';

const RPC_URL = process.env.RPC_URL || 'https://testnet-rpc.monad.xyz';
const GROUP_POOL_ADDRESS = (process.env.GROUP_POOL_ADDRESS || '0x0000000000000000000000000000000000000000');
const KEEPER_KEY = process.env.KEEPER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

const account = privateKeyToAccount(KEEPER_KEY);
const walletClient = createWalletClient({
  account,
  transport: http(RPC_URL),
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log(`[Keeper] Starting keeper with wallet: ${account.address}`);
console.log(`[Keeper] Target GroupPool: ${GROUP_POOL_ADDRESS}`);

export async function runPeriodicPull() {
  if (GROUP_POOL_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return;
  }

  try {
    const groupCount = await publicClient.readContract({
      address: GROUP_POOL_ADDRESS,
      abi: GROUP_POOL_ABI,
      functionName: 'groupCount',
    });

    const now = BigInt(Math.floor(Date.now() / 1000));

    for (let gId = 1n; gId <= groupCount; gId++) {
      try {
        const group = await publicClient.readContract({
          address: GROUP_POOL_ADDRESS,
          abi: GROUP_POOL_ABI,
          functionName: 'getGroup',
          args: [gId],
        });

        // If no contribution amount or group already Ready (status == 1), skip
        if (group.config.contributionAmount === 0n || group.status === 1) {
          continue;
        }

        const members = await publicClient.readContract({
          address: GROUP_POOL_ADDRESS,
          abi: GROUP_POOL_ABI,
          functionName: 'members',
          args: [gId],
        });

        for (const member of members) {
          try {
            const [, maxPerAction, lastPulledAt] = await publicClient.readContract({
              address: GROUP_POOL_ADDRESS,
              abi: GROUP_POOL_ABI,
              functionName: 'memberInfo',
              args: [gId, member],
            });

            // Check cap
            if (group.config.contributionAmount > maxPerAction) {
              continue;
            }

            // Check period
            const isDue = lastPulledAt === 0n || now >= BigInt(lastPulledAt) + BigInt(group.config.period);
            if (!isDue) {
              continue;
            }

            console.log(`[Keeper] Pulling contribution for group ${gId}, member ${member}`);
            const hash = await walletClient.writeContract({
              address: GROUP_POOL_ADDRESS,
              abi: GROUP_POOL_ABI,
              functionName: 'pull',
              args: [gId, member],
            });
            console.log(`[Keeper] Pull tx submitted: ${hash}`);
          } catch (memberErr) {
            console.warn(`[Keeper] Skipped member ${member} in group ${gId}: ${memberErr.message}`);
          }
        }
      } catch (groupErr) {
        console.warn(`[Keeper] Error processing group ${gId}: ${groupErr.message}`);
      }
    }
  } catch (err) {
    console.error(`[Keeper] Periodic pull error:`, err);
  }
}

export async function runEventIndexer() {
  if (GROUP_POOL_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return;
  }

  try {
    let fromBlock = 0n;
    const { data: syncData } = await supabase
      .from('sync_state')
      .select('last_block')
      .eq('id', 1)
      .single();

    if (syncData && syncData.last_block) {
      fromBlock = BigInt(syncData.last_block);
    }

    const currentBlock = await publicClient.getBlockNumber();
    if (fromBlock > currentBlock) {
      return;
    }

    const toBlock = currentBlock - fromBlock > 2000n ? fromBlock + 2000n : currentBlock;

    const logs = await publicClient.getLogs({
      address: GROUP_POOL_ADDRESS,
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      try {
        const item = formatEventForFeed(log);
        if (item) {
          await supabase.from('feed_items').upsert(
            {
              group_id: Number(item.groupId),
              kind: item.kind,
              actor: item.actor,
              payload: item.payload,
              tx_hash: log.transactionHash,
              log_index: Number(log.logIndex),
            },
            { onConflict: 'tx_hash,log_index' }
          );
        }
      } catch (itemErr) {
        console.warn(`[Keeper] Error inserting feed item for log ${log.transactionHash}:`, itemErr.message);
      }
    }

    await supabase.from('sync_state').upsert({
      id: 1,
      last_block: Number(toBlock + 1n),
    });
  } catch (err) {
    console.error(`[Keeper] Event indexer error:`, err);
  }
}

function formatEventForFeed(log) {
  try {
    const decoded = decodeEventLog({
      abi: GROUP_POOL_ABI,
      data: log.data,
      topics: log.topics,
    });

    const { eventName, args } = decoded;

    switch (eventName) {
      case 'GroupCreated':
        return {
          groupId: args.groupId,
          kind: 'group_created',
          actor: args.creator,
          payload: { name: args.name, mode: Number(args.mode), goal: args.goal.toString() },
        };
      case 'MemberJoined':
        return {
          groupId: args.groupId,
          kind: 'member_joined',
          actor: args.member,
          payload: {},
        };
      case 'MemberLeft':
        return {
          groupId: args.groupId,
          kind: 'member_left',
          actor: args.member,
          payload: { refunded: args.refunded.toString() },
        };
      case 'Contributed':
        return {
          groupId: args.groupId,
          kind: 'contributed',
          actor: args.member,
          payload: {
            amount: args.amount.toString(),
            newBalance: args.newBalance.toString(),
            viaPull: args.viaPull,
          },
        };
      case 'GoalReached':
        return {
          groupId: args.groupId,
          kind: 'goal_reached',
          actor: null,
          payload: { balance: args.balance.toString() },
        };
      case 'Spent':
        return {
          groupId: args.groupId,
          kind: 'spent',
          actor: args.by,
          payload: { to: args.to, amount: args.amount.toString(), memo: args.memo },
        };
      case 'DelegateVoted':
        return {
          groupId: args.groupId,
          kind: 'delegate_voted',
          actor: args.voter,
          payload: { candidate: args.candidate },
        };
      case 'DelegateChanged':
        return {
          groupId: args.groupId,
          kind: 'delegate_changed',
          actor: null,
          payload: { newDelegate: args.newDelegate },
        };
      case 'ProposalCreated':
        return {
          groupId: args.groupId,
          kind: 'proposal_created',
          actor: args.proposer,
          payload: {
            proposalId: args.proposalId.toString(),
            to: args.to,
            amount: args.amount.toString(),
            memo: args.memo,
            expiresAt: args.expiresAt.toString(),
          },
        };
      case 'ProposalApproved':
        return {
          groupId: args.groupId,
          kind: 'proposal_approved',
          actor: args.member,
          payload: {
            proposalId: args.proposalId.toString(),
            approvals: Number(args.approvals),
          },
        };
      case 'ProposalExecuted':
        return {
          groupId: args.groupId,
          kind: 'proposal_executed',
          actor: null,
          payload: { proposalId: args.proposalId.toString() },
        };
      case 'GroupPayment':
        return {
          groupId: args.groupId,
          kind: 'group_payment',
          actor: args.payer,
          payload: {
            paymentId: args.paymentId.toString(),
            to: args.to,
            amount: args.amount.toString(),
            share: args.share.toString(),
            memo: args.memo,
          },
        };
      case 'ShareDebited':
        return {
          groupId: args.groupId,
          kind: 'share_debited',
          actor: args.member,
          payload: {
            paymentId: args.paymentId.toString(),
            amount: args.amount.toString(),
          },
        };
      case 'ShareShortfall':
        return {
          groupId: args.groupId,
          kind: 'share_shortfall',
          actor: args.member,
          payload: {
            paymentId: args.paymentId.toString(),
            amount: args.amount.toString(),
          },
        };
      case 'ExpenseAdded':
        return {
          groupId: args.groupId,
          kind: 'expense_added',
          actor: args.payer,
          payload: {
            amount: args.amount.toString(),
            share: args.share.toString(),
            memo: args.memo,
          },
        };
      case 'DebtSettled':
        return {
          groupId: args.groupId,
          kind: 'debt_settled',
          actor: args.debtor,
          payload: {
            creditor: args.creditor,
            amount: args.amount.toString(),
          },
        };
      case 'DebtOffset':
        return {
          groupId: args.groupId,
          kind: 'debt_offset',
          actor: null,
          payload: {
            a: args.a,
            b: args.b,
            amount: args.amount.toString(),
          },
        };
      default:
        return null;
    }
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('[Keeper] Running keeper loop...');
  await runPeriodicPull();
  await runEventIndexer();

  setInterval(async () => {
    await runPeriodicPull();
    await runEventIndexer();
  }, 10000);
}

if (process.env.RUN_ONCE) {
  Promise.all([runPeriodicPull(), runEventIndexer()]).then(() => {
    console.log('[Keeper] Single run complete.');
    process.exit(0);
  });
} else {
  main().catch(err => {
    console.error('[Keeper] Fatal error in main loop:', err);
    process.exit(1);
  });
}

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FeedItem, Comment } from '@/lib/types';
import { MessageSquare, Send, Clock, DollarSign, UserCheck, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface FeedListProps {
  groupId: number;
  currentAddress?: `0x${string}`;
}

export function FeedList({ groupId, currentAddress }: FeedListProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [commentsByItem, setCommentsByItem] = useState<Record<number, Comment[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>({});
  const [newCommentBody, setNewCommentBody] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<number | null>(null);

  useEffect(() => {
    async function loadFeed() {
      const { data } = await supabase
        .from('feed_items')
        .select('*')
        .eq('group_id', groupId)
        .order('id', { ascending: false });

      if (data) {
        const mapped: FeedItem[] = data.map((d: any) => ({
          id: d.id,
          groupId: d.group_id,
          kind: d.kind,
          actor: d.actor,
          payload: d.payload || {},
          txHash: d.tx_hash,
          logIndex: d.log_index,
          createdAt: d.created_at,
        }));
        setFeedItems(mapped);

        // Load comments for these feed items
        const itemIds = mapped.map(i => i.id);
        if (itemIds.length > 0) {
          const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .in('feed_item_id', itemIds)
            .order('id', { ascending: true });

          if (comments) {
            const map: Record<number, Comment[]> = {};
            comments.forEach((c: any) => {
              if (!map[c.feed_item_id]) map[c.feed_item_id] = [];
              map[c.feed_item_id].push({
                id: c.id,
                feedItemId: c.feed_item_id,
                author: c.author,
                body: c.body,
                createdAt: c.created_at,
              });
            });
            setCommentsByItem(map);
          }
        }
      }
    }

    loadFeed();

    // Subscribe to new feed_items for this group
    const channel = supabase
      .channel(`feed_group_${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_items', filter: `group_id=eq.${groupId}` },
        (payload: any) => {
          const newItem: FeedItem = {
            id: payload.new.id,
            groupId: payload.new.group_id,
            kind: payload.new.kind,
            actor: payload.new.actor,
            payload: payload.new.payload || {},
            txHash: payload.new.tx_hash,
            logIndex: payload.new.log_index,
            createdAt: payload.new.created_at,
          };
          setFeedItems(prev => [newItem, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload: any) => {
          const newComment: Comment = {
            id: payload.new.id,
            feedItemId: payload.new.feed_item_id,
            author: payload.new.author,
            body: payload.new.body,
            createdAt: payload.new.created_at,
          };
          setCommentsByItem(prev => ({
            ...prev,
            [newComment.feedItemId]: [...(prev[newComment.feedItemId] || []), newComment],
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  const handleAddComment = async (feedItemId: number) => {
    const text = newCommentBody[feedItemId]?.trim();
    if (!text || !currentAddress) return;

    try {
      setSubmittingComment(feedItemId);
      const { data, error } = await supabase.from('comments').insert({
        feed_item_id: feedItemId,
        author: currentAddress,
        body: text,
      }).select().single();

      if (data) {
        setNewCommentBody(prev => ({ ...prev, [feedItemId]: '' }));
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setSubmittingComment(null);
    }
  };

  const formatFeedSentence = (item: FeedItem): string => {
    const p = item.payload;
    const actorShort = item.actor ? `${item.actor.slice(0, 6)}...` : 'Member';
    const fmt = (amt: any) => {
      const num = Number(amt) / 1e6;
      return isNaN(num) ? String(amt) : num.toFixed(2);
    };

    switch (item.kind) {
      case 'group_created':
        return `${actorShort} created ${p.name || 'the group'}`;
      case 'member_joined':
        return `${actorShort} joined`;
      case 'member_left':
        return `${actorShort} left and received $${fmt(p.refunded)}`;
      case 'contributed':
        return `${actorShort} added $${fmt(p.amount)}`;
      case 'goal_reached':
        return `Goal reached: $${fmt(p.balance)}`;
      case 'spent':
        return `${actorShort} paid $${fmt(p.amount)}${p.memo ? ` for ${p.memo}` : ''}`;
      case 'delegate_voted':
        return `${actorShort} voted for a spender`;
      case 'delegate_changed':
        return `New group delegate appointed`;
      case 'proposal_created':
        return `${actorShort} proposed $${fmt(p.amount)}${p.memo ? ` for ${p.memo}` : ''}`;
      case 'proposal_approved':
        return `${actorShort} approved proposal (${p.approvals || ''})`;
      case 'proposal_executed':
        return `Proposal executed and paid`;
      case 'group_payment':
        return `${actorShort} paid $${fmt(p.amount)}; each share is $${fmt(p.share)}`;
      case 'share_debited':
        return `${actorShort}'s share of $${fmt(p.amount)} was debited`;
      case 'share_shortfall':
        return `${actorShort} owes $${fmt(p.amount)} (recorded as IOU)`;
      case 'expense_added':
        return `${actorShort} added an expense of $${fmt(p.amount)}`;
      case 'debt_settled':
        return `${actorShort} settled debt of $${fmt(p.amount)}`;
      case 'debt_offset':
        return `Overlapping debts were netted ($${fmt(p.amount)})`;
      default:
        return `${actorShort} triggered ${item.kind}`;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
        <span>Activity Feed</span>
        <span>{feedItems.length} events</span>
      </div>

      {feedItems.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
          No activity yet. Be the first to contribute or pay!
        </div>
      ) : (
        <div className="space-y-2">
          {feedItems.map(item => {
            const comments = commentsByItem[item.id] || [];
            const isExpanded = expandedComments[item.id];

            return (
              <div key={item.id} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-slate-200 transition">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                    {item.kind.includes('payment') || item.kind.includes('spent') || item.kind.includes('contributed') ? (
                      <DollarSign className="h-3.5 w-3.5" />
                    ) : item.kind.includes('proposal') ? (
                      <UserCheck className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      {formatFeedSentence(item)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={() => setExpandedComments(prev => ({ ...prev, [item.id]: !isExpanded }))}
                        className="flex items-center gap-1 hover:text-violet-600 font-medium"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comment thread */}
                {isExpanded && (
                  <div className="mt-3 pl-9 border-t border-slate-50 pt-2 space-y-2">
                    {comments.map(c => (
                      <div key={c.id} className="text-xs bg-slate-50 p-2 rounded-lg">
                        <span className="font-bold text-slate-700 mr-1.5">
                          {c.author.slice(0, 6)}...:
                        </span>
                        <span className="text-slate-600">{c.body}</span>
                      </div>
                    ))}

                    <div className="flex items-center gap-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={newCommentBody[item.id] || ''}
                        onChange={e => setNewCommentBody(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddComment(item.id);
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(item.id)}
                        disabled={submittingComment === item.id}
                        className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition"
                      >
                        <Send className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

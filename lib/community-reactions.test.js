import { describe, it, expect } from 'vitest';
import { applyReaction, COMMUNITY_REACTIONS, reactionMeta, threadReplies, topReactions } from '@/lib/community-reactions';

describe('community reactions (client mirror)', () => {
  it('carries the same six kinds as the server catalogue, in order', () => {
    expect(COMMUNITY_REACTIONS.map((r) => r.kind)).toEqual([
      'like', 'helpful', 'insightful', 'thanks', 'great_explanation', 'agree',
    ]);
    expect(reactionMeta('great_explanation').label).toBe('Great explanation');
    expect(reactionMeta('love')).toBeNull();
  });

  it('topReactions drops zeros and unknowns, most used first, catalogue order on a tie', () => {
    const top = topReactions({ like: 1, agree: 3, helpful: 1, love: 9, thanks: 0 });
    expect(top.map((r) => [r.kind, r.count])).toEqual([['agree', 3], ['like', 1], ['helpful', 1]]);
  });

  it('applyReaction keeps one reaction per person', () => {
    const s0 = { myReaction: null, likeCount: 2, reactions: { like: 2 } };
    const s1 = applyReaction(s0, 'helpful');
    expect(s1).toEqual({ myReaction: 'helpful', likeCount: 3, reactions: { like: 2, helpful: 1 } });
    const s2 = applyReaction(s1, 'agree');
    expect(s2).toEqual({ myReaction: 'agree', likeCount: 3, reactions: { like: 2, helpful: 0, agree: 1 } });
    const s3 = applyReaction(s2, null);
    expect(s3).toEqual({ myReaction: null, likeCount: 2, reactions: { like: 2, helpful: 0, agree: 0 } });
    expect(applyReaction(s3, null)).toBe(s3);
  });

  it('threadReplies nests responses and keeps an orphaned response visible', () => {
    const t = threadReplies([
      { id: 1, parentReplyId: null },
      { id: 2, parentReplyId: 1 },
      { id: 3, parentReplyId: null },
      { id: 4, parentReplyId: 99 },
      { id: 5, parentReplyId: 1 },
    ]);
    expect(t.map((r) => [r.id, r.responses.map((c) => c.id)])).toEqual([[1, [2, 5]], [3, []], [4, []]]);
  });
});

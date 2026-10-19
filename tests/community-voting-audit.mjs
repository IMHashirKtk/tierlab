import assert from 'node:assert/strict';
import { fetchSharedTierList, toggleUpvote, toggleCommentUpvote } from '../src/lib/community.ts';
import { setMockSupabaseClient, setMockSessionUserId, resetMockSupabaseClient, resetMockSessionUserId } from '../src/lib/supabase.ts';

const storage = new Map();
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) };
globalThis.window = {};
let count = 1;
let voted = true;
let failVote = false;
let missing = false;
let failRead = false;
storage.set('tl_published_rankings', JSON.stringify([{ id:'ranking', title:'Stale', upvotes:0 }]));
storage.set('tl_user_upvotes', JSON.stringify({ranking:false}));
setMockSessionUserId('user');
setMockSupabaseClient({
  from(table) {
    const filters = {};
    return {
      select() { return this; },
      eq(k,v) { filters[k]=v; return this; },
      async maybeSingle() {
        if (failRead) return {data:null,error:{message:'offline'}};
        if(table==='upvotes') {
          assert.equal(filters.voter_hash,'user');
          return {data:voted?{item_id:filters.item_id}:null,error:null};
        }
        assert.equal(table,'tier_lists');
        return {data:missing?null:{id:'ranking',title:'Cloud title',tiers:[],unranked:[],upvotes:count,created_at:'2026-10-19'},error:null};
      },
    };
  },
  async rpc(name,args) {
    assert.equal(name,'set_vote');
    if(failVote) return {data:null,error:{message:'unavailable'}};
    if(voted!==args.desired_vote) count+=args.desired_vote?1:-1;
    voted=args.desired_vote;
    return {data:{isUpvoted:voted,newCount:count},error:null};
  },
});
try {
  assert.equal((await fetchSharedTierList('ranking')).upvotes,1);
  assert.equal((await fetchSharedTierList('ranking')).title,'Cloud title');
  assert.deepEqual(await toggleUpvote('tier_list','ranking'),{isUpvoted:false,newCount:0});
  assert.equal((await fetchSharedTierList('ranking')).upvotes,0);
  assert.deepEqual(await toggleCommentUpvote('comment'),{isUpvoted:true,newCount:1});
  assert.deepEqual(await toggleCommentUpvote('comment'),{isUpvoted:false,newCount:0});
  const previousFlags=storage.get('tl_comment_upvotes');
  failVote=true;
  await assert.rejects(()=>toggleCommentUpvote('comment'),/temporarily unavailable/);
  assert.equal(storage.get('tl_comment_upvotes'),previousFlags);
  failVote=false;
  missing=true;
  assert.equal(await fetchSharedTierList('ranking'),null);
  failRead=true;
  assert.equal((await fetchSharedTierList('ranking')).title,'Cloud title');
  console.log('PASS: cloud counts beat stale cache; server vote state beats stale browser flags; zero counts, failed votes, deleted rows, and offline fallback');
} finally {
  resetMockSupabaseClient(); resetMockSessionUserId();
  delete globalThis.window; delete globalThis.localStorage;
}

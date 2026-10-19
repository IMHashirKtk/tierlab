import assert from "node:assert/strict";
import { presentTemplate, isDiscoverableRanking, isDiscoverableTemplate } from "../src/lib/catalog.ts";

const starter = {
  id: "elden-ring-bosses", title: "Bosses", author: { username: "EldenLord", verified: true },
  upvotes: 3840, remixCount: 14280, createdAt: "2h ago",
  items: [{ id: "one", name: "Malenia", imageUrl: "https://images.unsplash.com/unrelated.jpg" }],
};
const presented = presentTemplate(starter);
assert.equal(presented.title, "Elden Ring Bosses: Base Game & DLC Selection");
assert.equal(presented.author.username, "Template Library");
assert.equal(presented.author.verified, undefined);
assert.equal(presented.upvotes, 0);
assert.equal(presented.remixCount, 0);
assert.equal(presented.items[0].imageUrl, undefined);
assert.equal(starter.upvotes, 3840, "Presentation must not mutate stored data");

const userTemplate = { ...starter, id: "user-original", author: { username: "Actual Creator" } };
assert.equal(presentTemplate(userTemplate), userTemplate, "User content and genuine counters must be preserved");

const ranking = { id: "user-ranking", title: "Elden Ring Bosses (Audited)", tiers: [{ items: [{ id: "one" }] }] };
assert.equal(isDiscoverableRanking(ranking), true, "A real one-item ranking must not be hidden because of its title");
assert.equal(isDiscoverableRanking({ ...ranking, id: "share-tier-mv9mh45c-89727d0d" }), false);
assert.equal(isDiscoverableRanking({ ...ranking, tiers: [{ items: [] }] }), false);
for (const id of ['share-tier-mvex6e15-6c189f46','share-tier-mvexofpx-a3293b8a','share-tier-mvey922q-10c74f96']) {
  assert.equal(isDiscoverableRanking({...ranking,id}),false);
}
assert.equal(isDiscoverableTemplate({id:'launch-test-reusable-template-h3mu'}),false);
assert.equal(isDiscoverableTemplate({id:'real-template-called-test'}),true);
console.log("PASS: starter attribution, honest statistics, artwork, fixture exclusion, and preservation of user content");

import assert from 'node:assert/strict';
import { ANALYTICS_CONSENT_KEY, readAnalyticsConsent, updateAnalyticsConsent, applyAnalyticsConsent, initializeAnalytics, analyticsPage, trackAnalyticsPage } from '../src/lib/analytics.ts';

const storage = new Map();
globalThis.window = Object.assign(new EventTarget(), {localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
globalThis.location = {origin:'https://tierlistmaker.app',hostname:'tierlistmaker.app',pathname:'/template/blox-fruits-fruits'};
const cookieWrites=[];
globalThis.document = {referrer:'https://www.google.com/search?q=private-search'};
Object.defineProperty(document,'cookie',{get:()=> '_ga=example; _ga_EB8LN74C3Q=example; tl_draft=keep',set:v=>cookieWrites.push(v)});
const id='G-EB8LN74C3Q';
try {
  assert.equal(readAnalyticsConsent(),null);
  assert.equal(initializeAnalytics(id),false);
  trackAnalyticsPage(id,'/create');
  assert.equal(window.dataLayer,undefined,'No queue or collection without explicit consent');
  assert(updateAnalyticsConsent('denied',id));
  assert.equal(initializeAnalytics(id),false);
  assert.equal(window.gtag,undefined,'Decline must not initialize a Google tag');
  assert(updateAnalyticsConsent('granted',id));
  assert(initializeAnalytics(id));
  const config=window.dataLayer.find(e=>e[0]==='config');
  assert.equal(Object.prototype.toString.call(config),'[object Arguments]','Google must recognize the documented gtag command format');
  assert.equal(config[1],id);
  assert.equal(config[2].send_page_view,false,'Automatic page views disabled to prevent duplicate SPA events');
  assert.equal(config[2].allow_google_signals,false);
  trackAnalyticsPage(id,'/template/blox-fruits-fruits');
  const first=window.dataLayer.find(e=>e[0]==='event');
  assert.equal(first[1],'page_view');
  assert.equal(first[2].page_referrer,'https://www.google.com/search');
  assert.equal(first[2].page_title,'Template | Tier List Maker');
  assert.deepEqual(analyticsPage('/user/private-name?email=person@example.com#private','https://tierlistmaker.app'),{page_location:'https://tierlistmaker.app/user/profile',page_title:'User | Tier List Maker'});
  const events=()=>window.dataLayer.filter(e=>e[0]==='event').length;
  const before=events();
  assert(updateAnalyticsConsent('denied',id));
  trackAnalyticsPage(id,'/categories/gaming');
  assert.equal(events(),before,'Withdrawal stops subsequent events');
  assert.equal(window['ga-disable-'+id],true);
  assert(cookieWrites.some(c=>c.startsWith('_ga=;')));
  assert(cookieWrites.every(c=>!c.startsWith('tl_draft=')),'Withdrawal must preserve application drafts');
  // A storage event in another tab can revoke this tab's loaded Google tag.
  storage.set(ANALYTICS_CONSENT_KEY,'denied');
  applyAnalyticsConsent('denied',id);
  assert.equal(window['ga-disable-'+id],true);
  console.log('PASS: opt-in default, decline, consent initialization order, manual page views, sanitized metadata/referrers, revocation, and draft-safe cookie cleanup');
} finally {delete globalThis.window;delete globalThis.location;delete globalThis.document;}

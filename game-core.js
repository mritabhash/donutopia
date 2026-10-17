/* Pure game rules shared by the UI and the smoke tests. */
(function(root){
'use strict';
const normalize=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9#]/g,'');
function match(q,input){const key=normalize(input);if(!key)return null;return q.answers.find(a=>normalize(a.answer)===key)||null;}
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function shuffled(items,seed){let n=seed>>>0;const a=[...items];for(let i=a.length-1;i>0;i--){n=(Math.imul(1664525,n)+1013904223)>>>0;const j=n%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function dateKey(date=new Date()){return date.toISOString().slice(0,10);}
function daily(bank,date=dateKey()){const pools={};for(const q of bank){if(q.category==='Quick maths')continue;(pools[q.category]??=[]).push(q);}return shuffled(Object.keys(pools),hash(date)).slice(0,7).map((cat,i)=>shuffled(pools[cat],hash(date+cat+i))[0]);}
function validateSession(s,bank){const ids=new Set(bank.map(q=>q.id));return !!(s&&Array.isArray(s.ids)&&s.ids.length>0&&s.ids.length<=10&&s.ids.every(id=>ids.has(id))&&Array.isArray(s.results)&&s.results.length<=s.ids.length&&s.results.every((r,i)=>r.id===s.ids[i]&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100)&&typeof s.mode==='string'&&typeof s.key==='string');}
root.DonutCore={normalize,match,hash,shuffled,dateKey,daily,validateSession};if(typeof module!=='undefined')module.exports=root.DonutCore;
})(typeof window!=='undefined'?window:globalThis);

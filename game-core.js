/* Rules verified against the original exported client. */
(function(root){
'use strict';
const PREVIEW_MS=3000,ANSWER_MS=25000,RULES=2;
const TIERS={plankton:{name:'Plankton',score:10,color:'#8fa3c4'},tooclever:{name:'Too Clever',score:15,color:'#ff9f43'},schooler:{name:'Schooler',score:30,color:'#4de3ff'},rare:{name:'Rare',score:60,color:'#ff5252'},deepcut:{name:'Deep Cut',score:85,color:'#9d7bff'},krillion:{name:'One in a Donutopia',score:100,color:'#ffd166'}};
const normalize=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9#]/g,'');
function match(q,input){const key=normalize(input);if(!key)return null;return q.answers.find(a=>[a.answer,...(a.aliases||[])].some(v=>normalize(v)===key))||null;}
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]!==b[j-1]));row=next;}return row[b.length];}
function correction(q,input){const key=normalize(input);if(key.length<4)return null;const limit=key.length>=8?2:1;let best=null,lowest=limit+1,tied=false;for(const a of q.answers){const n=Math.min(...[a.answer,...(a.aliases||[])].map(v=>{v=normalize(v);return Math.abs(v.length-key.length)>limit?limit+1:distance(key,v);}));if(n<lowest){lowest=n;best=a;tied=false;}else if(n===lowest&&best?.answer!==a.answer)tied=true;}return lowest<=limit&&!tied?best:null;}
function tier(answer){return answer?.tier||Object.keys(TIERS).find(k=>TIERS[k].score===answer?.score)||null;}
function eligible(q){return q.kind==='open'&&new Set(q.answers.map(a=>a.score)).size>1&&q.answers.every(a=>tier(a));}
function band(score){return score>=450?'krillion':score>=351?'deepcut':score>=251?'rare':score>=151?'schooler':'plankton';}
function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function shuffled(items,seed){let n=seed>>>0;const a=[...items];for(let i=a.length-1;i>0;i--){n=(Math.imul(1664525,n)+1013904223)>>>0;const j=n%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function dateKey(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function daily(bank,date=dateKey()){return shuffled(bank.filter(eligible),hash('daily:'+date)).slice(0,7);}
function validateSession(s,bank){const ids=new Set(bank.map(q=>q.id));return !!(s&&Array.isArray(s.ids)&&s.ids.length>0&&s.ids.length<=10&&s.ids.every(id=>ids.has(id))&&Array.isArray(s.results)&&s.results.length<=s.ids.length&&s.results.every((r,i)=>r.id===s.ids[i]&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100)&&typeof s.mode==='string'&&typeof s.key==='string'&&(s.rules!==RULES||(['intro','preview','answering','feedback','done'].includes(s.phase)&&(!['preview','answering'].includes(s.phase)||Number.isFinite(s.deadline)))));}
root.DonutCore={normalize,match,correction,tier,eligible,band,TIERS,PREVIEW_MS,ANSWER_MS,RULES,hash,shuffled,dateKey,daily,validateSession};if(typeof module!=='undefined')module.exports=root.DonutCore;
})(typeof window!=='undefined'?window:globalThis);

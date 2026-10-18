import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{dayInfo,selectQuestions,parseJudgment,VERSION} from '../worker.mjs';
const origin='https://mritabhash.github.io';
function request(path,body,site=origin){return new Request('https://donutopia-api.example.workers.dev'+path,{method:body?'POST':'GET',headers:{Origin:site,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},...(body?{body:JSON.stringify(body)}:{})});}
const pending=[];const ctx={waitUntil(p){pending.push(p)}};
function environment(){const cache=new Map;let calls=0;return {get calls(){return calls},AI:{async run(){calls++;return {choices:[{message:{content:JSON.stringify({valid:true,canonical:'test answer',tier:'rare',confidence:.95,reason:'Fits the prompt.'})}}]}}},JUDGMENTS:{async get(k){return cache.get(k)||null},async put(k,v){cache.set(k,JSON.parse(v))}},JUDGE_LIMITER:{async limit(){return {success:true}}}};}
test('daily boundaries and DST use the existing New York game calendar',()=>{
 assert.equal(dayInfo(new Date('2026-10-17T03:59:00Z')).date,'2026-10-16');
 assert.equal(dayInfo(new Date('2026-10-17T04:00:00Z')).date,'2026-10-17');
 assert.equal(dayInfo(new Date('2026-11-01T12:00:00Z')).resetsAt,'2026-11-02T05:00:00.000Z');
 assert.equal(dayInfo(new Date('2026-03-08T12:00:00Z')).resetsAt,'2026-03-09T04:00:00.000Z');
});
test('50 batches have 350 unique open-ended questions and deterministic order',()=>{
 const all=Array.from({length:50},(_,i)=>selectQuestions('daily',i+1)).flat();assert.equal(new Set(all.map(q=>q.id)).size,350);assert.deepEqual(selectQuestions('daily',9),selectQuestions('daily',9));
 for(const scope of ['movies','sports','geography','lexicon','unlimited'])assert.equal(new Set(selectQuestions(scope,100).map(q=>q.id)).size,7);
});
test('judge output is validated, bounded, and not trusted for numeric scores',()=>{
 assert.throws(()=>parseJudgment({response:'not json'}));assert.throws(()=>parseJudgment({response:{valid:true,canonical:'x',tier:'admin',confidence:1,reason:'x'}}));
 assert.throws(()=>parseJudgment({response:{valid:true,canonical:'x',tier:'rare',confidence:.3,reason:'x'}}));
 assert.equal(parseJudgment({response:{valid:true,canonical:'x',tier:'krillion',score:9999,confidence:.9,reason:'x'}}).score,100);
});
test('bank and valid submission use AI, then cache the same answer',async()=>{
 const env=environment();const today=await(await worker.fetch(request('/api/today'),env,ctx)).json();assert.equal(today.prompts.length,7);
 const body={date:today.date,promptId:today.prompts[0].id,answer:'test answer'};
 const first=await(await worker.fetch(request('/api/submit',body),env,ctx)).json();await Promise.all(pending);assert.equal(first.score,60);assert.equal(first.judging,'ai-estimate');
 await worker.fetch(request('/api/submit',body),env,ctx);assert.equal(env.calls,1);
});
test('forged prompts, foreign origins, versions and oversized bodies cannot call AI',async()=>{
 const env=environment();assert.equal((await worker.fetch(request('/api/today',null,'https://other.example'),env,ctx)).status,403);
 assert.equal((await worker.fetch(request('/api/submit',{date:dayInfo().date,promptId:'invented',answer:'x'}),env,ctx)).status,400);
 assert.equal((await worker.fetch(request('/api/unlimited/1/submit',{version:'wrong',round:'x',answer:'x'}),env,ctx)).status,409);
 assert.equal((await worker.fetch(request('/api/submit',{answer:'x'.repeat(3000)}),env,ctx)).status,400);assert.equal(env.calls,0);
});
test('provider failures, missing bindings and rate limits never become incorrect answers',async()=>{
 const body={date:dayInfo().date,promptId:selectQuestions('daily',dayInfo().dayNumber)[0].id,answer:'x'};
 assert.equal((await worker.fetch(request('/api/submit',body),{},ctx)).status,503);
 const env=environment();env.AI.run=async()=>{throw Error('quota exhausted')};let result=await worker.fetch(request('/api/submit',body),env,ctx);assert.equal(result.status,503);assert.equal((await result.json()).accepted,undefined);
 env.JUDGE_LIMITER.limit=async()=>({success:false});assert.equal((await worker.fetch(request('/api/submit',body),env,ctx)).status,429);
});

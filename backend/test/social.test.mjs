import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{verifyIdentity,streaks} from '../worker.mjs';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test-key'};
const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{'cache-control':'max-age=300'}});
const b64=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url');
async function token(sub,extra={}){const text=b64({alg:'RS256',kid:'test-key'})+'.'+b64({aud:'test-client',iss:'https://accounts.google.com',sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,...extra});return text+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,Buffer.from(text))).toString('base64url');}
function db(){const raw=new DatabaseSync(':memory:');raw.exec(readFileSync(new URL('../migrations/0001_accounts.sql',import.meta.url),'utf8'));raw.exec(readFileSync(new URL('../migrations/0002_rewards.sql',import.meta.url),'utf8'));return {raw,prepare(sql){return {bind(...args){return {async first(){return raw.prepare(sql).get(...args)||null},async all(){return {results:raw.prepare(sql).all(...args)}},async run(){return raw.prepare(sql).run(...args)}}}}},async batch(items){raw.exec('BEGIN');try{const values=[];for(const item of items)values.push(await item.run());raw.exec('COMMIT');return values}catch(e){raw.exec('ROLLBACK');throw e}}};}
function environment(){return {DB:db(),GOOGLE_CLIENT_ID:'test-client',JUDGE_LIMITER:{limit:async()=>({success:true})},AI:{run:async()=>({response:{valid:true,canonical:'Apple',rarity:.1,confidence:.99,reason:'Fits.'}})},JUDGMENTS:{get:async()=>null,put:async()=>{}}};}
async function call(env,auth,path,body){const response=await worker.fetch(new Request('https://example.test/api/social'+path,{method:body?'POST':'GET',headers:{Origin:'https://mritabhash.github.io',Authorization:'Bearer '+auth,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env,{waitUntil(){}});return {status:response.status,...await response.json()};}
test('signed identity rejects wrong audience, expiry and forged signatures',async()=>{
 assert.equal((await verifyIdentity(await token('a'),'test-client')).sub,'a');
 await assert.rejects(verifyIdentity(await token('a',{aud:'other'}),'test-client'));
 await assert.rejects(verifyIdentity(await token('a',{exp:0}),'test-client'));
 const t=await token('a');await assert.rejects(verifyIdentity(t.slice(0,-8)+'xxxxxxxx','test-client'));
});
test('daily progress is owned, persisted, retry-safe and scores are server calculated',async()=>{
 const env=environment(),a=await token('a'),b=await token('b');await call(env,a,'/me',{});await call(env,b,'/me',{});
 const g=await call(env,a,'/games',{});assert.equal(g.status,200);assert.equal((await call(env,a,'/games',{})).id,g.id);
 assert.equal((await call(env,b,'/games/'+g.id)).status,404);
 let r=await call(env,a,'/games/'+g.id+'/answer',{slot:0,answer:'Apple',score:999999});assert.equal(r.score,10);
 assert.equal((await call(env,a,'/games/'+g.id+'/answer',{slot:0,answer:'Apple'})).status,409);
 assert.equal((await call(env,a,'/games/'+g.id+'/skip',{slot:3})).status,409);
 for(let slot=1;slot<7;slot++)r=await call(env,a,'/games/'+g.id+'/skip',{slot});
 assert.equal(r.completed,true);assert.equal(r.score,10);const profile=await call(env,a,'/me');assert.equal(profile.history.length,1);assert.equal(profile.streak.current,1);
});
test('friends need recipient consent and rankings stay hidden until completion',async()=>{
 const env=environment(),a=await token('a'),b=await token('b'),c=await token('c');
 const ua=(await call(env,a,'/me',{})).user,ub=(await call(env,b,'/me',{})).user;await call(env,c,'/me',{});
 await call(env,a,'/friends/request',{code:ub.invite});await call(env,a,'/friends/accept',{id:ub.id});
 assert.equal((await call(env,a,'/friends')).friends[0].status,'pending');
 await call(env,b,'/friends/accept',{id:ua.id});assert.equal((await call(env,a,'/friends')).friends[0].status,'accepted');
 assert.equal((await call(env,c,'/friends')).friends.length,0);assert.equal((await call(env,a,'/leaderboard')).locked,true);
 await call(env,a,'/friends/remove',{id:ub.id});assert.equal((await call(env,b,'/friends')).friends.length,0);
});
test('private room lifecycle enforces membership, host actions and shared prompts',async()=>{
 const env=environment(),a=await token('a'),b=await token('b'),c=await token('c');for(const t of [a,b,c])await call(env,t,'/me',{});
 const room=(await call(env,a,'/rooms',{})).id;
 assert.equal((await call(env,c,'/rooms/'+room)).status,403);
 await call(env,b,'/rooms/'+room+'/join',{});assert.equal((await call(env,b,'/rooms/'+room+'/start',{})).status,403);
 await call(env,a,'/rooms/'+room+'/start',{});assert.equal((await call(env,c,'/rooms/'+room+'/join',{})).status,409);
 const ga=(await call(env,a,'/games',{room})).id,gb=(await call(env,b,'/games',{room})).id;
 assert.deepEqual((await call(env,a,'/games/'+ga)).prompts,(await call(env,b,'/games/'+gb)).prompts);
 await call(env,a,'/games/'+ga+'/answer',{slot:0,answer:'apple'});
 const state=await call(env,b,'/rooms/'+room);assert.equal(state.members.length,2);assert.equal(state.members.some(x=>'answer' in x),false);
 await call(env,a,'/rooms/'+room+'/close',{});assert.equal((await call(env,b,'/games/'+gb+'/skip',{slot:0})).status,409);
});
test('missing setup and invalid auth fail closed; streak gaps reset',async()=>{
 assert.equal((await call({},'','/me')).status,503);assert.equal((await call(environment(),'bad','/me')).status,401);
 assert.deepEqual(streaks(['2026-10-16','2026-10-17','2026-10-19'],'2026-10-19'),{best:2,current:1});
 assert.equal(streaks(['2026-10-17'],'2026-10-20').current,0);
});
test('export is private, deletion requires confirmation and removes owned records',async()=>{
 const env=environment(),a=await token('export-a'),b=await token('export-b');await call(env,a,'/me',{});await call(env,b,'/me',{});
 const game=await call(env,a,'/games',{});await call(env,a,'/games/'+game.id+'/answer',{slot:0,answer:'Apple'});
 assert.equal((await call(env,a,'/export')).turns.length,1);assert.equal((await call(env,b,'/export')).turns.length,0);
 assert.equal((await call(env,a,'/delete',{})).status,400);assert.equal((await call(env,a,'/delete',{confirm:'DELETE MY BAKERY'})).status,200);
 assert.equal((await call(env,a,'/me')).status,401);assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM turns').get().n,0);
});
test('room capacity and expired room access are enforced',async()=>{
 const env=environment();const host=await token('host');await call(env,host,'/me',{});const id=(await call(env,host,'/rooms',{})).id;
 for(let i=0;i<8;i++){const t=await token('guest'+i);await call(env,t,'/me',{});assert.equal((await call(env,t,'/rooms/'+id+'/join',{})).status,i<7?200:409);}
 env.DB.raw.prepare('UPDATE rooms SET expires=0 WHERE id=?').run(id);assert.equal((await call(env,host,'/rooms/'+id)).status,404);
});
test('rate limits return retryable errors without writing game data',async()=>{
 const env=environment(),t=await token('rate');await call(env,t,'/me',{});env.JUDGE_LIMITER.limit=async()=>({success:false});
 assert.equal((await call(env,t,'/games',{})).status,429);assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM games').get().n,0);
});
async function completedDaily(env,auth,score,day='2026-01-01',kind='daily'){
 const user=(await call(env,auth,'/me')).user.id,id=crypto.randomUUID().replaceAll('-','');
 env.DB.raw.prepare('INSERT INTO games(id,user,kind,day,prompts,created,completed) VALUES(?,?,?,?,?,?,?)').run(id,user,kind,day,'[]',1,2);
 for(let slot=0;slot<7;slot++)env.DB.raw.prepare('INSERT INTO turns(game,slot,answer,score,reason) VALUES(?,?,?,?,?)').run(id,slot,'answer',Math.max(0,Math.min(100,score-slot*100)),'Fits');return id;
}
test('rewards use saved daily scores, credit once, reject other users and room games',async()=>{
 const env=environment(),a=await token('reward-a'),b=await token('reward-b');await call(env,a,'/me',{});await call(env,b,'/me',{});
 const id=await completedDaily(env,a,450);
 assert.equal((await call(env,b,'/rewards/claim',{game:id})).status,409);
 const claim=await call(env,a,'/rewards/claim',{game:id,score:700,sugar:99999});assert.equal(claim.reward.sugar,105);assert.ok(claim.reward.scraps>=1&&claim.reward.scraps<=5);
 await Promise.all([call(env,a,'/rewards/claim',{game:id}),call(env,a,'/rewards/claim',{game:id})]);
 const state=await call(env,a,'/rewards');assert.deepEqual(state.wallet,{sugar:105,scraps:claim.reward.scraps});assert.equal(state.claims.length,1);assert.ok(state.badges.length>=1);assert.deepEqual(state.badges,(await call(env,a,'/rewards')).badges);
 const room=await completedDaily(env,a,700,'2026-01-02','room');assert.equal((await call(env,a,'/rewards/claim',{game:room})).status,409);
 const unfinished=(await call(env,a,'/games',{})).id;assert.equal((await call(env,a,'/rewards/claim',{game:unfinished})).status,409);
});
test('Sugar boundaries remain stable while scraps and badges are surprises',async()=>{
 const env=environment(),a=await token('threshold');await call(env,a,'/me',{});
 for(const [i,score,sugar,scraps] of [[0,0,0,0],[1,1,20,1],[2,149,20,1],[3,150,40,2],[4,299,40,2],[5,300,70,3],[6,449,70,3],[7,450,105,4],[8,599,105,4],[9,600,150,5],[10,700,150,5]]){
  const id=await completedDaily(env,a,score,'2026-01-'+String(i+1).padStart(2,'0'));const r=await call(env,a,'/rewards/claim',{game:id});assert.equal(r.reward.sugar,sugar);assert.ok(r.reward.scraps>=1&&r.reward.scraps<=5);
 }
 const state=await call(env,a,'/rewards');assert.ok(state.badges.length>0&&state.badges.length<=12);assert.ok(!('tiers' in state.catalog));assert.ok(state.catalog.badges.every(b=>!('threshold' in b)&&!('count' in b)));
});
test('shop debits exact price once, rejects overspending, and enforces owned slot matching',async()=>{
 const env=environment(),a=await token('shop');await call(env,a,'/me',{});const id=await completedDaily(env,a,300);await call(env,a,'/rewards/claim',{game:id});
 const body={item:'hat-0',key:crypto.randomUUID(),price:0};assert.equal((await call(env,a,'/rewards/buy',body)).status,200);assert.equal((await call(env,a,'/rewards/buy',body)).status,200);
 assert.equal((await call(env,a,'/rewards')).wallet.sugar,20);
 assert.equal((await call(env,a,'/rewards/buy',{item:'hat-1',key:crypto.randomUUID()})).status,409);
 assert.equal((await call(env,a,'/rewards/equip',{slot:'hat',item:'hat-0'})).status,200);assert.equal((await call(env,a,'/rewards/equip',{slot:'aura',item:'hat-0'})).status,403);
 assert.equal((await call(env,a,'/rewards/equip',{slot:'hat',item:'hat-1'})).status,403);assert.equal((await call(env,a,'/rewards/equip',{slot:'badge',item:'perfect-oven'})).status,403);
 assert.equal((await call(env,a,'/rewards/equip',{slot:'hat',item:null})).status,200);assert.equal((await call(env,a,'/rewards')).loadout.hat,null);
});
test('mystery recipes are retry-safe, never duplicate, and stop charging after all seven',async()=>{
 const env=environment(),a=await token('craft');await call(env,a,'/me',{});
 assert.equal((await call(env,a,'/rewards/craft',{key:crypto.randomUUID()})).status,409);
 for(let i=1;i<=7;i++){const id=await completedDaily(env,a,700,'2026-02-0'+i);await call(env,a,'/rewards/claim',{game:id});}
 env.DB.raw.prepare('UPDATE reward_wallets SET scraps=35').run();const ids=new Set();for(let i=0;i<7;i++){const body={key:crypto.randomUUID()},result=await call(env,a,'/rewards/craft',body);assert.equal(result.status,200);ids.add(result.item);assert.equal((await call(env,a,'/rewards/craft',body)).item,result.item);}
 assert.equal(ids.size,7);assert.equal((await call(env,a,'/rewards')).wallet.scraps,0);
 assert.equal((await call(env,a,'/rewards/craft',{key:crypto.randomUUID()})).status,409);
 const exp=await call(env,a,'/export');assert.equal(exp.items.length,7);assert.equal(exp.rewards.length,7);
 await call(env,a,'/delete',{confirm:'DELETE MY BAKERY'});for(const table of ['reward_items','reward_claims','reward_wallets','reward_loadouts'])assert.equal(env.DB.raw.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
});

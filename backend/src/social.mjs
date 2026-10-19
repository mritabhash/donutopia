// Donutopia accounts and private multiplayer. No client-supplied points are accepted.
const SOCIAL_VERSION='accounts-v1';
const enc=new TextEncoder();
let googleKeys,googleKeysUntil=0;
function fail(status,message){throw Object.assign(Error(message),{status});}
function randomCode(bytes=16){return [...crypto.getRandomValues(new Uint8Array(bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function decode64(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function verifyIdentity(token,clientId,fetcher=fetch){
 try{
  if(!clientId||typeof token!=='string'||token.length>8192)fail(401,'Sign in to continue.');
  const parts=token.split('.');if(parts.length!==3)fail(401,'Invalid sign-in.');
  const header=JSON.parse(new TextDecoder().decode(decode64(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode64(parts[1])));
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||!header.kid||claims.aud!==clientId||(claims.azp&&claims.azp!==clientId)||!['accounts.google.com','https://accounts.google.com'].includes(claims.iss)||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now+60||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255)fail(401,'Sign-in expired or invalid. Please sign in again.');
  if(!googleKeys||Date.now()>googleKeysUntil){
   const r=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{signal:AbortSignal.timeout(5000)});if(!r.ok)fail(503,'Sign-in provider unavailable.');
   googleKeys=(await r.json()).keys;googleKeysUntil=Date.now()+Math.min(3600,Number(r.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300))*1000;
  }
  const jwk=googleKeys.find(k=>k.kid===header.kid&&k.kty==='RSA');if(!jwk){googleKeysUntil=0;fail(401,'Please retry sign-in.');}
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode64(parts[2]),enc.encode(parts[0]+'.'+parts[1])))fail(401,'Invalid sign-in.');
  return claims;
 }catch(e){if(e.status)throw e;fail(401,'Could not verify sign-in.');}
}
export function streaks(dates,today){
 const values=[...new Set(dates)].sort();let best=0,current=0,last='';
 for(const day of values){current=Date.parse(day)-Date.parse(last)===86400000?current+1:1;best=Math.max(best,current);last=day;}
 const age=(Date.parse(today)-Date.parse(last))/86400000;
 return {best,current:age===0||age===1?current:0};
}
async function socialRoute(request,env,ctx,reply){
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/social/,'');
 if(path==='/config'&&request.method==='GET')return reply({version:SOCIAL_VERSION,ready:!!(env.DB&&env.GOOGLE_CLIENT_ID),googleClientId:env.GOOGLE_CLIENT_ID||null});
 if(!env.DB||!env.GOOGLE_CLIENT_ID)return reply({error:'Accounts and multiplayer are awaiting server setup.'},503);
 if(!env.JUDGE_LIMITER)fail(503,'Request limiting is not configured.');
 const access=await env.JUDGE_LIMITER.limit({key:'access:'+request.headers.get('CF-Connecting-IP')});if(!access.success)fail(429,'Please wait a minute before trying again.');
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 const query=(sql,...args)=>db.prepare(sql).bind(...args),first=(sql,...args)=>query(sql,...args).first(),all=async(sql,...args)=>(await query(sql,...args).all()).results;
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 const identity=await verifyIdentity(token,env.GOOGLE_CLIENT_ID);
 const now=Date.now(),day=dayInfo().date;
 if(request.method==='POST'){
  if(!env.JUDGE_LIMITER)fail(503,'Request limiting is not configured.');
  const rate=await env.JUDGE_LIMITER.limit({key:'social:'+identity.sub});if(!rate.success)fail(429,'Please wait a minute before trying again.');
 }
 let user=await first('SELECT id,name,invite FROM users WHERE subject=?',identity.sub);
 if(!user){
  if(path!=='/me'||request.method!=='POST')fail(401,'Finish creating your profile first.');
  await query('INSERT OR IGNORE INTO users(id,subject,name,invite,created) VALUES(?,?,?,?,?)',randomCode(),identity.sub,'Baker',randomCode(8),now).run();
  user=await first('SELECT id,name,invite FROM users WHERE subject=?',identity.sub);
 }
 let body={};if(request.method==='POST'){try{body=await bodyOf(request);}catch{fail(400,'Invalid request.');}}
 if(path==='/me'){
  if(request.method==='POST'&&body.name!==undefined){
   if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>32||/[\x00-\x1f\x7f]/.test(body.name))fail(400,'Choose a name between 2 and 32 characters.');
   await query('UPDATE users SET name=? WHERE id=?',body.name.trim(),user.id).run();user.name=body.name.trim();
  }
  const history=await all('SELECT g.id,g.kind,g.day,g.completed,COALESCE(SUM(t.score),0) score FROM games g LEFT JOIN turns t ON t.game=g.id WHERE g.user=? AND g.completed IS NOT NULL GROUP BY g.id ORDER BY g.completed DESC LIMIT 100',user.id);
  const days=await all("SELECT day FROM games WHERE user=? AND kind='daily' AND completed IS NOT NULL ORDER BY day",user.id);
  return reply({user,history,streak:streaks(days.map(x=>x.day),day)});
 }
 if(path==='/export'&&request.method==='GET'){
  const games=await all('SELECT id,kind,day,room,prompts,created,completed FROM games WHERE user=?',user.id);
  const turns=await all('SELECT t.* FROM turns t JOIN games g ON g.id=t.game WHERE g.user=?',user.id);
  return reply({user,games,turns});
 }
 if(path==='/delete'&&request.method==='POST'){
  if(body.confirm!=='DELETE MY BAKERY')fail(400,'Type DELETE MY BAKERY to confirm.');
  await query('DELETE FROM users WHERE id=?',user.id).run();return reply({ok:true});
 }
 if(path==='/friends'&&request.method==='GET'){
  const friends=await all('SELECT f.sender,f.recipient,f.status,u.id,u.name FROM friendships f JOIN users u ON u.id=CASE WHEN f.sender=? THEN f.recipient ELSE f.sender END WHERE f.sender=? OR f.recipient=?',user.id,user.id,user.id);
  return reply({friends});
 }
 if(path==='/friends/request'&&request.method==='POST'){
  if(typeof body.code!=='string'||!/^[a-f0-9]{16}$/.test(body.code))fail(400,'Enter a valid friend code.');
  const other=await first('SELECT id FROM users WHERE invite=?',body.code);if(!other||other.id===user.id)fail(400,'Friend code unavailable.');
  // Only one direction may exist. Acceptance always requires the recipient.
  await query("INSERT INTO friendships(sender,recipient,status) SELECT ?,?,'pending' WHERE NOT EXISTS(SELECT 1 FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)) AND (SELECT COUNT(*) FROM friendships WHERE sender=? OR recipient=?)<100",user.id,other.id,user.id,other.id,other.id,user.id,user.id,user.id).run();
  return reply({ok:true});
 }
 if(['/friends/accept','/friends/remove'].includes(path)&&request.method==='POST'){
  if(typeof body.id!=='string')fail(400,'Missing friend.');
  if(path.endsWith('accept'))await query("UPDATE friendships SET status='accepted' WHERE sender=? AND recipient=?",body.id,user.id).run();
  else await query('DELETE FROM friendships WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)',body.id,user.id,user.id,body.id).run();
  return reply({ok:true});
 }
 if(path==='/leaderboard'&&request.method==='GET'){
  // No scores are exposed until the viewer has finished today's daily game.
  if(!await first("SELECT id FROM games WHERE user=? AND kind='daily' AND day=? AND completed IS NOT NULL",user.id,day))return reply({locked:true,players:[]});
  const players=await all("SELECT u.id,u.name,COALESCE(SUM(t.score),0) score FROM games g JOIN users u ON u.id=g.user LEFT JOIN turns t ON t.game=g.id WHERE g.kind='daily' AND g.day=? AND g.completed IS NOT NULL AND (u.id=? OR u.id IN(SELECT CASE WHEN sender=? THEN recipient ELSE sender END FROM friendships WHERE status='accepted' AND (sender=? OR recipient=?))) GROUP BY u.id ORDER BY score DESC,u.name",day,user.id,user.id,user.id,user.id);
  return reply({players});
 }
 if(path==='/rooms'&&request.method==='POST'){
  const count=await first('SELECT COUNT(*) n FROM rooms WHERE host=? AND expires>?',user.id,now);if(count.n>=5)fail(429,'You already have five active rooms.');
  const id=randomCode(8),seed=crypto.getRandomValues(new Uint32Array(1))[0]%100000+1;
  await db.batch([query("INSERT INTO rooms(id,host,state,seed,created,expires) VALUES(?,?,'lobby',?,?,?)",id,user.id,seed,now,now+86400000),query('INSERT INTO members(room,user) VALUES(?,?)',id,user.id)]);
  return reply({id});
 }
 const rm=path.match(/^\/rooms\/([a-f0-9]{16})(?:\/(join|start|close))?$/);
 if(rm){
  const id=rm[1],action=rm[2],room=await first('SELECT * FROM rooms WHERE id=? AND expires>?',id,now);if(!room)fail(404,'Room expired or not found.');
  if(action==='join'&&request.method==='POST'){
   await query("INSERT OR IGNORE INTO members(room,user) SELECT ?,? WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND state='lobby' AND expires>?) AND (SELECT COUNT(*) FROM members WHERE room=?)<8",id,user.id,id,now,id).run();
   if(!await first('SELECT user FROM members WHERE room=? AND user=?',id,user.id))fail(409,'Room has started or is full.');
  }
  if(!await first('SELECT user FROM members WHERE room=? AND user=?',id,user.id))fail(403,'Join this room first.');
  if(action==='start'||action==='close'){
   if(request.method!=='POST')fail(405,'Use POST.');if(room.host!==user.id)fail(403,'Only the host can do that.');
   await query("UPDATE rooms SET state=?,started=COALESCE(started,?) WHERE id=? AND state=?",action==='start'?'playing':'closed',now,id,action==='start'?'lobby':room.state).run();
  }
  const state=await first('SELECT id,host,state,expires FROM rooms WHERE id=?',id);
  const members=await all('SELECT u.id,u.name,g.completed,COUNT(t.slot) answered,COALESCE(SUM(t.score),0) score FROM members m JOIN users u ON u.id=m.user LEFT JOIN games g ON g.room=m.room AND g.user=m.user LEFT JOIN turns t ON t.game=g.id WHERE m.room=? GROUP BY u.id ORDER BY score DESC,u.name',id);
  // Answers are never exposed to other players. Only progress and points are shared.
  return reply({room:state,members});
 }
 if(path==='/games'&&request.method==='POST'){
  let prompts,kind='daily',room=null;
  if(body.room){
   const r=await first("SELECT r.* FROM rooms r JOIN members m ON m.room=r.id WHERE r.id=? AND m.user=? AND r.state='playing' AND r.expires>?",body.room,user.id,now);if(!r)fail(403,'Join a started room first.');
   room=r.id;kind='room';prompts=selectQuestions('unlimited',r.seed);
  }else prompts=selectQuestions('daily',dayInfo().dayNumber);
  await query('INSERT OR IGNORE INTO games(id,user,kind,day,room,prompts,created) VALUES(?,?,?,?,?,?,?)',randomCode(),user.id,kind,day,room,JSON.stringify(prompts),now).run();
  const g=room?await first('SELECT id FROM games WHERE user=? AND room=?',user.id,room):await first("SELECT id FROM games WHERE user=? AND kind='daily' AND day=?",user.id,day);
  return reply(g);
 }
 const gm=path.match(/^\/games\/([a-f0-9]{32})(?:\/(answer|skip))?$/);
 if(gm){
  const game=await first('SELECT * FROM games WHERE id=? AND user=?',gm[1],user.id);if(!game)fail(404,'Game not found.');
  const prompts=JSON.parse(game.prompts);
  if(gm[2]){
   if(request.method!=='POST')fail(405,'Use POST.');
   if(game.completed)fail(409,'This batch is already finished.');
   if(game.kind==='daily'&&game.day!==day)fail(409,'A new daily batch is ready.');
   if(game.room&&!await first("SELECT id FROM rooms WHERE id=? AND state='playing' AND expires>?",game.room,now))fail(409,'This room has closed.');
   if(!Number.isInteger(body.slot)||body.slot<0||body.slot>6)fail(400,'Invalid round.');
   const count=await first('SELECT COUNT(*) n FROM turns WHERE game=?',game.id);
   if(count.n!==body.slot)fail(409,'Reload your game to continue from the saved round.');
   let result={accepted:true,answer:'',score:0,quip:'Skipped'};
   if(gm[2]==='answer'){
    if(typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>160)fail(400,'Enter one answer, up to 160 characters.');
    if(!env.AI||!env.JUDGMENTS)fail(503,'The judge is unavailable.');
    try{result=await judgeAnswer(prompts[body.slot],body.answer,env,ctx);}catch{fail(503,'The judge could not decide. Retry without losing your turn.');}
    if(!result.accepted)return reply(result);
   }
   // Unique(game,slot) makes retries/concurrent requests unable to multiply points.
   await db.batch([
    query('INSERT OR IGNORE INTO turns(game,slot,answer,score,reason) VALUES(?,?,?,?,?)',game.id,body.slot,result.answer,result.score,result.quip),
    query('UPDATE games SET completed=? WHERE id=? AND (SELECT COUNT(*) FROM turns WHERE game=?)=7 AND completed IS NULL',now,game.id,game.id)
   ]);
  }
  const turns=await all('SELECT slot,answer,score,reason FROM turns WHERE game=? ORDER BY slot',game.id);
  return reply({id:game.id,kind:game.kind,day:game.day,prompts,turns,completed:turns.length===7,score:turns.reduce((s,t)=>s+t.score,0)});
 }
 fail(404,'Not found.');
}
export async function socialFetch(request,env,ctx,reply){
 try{return await socialRoute(request,env,ctx,reply);}catch(e){return reply({error:e.status?e.message:'Account service temporarily unavailable.'},e.status||503);}
}

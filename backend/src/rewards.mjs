// Rewards are based exclusively on completed server-scored daily games.
export function dailyReward(score){
 const bounded=Math.max(0,Math.min(700,Math.floor(Number(score)||0)));
 return {...REWARD_TIERS.filter(t=>bounded>=t.min).at(-1),score:bounded};
}
async function surpriseBadge(game){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bakery-badge-v2:'+game)));return REWARD_CATALOG.badges[bytes[0]%REWARD_CATALOG.badges.length].id;}
async function rewardRoute(path,method,body,user,db,reply){
 const q=(sql,...args)=>db.prepare(sql).bind(...args);
 const all=async(sql,...args)=>(await q(sql,...args).all()).results;
 const first=(sql,...args)=>q(sql,...args).first();
 const owned=()=>all('SELECT item,kind,created FROM reward_items WHERE user=?',user.id);
 const badges=async()=>{
  const claims=await all('SELECT game,score,created FROM reward_claims WHERE user=?',user.id),earned=new Set();
  // Keep existing badges; future drops do not use score milestones.
  const legacy=claims.filter(c=>c.created<1792765064278);
  const oldRules=[[1,1],[100,1],[200,1],[300,1],[400,1],[500,1],[600,1],[700,1],[100,3],[200,7],[300,14],[400,30]];
  oldRules.forEach(([score,count],i)=>{if(legacy.filter(c=>c.score>=score).length>=count)earned.add(REWARD_CATALOG.badges[i].id);});
  for(const claim of claims){
   // Game IDs contain 128 bits of server-generated randomness. A domain-separated
   // digest makes the surprise stable across retries, without a score rubric.
   earned.add(await surpriseBadge(claim.game));
  }
  return [...earned];
 };
 if(path==='/rewards'&&method==='GET'){
  const wallet=await first('SELECT sugar,scraps FROM reward_wallets WHERE user=?',user.id)||{sugar:0,scraps:0};
  const pending=await all("SELECT g.id,g.day,COALESCE(SUM(t.score),0) score FROM games g LEFT JOIN turns t ON t.game=g.id LEFT JOIN reward_claims c ON c.game=g.id WHERE g.user=? AND g.kind='daily' AND g.completed IS NOT NULL AND c.game IS NULL GROUP BY g.id ORDER BY g.day DESC",user.id);
  return reply({catalog:REWARD_CATALOG,wallet,items:await owned(),badges:await badges(),loadout:await first('SELECT buddy,hat,aura,frame,badge FROM reward_loadouts WHERE user=?',user.id)||{},claims:await all('SELECT game,day,score,sugar,scraps,frosting FROM reward_claims WHERE user=? ORDER BY day DESC LIMIT 30',user.id),pending});
 }
 if(method!=='POST')fail(405,'Use POST.');
 if(path==='/rewards/claim'){
  if(typeof body.game!=='string')fail(400,'Choose a completed daily batch.');
  const game=await first("SELECT g.id,g.day,COALESCE(SUM(t.score),0) score FROM games g JOIN turns t ON t.game=g.id WHERE g.id=? AND g.user=? AND g.kind='daily' AND g.completed IS NOT NULL GROUP BY g.id HAVING COUNT(t.slot)=7",body.game,user.id);
  if(!game)fail(409,'Finish a saved daily batch to earn rewards.');
  const reward={...dailyReward(game.score),scraps:1+crypto.getRandomValues(new Uint32Array(1))[0]%5};
  await q('INSERT OR IGNORE INTO reward_claims(game,user,day,score,sugar,scraps,frosting,created) VALUES(?,?,?,?,?,?,?,?)',game.id,user.id,game.day,reward.score,reward.sugar,reward.scraps,reward.frosting,Date.now()).run();
  return reply({reward:await first('SELECT game,score,sugar,scraps,frosting FROM reward_claims WHERE game=? AND user=?',game.id,user.id),badges:await badges(),bonusBadge:await surpriseBadge(game.id)});
 }
 if(path==='/rewards/buy'||path==='/rewards/craft'){
  if(typeof body.key!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(body.key))fail(400,'Missing purchase reference.');
  const prior=await first('SELECT item,kind FROM reward_items WHERE user=? AND request_key=?',user.id,body.key);if(prior)return reply({item:prior.item,kind:prior.kind});
  let item,kind,sugar=0,scraps=0;
  if(path.endsWith('/buy')){const c=REWARD_CATALOG.cosmetics.find(c=>c.id===body.item);if(!c)fail(400,'Unknown cosmetic.');item=c.id;kind='cosmetic';sugar=c.price;}
  else{
   const items=await owned(),pool=REWARD_CATALOG.buddies.filter(b=>!items.some(i=>i.item===b.id));
   if(!pool.length)fail(409,'You have all seven baking buddies. Keep your scraps for future recipes.');
   // Rejection sampling avoids modulo bias. Every remaining buddy is equally likely.
   const limit=Math.floor(4294967296/pool.length)*pool.length;let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=limit);
   item=pool[n%pool.length].id;kind='buddy';scraps=REWARD_CATALOG.craftCost;
  }
  try{await q('INSERT OR IGNORE INTO reward_items(user,item,kind,sugar_cost,scrap_cost,request_key,created) VALUES(?,?,?,?,?,?,?)',user.id,item,kind,sugar,scraps,body.key,Date.now()).run();}
  catch(e){if(String(e.message).includes('insufficient_rewards'))fail(409,'You need more '+(scraps?'recipe scraps.':'Sugar.'));throw e;}
  const result=await first('SELECT item,kind FROM reward_items WHERE user=? AND request_key=?',user.id,body.key);
  if(!result)fail(409,'That item is already owned. No currency was spent.');
  return reply(result);
 }
 if(path==='/rewards/equip'){
  const slots=['buddy','hat','aura','frame','badge'];if(!slots.includes(body.slot))fail(400,'Unknown wardrobe slot.');
  if(body.item!==null){
   if(body.slot==='badge'){if(!(await badges()).includes(body.item))fail(403,'Earn this badge first.');}
   else{
    const catalog=body.slot==='buddy'?REWARD_CATALOG.buddies:REWARD_CATALOG.cosmetics.filter(c=>c.slot===body.slot);
    if(!catalog.some(c=>c.id===body.item)||!await first('SELECT item FROM reward_items WHERE user=? AND item=?',user.id,body.item))fail(403,'Collect this item first.');
   }
  }
  await q(`INSERT INTO reward_loadouts(user,${body.slot}) VALUES(?,?) ON CONFLICT(user) DO UPDATE SET ${body.slot}=excluded.${body.slot}`,user.id,body.item).run();return reply({ok:true});
 }
 fail(404,'Reward action not found.');
}

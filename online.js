'use strict';
const $=id=>document.getElementById(id),base=new URL('.',document.currentScript.src);
let apiOrigin,token=sessionStorage.getItem('donutopia.identity')||'',profile,roomId='',gameId='',gameState,poll,busy=false;
const status=text=>{$('status').textContent=text;};
function line(parent,text){const p=document.createElement('div');p.className='row';p.textContent=text;parent.append(p);return p;}
function button(parent,label,action){const b=document.createElement('button');b.textContent=label;b.onclick=()=>run(action);parent.append(b);}
async function api(path,body){
 const response=await fetch(apiOrigin+'/api/social'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(18000)});
 const data=await response.json();if(!response.ok){if(response.status===401){sessionStorage.removeItem('donutopia.identity');token='';$('login').hidden=false;$('dashboard').hidden=true;$('game').hidden=true;clearInterval(poll);}throw Error(data.error||'Request failed.');}return data;
}
async function run(action){if(busy)return;busy=true;const buttons=[...document.querySelectorAll('button')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);try{await action();}catch(e){status(e.name==='TimeoutError'?'That took too long. Retry to check your saved progress.':e.message);}finally{busy=false;buttons.forEach(([b,disabled])=>{if(b.isConnected)b.disabled=disabled;});}}
function signedOut(){token='';sessionStorage.removeItem('donutopia.identity');clearInterval(poll);location.reload();}
async function refresh(){
 const me=await api('/me');profile=me.user;$('login').hidden=true;$('dashboard').hidden=false;$('name').value=profile.name;$('invite').textContent=profile.invite;
 $('stats').textContent=`Current streak: ${me.streak.current} · Best streak: ${me.streak.best}`;
 $('history').replaceChildren();for(const g of me.history){const row=line($('history'),`${g.day} · ${g.kind==='room'?'Friends’ batch':'Daily batch'} · ${g.score} points`);button(row,'View',()=>openGame(g.id));}
 await refreshRewards();
 const f=await api('/friends');$('friends').replaceChildren();for(const friend of f.friends){const row=line($('friends'),friend.name+' · '+friend.status);if(friend.status==='pending'&&friend.recipient===profile.id)button(row,'Accept',async()=>{await api('/friends/accept',{id:friend.id});await refresh();});button(row,'Remove',async()=>{await api('/friends/remove',{id:friend.id});await refresh();});}
 const lb=await api('/leaderboard');$('leaderboard').replaceChildren();if(lb.locked)line($('leaderboard'),'Scores appear after you finish.');else lb.players.forEach((p,i)=>line($('leaderboard'),`${i+1}. ${p.name}: ${p.score} points`));
 status('Your bakery is up to date.');
}
async function roomRefresh(){
 if(!roomId||document.hidden)return;
 const r=await api('/rooms/'+roomId);$('room').replaceChildren();line($('room'),'Room code: '+roomId);line($('room'),'Status: '+r.room.state);
 r.members.forEach(p=>line($('room'),`${p.name}: ${p.score} points · ${p.answered}/7${p.completed?' · Finished':''}`));
 if(r.room.host===profile.id&&r.room.state==='lobby')button($('room'),'Start batch',async()=>{await api('/rooms/'+roomId+'/start',{});await roomRefresh();});
 if(r.room.state==='playing')button($('room'),'Open my rounds',async()=>{const g=await api('/games',{room:roomId});await openGame(g.id);});
 if(r.room.host===profile.id&&r.room.state!=='closed')button($('room'),'Close room',async()=>{await api('/rooms/'+roomId+'/close',{});await roomRefresh();});
 if(r.room.state==='closed')clearInterval(poll);
}
async function watchRoom(id){roomId=id;clearInterval(poll);await roomRefresh();poll=setInterval(()=>{if(!busy)roomRefresh().catch(e=>{clearInterval(poll);status(e.message);});},10000);}
async function openGame(id){gameId=id;gameState=await api('/games/'+id);$('dashboard').hidden=true;$('game').hidden=false;renderGame();if(gameState.completed&&gameState.kind==='daily')await collectDailyReward(gameState.id);$('game').scrollIntoView({behavior:'smooth'});}
function renderGame(){
 const g=gameState,n=g.turns.length;$('round').textContent=g.completed?`Batch finished: ${g.score} points`:`Prompt ${n+1} of 7 · ${g.score} points`;$('prompt').textContent=g.completed?'Your results are saved.':g.prompts[n].text;$('answerform').hidden=g.completed;$('results').replaceChildren();
 for(const t of g.turns)line($('results'),`${t.slot+1}. ${g.prompts[t.slot].text} ${t.answer||'Skipped'} · ${t.score} points. ${t.reason}`);
 $('answer').value='';if(!g.completed)$('answer').focus();
}
async function submit(skip=false){
 $('feedback').textContent=skip?'Saving…':'Judging your answer…';
 try{const result=await api('/games/'+gameId+(skip?'/skip':'/answer'),{slot:gameState.turns.length,...(!skip?{answer:$('answer').value}:{})});
 if(result.accepted===false){$('feedback').textContent=result.reason;return;}
 gameState=result;renderGame();if(result.completed&&result.kind==='daily')await collectDailyReward(result.id);$('feedback').textContent=result.completed?'All seven rounds saved.':'Round saved.';
 }catch(e){$('feedback').textContent=e.message;const saved=await api('/games/'+gameId).catch(()=>null);if(saved&&saved.turns.length>gameState.turns.length){gameState=saved;renderGame();}throw e;}
}
$('export').onclick=()=>run(async()=>{const data=await api('/export');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='donutopia-account.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('deleteform').onsubmit=e=>{e.preventDefault();run(async()=>{if($('deleteconfirm').value!=='DELETE MY BAKERY')throw Error('Type DELETE MY BAKERY exactly to confirm.');await api('/delete',{confirm:$('deleteconfirm').value});signedOut();});};
$('logout').onclick=signedOut;
$('profile').onsubmit=e=>{e.preventDefault();run(async()=>{await api('/me',{name:$('name').value});await refresh();});};
$('addfriend').onsubmit=e=>{e.preventDefault();run(async()=>{await api('/friends/request',{code:$('friendcode').value.trim()});await refresh();status('Friend request sent, or already pending.');});};
$('daily').onclick=()=>run(async()=>{const g=await api('/games',{});await openGame(g.id);});
$('create').onclick=()=>run(async()=>watchRoom((await api('/rooms',{})).id));
$('join').onsubmit=e=>{e.preventDefault();run(async()=>{const id=$('roomcode').value.trim();await api('/rooms/'+id+'/join',{});await watchRoom(id);});};
$('answerform').onsubmit=e=>{e.preventDefault();run(()=>submit());};$('skip').onclick=()=>run(()=>submit(true));
$('back').onclick=()=>run(async()=>{$('game').hidden=true;await refresh();if(roomId)await roomRefresh();});
(async()=>{
 try{
  const config=await fetch(new URL('backend-config.json',base),{cache:'no-store'}).then(r=>r.json());apiOrigin=config.apiOrigin;
  const setup=await api('/config');if(!setup.ready){status('Online accounts and rooms are being set up. You can still play the daily game.');return;}
  const start=()=>{if(!window.google?.accounts?.id)return false;google.accounts.id.initialize({client_id:setup.googleClientId,callback:response=>run(async()=>{token=response.credential;sessionStorage.setItem('donutopia.identity',token);await api('/me',{});await refresh();})});google.accounts.id.renderButton($('google'),{type:'standard',theme:'filled_black',size:'large',text:'continue_with',shape:'rectangular',logo_alignment:'left',width:String(Math.min(320,Math.max(200,$('google').clientWidth)))});return true;};
  if(!start()){let tries=0;const timer=setInterval(()=>{if(start()||++tries>30){clearInterval(timer);if(tries>30)status('Google sign-in could not load. Refresh to try again.');}},500);}
  if(token)await refresh();else status('Sign in to open your bakery.');
 }catch(e){status('Online accounts and rooms are not available yet. '+e.message);}
})();

let rewardState;
async function collectDailyReward(id){
 try{const r=await api('/rewards/claim',{game:id});const p=document.createElement('div');p.className='reward-reveal';p.textContent=`Daily rewards: +${r.reward.sugar} Sugar · +${r.reward.scraps} recipe scraps · ${r.reward.frosting}. Visit your pantry to craft and dress your buddy.`;const frosting=rewardState?.catalog.frostings.find(t=>t.name===r.reward.frosting);if(frosting)rewardImage(p,frosting);const badge=rewardState?.catalog.badges.find(b=>b.id===r.bonusBadge);if(badge){line(p,'Your badge surprise: '+badge.name);rewardImage(p,badge);}$('results').prepend(p);}
 catch(e){const p=document.createElement('p');p.textContent='Your game is saved. Rewards could not be collected yet. Open your reward pantry to retry.';$('results').prepend(p);}
}
async function refreshRewards(){
 try{rewardState=await api('/rewards');rewardState.catalog.frostings??=(rewardState.catalog.tiers||[]).map((t,i)=>({name:t.frosting,asset:'rewards/frosting-'+i+'.svg'}));$('reward-message').textContent='';renderRewardCatalog($('reward-content'),rewardState.catalog,rewardState,{
 claim:async id=>{const result=await api('/rewards/claim',{game:id});await refreshRewards();const reveal=$('reward-reveal');reveal.replaceChildren();reveal.className='reward-reveal';line(reveal,`Fresh from the oven: ${result.reward.sugar} Sugar, ${result.reward.scraps} scraps and ${result.reward.frosting}.`);const badge=rewardState.catalog.badges.find(b=>b.id===result.bonusBadge);if(badge){line(reveal,'Badge surprise: '+badge.name);rewardImage(reveal,badge);}},
 equip:async(slot,item)=>{await api('/rewards/equip',{slot,item});await refreshRewards();},
 buy:async item=>{await api('/rewards/buy',{item,key:crypto.randomUUID()});await refreshRewards();$('reward-message').textContent='Added to your wardrobe. Choose Wear to put it on.';},
 craft:async()=>{const key=sessionStorage.getItem('donutopia.craftKey')||crypto.randomUUID();sessionStorage.setItem('donutopia.craftKey',key);const result=await api('/rewards/craft',{key});sessionStorage.removeItem('donutopia.craftKey');await refreshRewards();const b=rewardState.catalog.buddies.find(b=>b.id===result.item);const reveal=$('reward-reveal');reveal.replaceChildren();reveal.className='reward-reveal';rewardImage(reveal,b);line(reveal,'Fresh from the oven: '+b.name+'!');button(reveal,'Bring along',async()=>{await api('/rewards/equip',{slot:'buddy',item:b.id});await refreshRewards();});reveal.scrollIntoView({behavior:'smooth',block:'center'});}
 });}catch(e){$('reward-message').textContent='The reward pantry is not available yet. Your saved games are safe. '+e.message;const a=document.createElement('a');a.href=new URL('bakery/',base);a.textContent='Preview all buddies and cosmetics';$('reward-content').replaceChildren(a);}
}

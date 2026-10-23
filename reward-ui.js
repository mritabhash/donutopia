/* Shared pixel collection renderer. Public gallery is read-only; all spending is server-authorized. */
function rewardImage(parent,item){const img=document.createElement('img');img.src=new URL(item.asset,base);img.alt=item.name;img.width=96;img.height=96;img.loading='lazy';parent.append(img);}
function rewardCard(parent,item,locked=false){const card=document.createElement('article');card.className='reward-card'+(locked?' unowned':'');rewardImage(card,item);const h=document.createElement('h3');h.textContent=item.name;card.append(h);parent.append(card);return card;}
function rewardGrid(parent,title){const h=document.createElement('h3');h.textContent=title;parent.append(h);const grid=document.createElement('div');grid.className='reward-grid';parent.append(grid);return grid;}
function rewardAvatar(parent,catalog,loadout){const scene=document.createElement('div');scene.className='bakery-avatar';const buddy=catalog.buddies.find(b=>b.id===loadout.buddy);if(buddy)rewardImage(scene,buddy);else {const p=document.createElement('p');p.textContent='Your buddy belongs here';scene.append(p);}for(const slot of ['aura','hat','frame']){const item=catalog.cosmetics.find(c=>c.id===loadout[slot]);if(item){const img=document.createElement('img');img.src=new URL(item.asset,base);img.alt=item.name;img.className='layer '+slot;scene.append(img);}}parent.append(scene);}
function renderRewardCatalog(parent,catalog,state,actions){
 parent.replaceChildren();const preview=!state,owns=id=>!!state?.items.some(x=>x.item===id),loadout=state?.loadout||{};
 const intro=document.createElement('p');intro.textContent=preview?'Meet your next batch of friends. Finish saved daily games to earn Sugar and recipe scraps.':'Cosmetics change your look. They never change your score.';parent.append(intro);
 if(state){
  const balance=document.createElement('div');balance.className='reward-balance';balance.textContent=`${state.wallet.sugar} Sugar · ${state.wallet.scraps} recipe scraps`;parent.append(balance);rewardAvatar(parent,catalog,loadout);
  const equippedBadge=catalog.badges.find(b=>b.id===loadout.badge);if(equippedBadge)line(parent,'Wearing: '+equippedBadge.name);
  if(state.claims.length){const shelf=rewardGrid(parent,'Your daily frosting shelf');for(const claim of state.claims.slice(0,7)){const i=catalog.tiers.findIndex(t=>t.frosting===claim.frosting);const card=rewardCard(shelf,{name:claim.frosting,asset:'rewards/frosting-'+i+'.svg'});line(card,claim.day+' · '+claim.score+' points');}}
  for(const g of state.pending){const row=line(parent,`${g.day}: ${g.score} points, rewards ready`);button(row,'Collect daily rewards',()=>actions.claim(g.id));}
 }
 const recipe=document.createElement('p');recipe.textContent=`Craft a mystery buddy for ${catalog.craftCost} recipe scraps. Each unowned buddy has an equal chance. No duplicates. Seven to collect.`;parent.append(recipe);
 if(state){const have=catalog.buddies.filter(b=>owns(b.id)).length;button(parent,have===7?'Collection complete':'Bake a mystery buddy',actions.craft);parent.lastChild.disabled=have===7||state.wallet.scraps<catalog.craftCost;}
 const buddies=rewardGrid(parent,'The seven baking buddies');
 for(const b of catalog.buddies){const card=rewardCard(buddies,b,state&&!owns(b.id));line(card,b.description);if(preview)line(card,'Mystery recipe');else if(owns(b.id))button(card,loadout.buddy===b.id?'Selected':'Bring along',()=>actions.equip('buddy',b.id));else line(card,'Not baked yet');}
 for(const slot of ['hat','aura','frame']){
  const grid=rewardGrid(parent,{hat:'Toppers & hats',aura:'Sprinkles & sparkles',frame:'Display frames'}[slot]);
  if(state&&loadout[slot])button(parent,'Remove '+slot,()=>actions.equip(slot,null));
  for(const c of catalog.cosmetics.filter(c=>c.slot===slot)){const card=rewardCard(grid,c);line(card,c.price+' Sugar');if(state){button(card,owns(c.id)?(loadout[slot]===c.id?'Wearing':'Wear'):'Buy',()=>owns(c.id)?actions.equip(slot,c.id):actions.buy(c.id));card.lastChild.disabled=!owns(c.id)&&state.wallet.sugar<c.price;}}
 }
 const badges=rewardGrid(parent,'Baker badges');for(const b of catalog.badges){const earned=state?.badges.includes(b.id),card=rewardCard(badges,b,state&&!earned);line(card,b.description);if(earned)button(card,loadout.badge===b.id?'Wearing':'Show badge',()=>actions.equip('badge',b.id));else if(state)line(card,'Still in the oven');}
 const h=document.createElement('h3');h.textContent='Daily rewards, by score';parent.append(h);
 const table=document.createElement('table');table.className='reward-table';const head=document.createElement('tr');for(const label of ['Score / 700','Sugar','Scraps','Frosting']){const th=document.createElement('th');th.textContent=label;head.append(th);}table.append(head);
 catalog.tiers.forEach((t,i)=>{const row=document.createElement('tr');const values=[t.min+'–'+(catalog.tiers[i+1]?catalog.tiers[i+1].min-1:700),t.sugar,t.scraps,t.frosting];for(const val of values){const td=document.createElement('td');td.textContent=val;row.append(td);}table.append(row);});parent.append(table);
 line(parent,'Rewards are earned once per saved daily batch. Frosting is a collectible finish recorded for that day. Badges count qualifying days, not consecutive streaks. Offline and room games do not earn currency.');
}

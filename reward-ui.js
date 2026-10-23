const BAKERY_PERSONALITIES={
 glaze:{motion:'wobble',action:'Boop Glaze',lines:['Oh! A visitor! Have a sprinkle.','Personal space? Is that a new frosting?','You came back. I saved the pink ones.']},
 crumb:{motion:'shake',action:'Poke Crumb',lines:['That was a structural crumb.','I am holding myself together. Mostly.','No, you may not dunk me.']},
 crescent:{motion:'bow',action:'Greet Crescent',lines:['A little bow. A lot of butter.','Please, admire my layers.','Flaky? I prefer complicated.']},
 mallow:{motion:'squish',action:'Squish Mallow',lines:['Five more minutes in the warm bowl.','That tickles. Very slowly.','I was dreaming of a softer pillow.']},
 miso:{motion:'hop',action:'Challenge Miso',lines:['Perfect landing. Obviously.','Two shells. One enormous opinion.','I do not crack under pressure. Usually.']},
 cocoa:{motion:'nod',action:'Check on Cocoa',lines:['You did enough today. Sit here.','I kept the corner piece for you.','No rush. The oven can wait.']},
 pip:{motion:'spin',action:'Cheer with Pip',lines:['I HAVE A VERY SMALL ANNOUNCEMENT!','Confetti! Wait. Those were blueberries.','Again! Again! One more little spin!']},
 'hat-0':{motion:'bow',action:'Salute the chef hat',lines:['Yes, chef. Even for toast.','Kitchen inspection: suspiciously delicious.']},
 'hat-1':{motion:'hop',action:'Tease the cherry',lines:['I am the main event.','Saved the best bit for the top.']},
 'hat-2':{motion:'nod',action:'Greet the butter crown',lines:['Your Butterliness has arrived.','A royal decree: extra butter.']},
 'hat-3':{motion:'shake',action:'High-five the oven mitt',lines:['Hot tray? I have got you.','A warm high-five. Safely warm.']},
 'hat-4':{motion:'wobble',action:'Fluff the sugar bow',lines:['A little flourish never hurt.','Ready for my close-up.']},
 'hat-5':{motion:'flicker',action:'Make a candle wish',lines:['Your secret is safe with my flame.','Another tiny reason to celebrate.']},
 'aura-0':{motion:'shower',action:'Toss pink sprinkles',lines:['No such thing as too many sprinkles.','A little mess looks good on you.']},
 'aura-1':{motion:'twinkle',action:'Wake the sugar stars',lines:['One small constellation, just for you.','We only sparkle for good company.']},
 'aura-2':{motion:'shake',action:'Rattle cocoa chips',lines:['Crunch first. Questions later.','We refuse to melt under pressure.']},
 'aura-3':{motion:'pulse',action:'Stir honey sparks',lines:['Slow and golden. That is the plan.','Sticky situation? We live for those.']},
 'aura-4':{motion:'spin',action:'Swirl mint confetti',lines:['Fresh breeze coming through!','We have absolutely no indoor voice.']},
 'aura-5':{motion:'float',action:'Pop blueberry bubbles',lines:['Pop. A tiny worry has disappeared.','Up we go. No particular destination.']}
};
function makeRewardInteractive(img,item,parent){
 const personality=BAKERY_PERSONALITIES[item.id];if(!personality)return;
 const control=document.createElement('button');control.type='button';control.className='pixel-play';control.setAttribute('aria-label',personality.action);img.replaceWith(control);control.append(img);
 const speech=document.createElement('span');speech.className='pixel-speech';speech.setAttribute('role','status');speech.setAttribute('aria-live','polite');parent.append(speech);let count=0,timer;
 control.onclick=()=>{clearTimeout(timer);img.classList.remove('reacting');void img.offsetWidth;img.style.setProperty('--reaction',personality.motion);img.classList.add('reacting');speech.textContent=personality.lines[count++%personality.lines.length];timer=setTimeout(()=>img.classList.remove('reacting'),1100);};
 img.classList.add('living-pixel');img.style.setProperty('--idle-delay',(-Object.keys(BAKERY_PERSONALITIES).indexOf(item.id)%5)+'s');
}

/* Shared pixel collection renderer. Public gallery is read-only; all spending is server-authorized. */
function rewardImage(parent,item){const img=document.createElement('img');img.src=new URL(item.asset,base);img.alt=item.name;img.width=96;img.height=96;img.loading='lazy';parent.append(img);makeRewardInteractive(img,item,parent);}
function rewardCard(parent,item,locked=false){const card=document.createElement('article');card.className='reward-card'+(locked?' unowned':'');rewardImage(card,item);const h=document.createElement('h3');h.textContent=item.name;card.append(h);parent.append(card);return card;}
function rewardGrid(parent,title){const h=document.createElement('h3');h.textContent=title;parent.append(h);const grid=document.createElement('div');grid.className='reward-grid';parent.append(grid);return grid;}
function rewardAvatar(parent,catalog,loadout){const scene=document.createElement('div');scene.className='bakery-avatar';const buddy=catalog.buddies.find(b=>b.id===loadout.buddy);if(buddy)rewardImage(scene,buddy);else {const p=document.createElement('p');p.textContent='Your buddy belongs here';scene.append(p);}for(const slot of ['aura','hat','frame']){const item=catalog.cosmetics.find(c=>c.id===loadout[slot]);if(item){const img=document.createElement('img');img.src=new URL(item.asset,base);img.alt=item.name;img.className='layer '+slot;scene.append(img);}}parent.append(scene);for(const slot of ['hat','aura']){const item=catalog.cosmetics.find(c=>c.id===loadout[slot]);if(item){const display=document.createElement('div');display.className='equipped-play';rewardImage(display,item);parent.append(display);}}}
function renderRewardCatalog(parent,catalog,state,actions){
 parent.replaceChildren();const preview=!state,owns=id=>!!state?.items.some(x=>x.item===id),loadout=state?.loadout||{};
 const intro=document.createElement('p');intro.textContent=preview?'Meet your next batch of friends. Finish saved daily games to earn Sugar and recipe scraps.':'Cosmetics change your look. They never change your score.';parent.append(intro);
 if(state){
  const balance=document.createElement('div');balance.className='reward-balance';balance.textContent=`${state.wallet.sugar} Sugar · ${state.wallet.scraps} recipe scraps`;parent.append(balance);rewardAvatar(parent,catalog,loadout);
  const equippedBadge=catalog.badges.find(b=>b.id===loadout.badge);if(equippedBadge)line(parent,'Wearing: '+equippedBadge.name);
  if(state.claims.length){const shelf=rewardGrid(parent,'Your daily frosting shelf');for(const claim of state.claims.slice(0,7)){const frosting=catalog.frostings.find(t=>t.name===claim.frosting);const card=rewardCard(shelf,frosting||{name:claim.frosting,asset:'rewards/frosting-0.svg'});line(card,claim.day+' · '+claim.score+' points');}}
  for(const g of state.pending){const row=line(parent,`${g.day}: ${g.score} points, rewards ready`);button(row,'Collect daily rewards',()=>actions.claim(g.id));}
 }
 const recipe=document.createElement('p');recipe.textContent=`Craft a mystery buddy for ${catalog.craftCost} recipe scraps. The oven picks your next friend. No duplicates.`;parent.append(recipe);
 if(state){const have=catalog.buddies.filter(b=>owns(b.id)).length;button(parent,have===7?'Collection complete':'Bake a mystery buddy',actions.craft);parent.lastChild.disabled=have===7||state.wallet.scraps<catalog.craftCost;}
 const buddies=rewardGrid(parent,'The seven baking buddies');
 for(const b of catalog.buddies){const card=rewardCard(buddies,b,state&&!owns(b.id));line(card,b.description);if(preview)line(card,'Mystery recipe');else if(owns(b.id))button(card,loadout.buddy===b.id?'Selected':'Bring along',()=>actions.equip('buddy',b.id));else line(card,'Not baked yet');}
 for(const slot of ['hat','aura','frame']){
  const grid=rewardGrid(parent,{hat:'Toppers & hats',aura:'Sprinkles & sparkles',frame:'Display frames'}[slot]);
  if(state&&loadout[slot])button(parent,'Remove '+slot,()=>actions.equip(slot,null));
  for(const c of catalog.cosmetics.filter(c=>c.slot===slot)){const card=rewardCard(grid,c);line(card,c.price+' Sugar');if(state){button(card,owns(c.id)?(loadout[slot]===c.id?'Wearing':'Wear'):'Buy',()=>owns(c.id)?actions.equip(slot,c.id):actions.buy(c.id));card.lastChild.disabled=!owns(c.id)&&state.wallet.sugar<c.price;}}
 }
 const badges=rewardGrid(parent,'Baker badges');for(const b of catalog.badges){const earned=state?.badges.includes(b.id),card=rewardCard(badges,b,state&&!earned);line(card,earned?'Found in a daily surprise.':'A secret waiting to be found.');if(earned)button(card,loadout.badge===b.id?'Wearing':'Show badge',()=>actions.equip('badge',b.id));else if(state)line(card,'Still in the oven');}
 line(parent,'Finish a saved daily batch, open your surprises, and see what the oven has made for you.');
}

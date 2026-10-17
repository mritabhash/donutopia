(async()=>{
 const base=new URL(document.currentScript?.src||document.querySelector('script[src$="pages-bootstrap.js"]').src).pathname.replace(/\/pages-bootstrap\.js$/,'');
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');if(!a||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const u=new URL(a.href,location.href);
  if(u.origin===location.origin){event.preventDefault();event.stopImmediatePropagation();const p=u.pathname.startsWith(base+'/')?u.pathname:base+u.pathname;location.assign(p+u.search+u.hash);}
  else if(/buy\.stripe\.com|shop\.krillion\.io/.test(u.hostname)){event.preventDefault();event.stopImmediatePropagation();alert('Purchases are not connected in this replica.');}
 },true);
 document.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&/sign in with|continue with|send.*link|restore purchase/i.test(b.textContent)){event.preventDefault();event.stopImmediatePropagation();alert('Account services are unavailable in this replica. Your progress is saved in this browser.');}},true);
 if(location.pathname.replace(/\/$/,'')===base){
  const welcome=document.createElement('section');
  welcome.setAttribute('aria-label','Welcome to Donutopia');
  welcome.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#180f19;color:#fff0dc;display:flex;align-items:center;justify-content:center;padding:24px;overflow:auto;text-align:center;font-family:monospace';
  welcome.innerHTML=`<div style="max-width:440px"><p style="color:#f3bc7a;letter-spacing:.2em">THE DAILY BAKE</p><h1 style="font-size:clamp(34px,9vw,52px);letter-spacing:.06em">DONUTOPIA</h1><p style="line-height:1.8;color:#c5aabd">Seven prompts. Rare answers make a sweeter batch.</p><button type="button" style="margin:24px 0;padding:18px 24px;background:#302032;color:#fff0dc;border:3px solid #f3bc7a;font:inherit;font-size:18px;cursor:pointer">OPEN DAILY BAKE</button><p style="font-size:13px;line-height:1.7;color:#c5aabd">Your saved bake or results will open here.<br>This version has a fixed daily puzzle.</p><a href="${base}/packs/" style="display:inline-block;margin-top:18px;color:#f3bc7a">EXPLORE RECIPE BOXES →</a></div>`;
  document.body.appendChild(welcome);
  await new Promise(resolve=>welcome.querySelector('button').addEventListener('click',()=>{welcome.remove();resolve()},{once:true}));
 }
 try{
  await navigator.serviceWorker.register(base+'/sw.js',{scope:base+'/'});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
  for(const old of document.querySelectorAll('script[type="application/x-krillion"]')){const script=document.createElement('script');for(const a of old.attributes)if(a.name!=='type')script.setAttribute(a.name,a.name==='src'?a.value.replace(base+'/_next/','/_next/'):a.value);script.textContent=old.textContent;old.replaceWith(script);}
 }catch(e){document.body.textContent='The game needs service workers enabled in this browser. Please enable them and reload.';console.error(e);}
})();

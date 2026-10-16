(async()=>{
 const base=new URL(document.currentScript?.src||document.querySelector('script[src$="pages-bootstrap.js"]').src).pathname.replace(/\/pages-bootstrap\.js$/,'');
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');if(!a||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const u=new URL(a.href,location.href);
  if(u.origin===location.origin){event.preventDefault();event.stopImmediatePropagation();const p=u.pathname.startsWith(base+'/')?u.pathname:base+u.pathname;location.assign(p+u.search+u.hash);}
  else if(/buy\.stripe\.com|shop\.krillion\.io/.test(u.hostname)){event.preventDefault();event.stopImmediatePropagation();alert('Purchases are not connected in this replica.');}
 },true);
 document.addEventListener('click',event=>{const b=event.target.closest('button');if(b&&/sign in with|continue with|send.*link|restore purchase/i.test(b.textContent)){event.preventDefault();event.stopImmediatePropagation();alert('Account services are unavailable in this replica. Your progress is saved in this browser.');}},true);
 try{
  await navigator.serviceWorker.register(base+'/sw.js',{scope:base+'/'});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
  for(const old of document.querySelectorAll('script[type="application/x-krillion"]')){const script=document.createElement('script');for(const a of old.attributes)if(a.name!=='type')script.setAttribute(a.name,a.name==='src'?a.value.replace(base+'/_next/','/_next/'):a.value);script.textContent=old.textContent;old.replaceWith(script);}
 }catch(e){document.body.textContent='The game needs service workers enabled in this browser. Please enable them and reload.';console.error(e);}
})();

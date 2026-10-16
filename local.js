// Keep navigation on the captured local pages, without Next's remote RSC server.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');
  if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  const url=new URL(link.href,location.href);
  if(url.origin===location.origin&&url.pathname!==location.pathname){event.preventDefault();event.stopImmediatePropagation();location.assign(url.pathname+url.search+url.hash);}
  else if(/buy\.stripe\.com|shop\.krillion\.io/.test(url.hostname)){event.preventDefault();event.stopImmediatePropagation();alert('This is the local replica. Purchases are not connected.');}
},true);
document.addEventListener('click',event=>{
 const button=event.target.closest('button');
 if(button&&/sign in with|continue with|send.*link|restore purchase/i.test(button.textContent)){event.preventDefault();event.stopImmediatePropagation();alert('Account services are unavailable in the local replica. Your game progress is saved in this browser.');}
},true);

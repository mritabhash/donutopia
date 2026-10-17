// Donutopia midnight bakery theme, version 2.
importScripts('./pages-scoring.js');
const base=new URL(self.registration.scope).pathname.replace(/\/$/,'');
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const read=async p=>{const r=await fetch(base+'/data/'+p);if(!r.ok)throw Error('Missing puzzle data');return r.json();};
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function api(request,p){
 if(p==='/api/today')return json(await read('today.json'));
 if(p==='/api/reveal')return json(await read('api/reveal.json'));
 if(p==='/api/announcements/current')return json({announcement:null});
 if(p==='/api/calibration')return json({ok:true,eligible:false,open:false,status:'closed'});
 if(p==='/api/submit'){const b=await request.json();const reveal=await read('api/reveal.json');return json(scoreAnswer(reveal.prompts.find(x=>x.id===b.promptId),b.answer,b.previewCorrection));}
 if(p.endsWith('/complete'))return json({ok:true,betterThan:null,dist:null});
 if(p==='/api/answer-popularity'){const today=await read('today.json');return json({date:today.date,asOf:new Date().toISOString(),prompts:{}});}
 const match=p.match(/^\/api\/(unlimited|packs\/(?:movies|sports|geography|lexicon))\/(\d+)(?:\/(submit|reveal))?$/);
 if(match){const [,pack,id,action]=match;if(id!=='1')return json({error:'locked',locked:true},402);const file='api/'+pack+'/'+id;if(action==='submit'){const b=await request.json();const data=await read(file+'/reveal.json');return json(scoreAnswer((data.rounds??data.prompts).find(x=>x.id===b.round||x.round===b.round),b.answer,b.previewCorrection));}return json(await read(file+(action?'/'+action:'')+'.json'));}
 if(p.startsWith('/api/archive/'))return json({error:'locked',locked:true},402);
 if(p==='/api/account/progress')return json({records:[],next:null});
 if(p==='/api/account/purchases')return json({packs:{}});
 return json({ok:false,error:'This service is not connected in the replica.'},503);
}
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==location.origin)return;
 let p=url.pathname.startsWith(base+'/')?url.pathname.slice(base.length):url.pathname;
 event.respondWith((async()=>{
  if(p.startsWith('/api/'))return api(event.request,p);
  if(p==='/_next/image'){const image=url.searchParams.get('url');if(!image?.startsWith('/')||image.startsWith('//'))return new Response('Not found',{status:404});return fetch(base+image);}
  if(event.request.mode==='navigate'&&!pathHasExtension(p))p=p.replace(/\/$/,'')+'/index.html';
  return fetch(base+p+url.search);
 })().catch(()=>new Response('Unable to load this resource',{status:503})));
});
function pathHasExtension(p){return /\.[a-z0-9]+$/i.test(p);}

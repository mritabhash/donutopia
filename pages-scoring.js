function normalize(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g, '');
}
function distance(a,b) {
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
  return row[b.length];
}
function scoreAnswer(prompt, raw, previewCorrection=true) {
  const answer=String(raw??'').trim();const key=normalize(answer);
  if(!key||key.length>160||!prompt)return {accepted:false};
  const options=prompt.answers??[];
  let match=options.find(x=>normalize(x.answer)===key);
  if(!match)match=options.find(x=>normalize(x.answer)+'s'===key||normalize(x.answer)===key+'s');
  if(!match&&key.length>=5){const candidates=options.map(x=>({x,d:distance(key,normalize(x.answer))})).filter(x=>x.d<=(key.length>10?2:1)).sort((a,b)=>a.d-b.d);if(candidates.length&&(!candidates[1]||candidates[0].d<candidates[1].d)){if(previewCorrection)return {correction:candidates[0].x.answer};match=candidates[0].x;}}
  return match?{accepted:true,...match}:{accepted:false};
}

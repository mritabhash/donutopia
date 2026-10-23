import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]
d=r/'rewards';d.mkdir(exist_ok=True)
buddies=[('glaze','Glaze','A strawberry donut with a generous sprinkle habit.'),('crumb','Crumb','A chocolate-chip cookie with very small boots.'),('crescent','Crescent','A buttery croissant, permanently pleased.'),('mallow','Mallow','A marshmallow who takes softness seriously.'),('miso','Miso','A pistachio macaron with a sweet centre.'),('cocoa','Cocoa','A brownie with a slightly wonky crown of chocolate.'),('pip','Pip','A blueberry cupcake, baked for company.')]
cosmetics=[]
for group,names in [('hat',['Chef hat','Cherry topper','Butter crown','Oven mitt','Sugar bow','Party candle']),('aura',['Pink sprinkles','Sugar stars','Cocoa chips','Honey sparks','Mint confetti','Blueberry bubbles']),('frame',['Biscuit frame','Strawberry frame','Chocolate frame','Pistachio frame','Blueberry frame','Golden oven'])]:
 for i,name in enumerate(names): cosmetics.append(dict(id=group+'-'+str(i),name=name,slot=group,price=[50,75,100,125,150,200][i],asset='rewards/'+group+'-'+str(i)+'.svg'))
badges=[('first-bake','First bake',1,1,'Finish a daily batch with at least 1 point.'),('sweet-start','Sweet start',100,1,'Score 100 in one daily batch.'),('rising-dough','Rising dough',200,1,'Score 200 in one daily batch.'),('golden-batch','Golden batch',300,1,'Score 300 in one daily batch.'),('rare-recipe','Rare recipe',400,1,'Score 400 in one daily batch.'),('master-baker','Master baker',500,1,'Score 500 in one daily batch.'),('sugar-legend','Sugar legend',600,1,'Score 600 in one daily batch.'),('perfect-oven','Perfect oven',700,1,'Score 700 in one daily batch.'),('three-trays','Three trays',100,3,'Score at least 100 on 3 daily batches.'),('seven-sweets','Seven sweets',200,7,'Score at least 200 on 7 daily batches.'),('fortnight-feast','Fortnight feast',300,14,'Score at least 300 on 14 daily batches.'),('bakery-royalty','Bakery royalty',400,30,'Score at least 400 on 30 daily batches.')]
cat=dict(craftCost=5,buddies=[dict(id=id,name=name,description=desc,asset='rewards/'+id+'.svg') for id,name,desc in buddies],cosmetics=cosmetics,badges=[dict(id=id,name=name,threshold=score,count=count,description=desc,asset='rewards/badge-'+id+'.svg') for id,name,score,count,desc in badges],tiers=[dict(min=0,sugar=0,scraps=0,frosting='Unfrosted',color='#9d7e79'),dict(min=1,sugar=20,scraps=1,frosting='Vanilla glaze',color='#fff0dc'),dict(min=150,sugar=40,scraps=2,frosting='Strawberry swirl',color='#ee719a'),dict(min=300,sugar=70,scraps=3,frosting='Maple shimmer',color='#f9c76b'),dict(min=450,sugar=105,scraps=4,frosting='Blueberry sparkle',color='#a29bfa'),dict(min=600,sugar=150,scraps=5,frosting='Golden sugar',color='#ffe895')])
(d/'catalog.json').write_text(json.dumps(cat,indent=2))
# Pixel assets use integer-grid rectangles with no smoothing or bitmap dependencies.
colors={'o':'#291624','b':'#a85239','d':'#d58a45','g':'#f9c76b','c':'#fff0dc','p':'#ee719a','r':'#b44270','m':'#8bc69b','v':'#9790df','h':'#633444'}
def rect(x,y,w,h,c):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{colors.get(c,c)}"/>'
def svg(name,parts):
 (d/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><title>'+name.replace('-',' ')+'</title>'+''.join(parts)+'</svg>')
def face(y=17):return [rect(11,y,2,3,'o'),rect(20,y,2,3,'o'),rect(15,y+4,4,1,'o'),rect(9,y+3,2,1,'r'),rect(23,y+3,2,1,'r')]
feet=[rect(9,26,4,2,'o'),rect(20,26,4,2,'o')]
svg('glaze',feet+[rect(9,6,14,2,'o'),rect(5,8,22,17,'o'),rect(9,25,14,2,'o'),rect(7,9,18,15,'d'),rect(10,8,12,17,'d'),rect(8,10,16,10,'p'),rect(11,8,10,15,'p'),rect(13,12,6,6,'o'),rect(14,13,4,4,'b'),rect(9,11,2,1,'c'),rect(20,10,1,2,'g'),rect(22,15,2,1,'m'),rect(10,19,2,1,'v')]+face(20))
svg('crumb',feet+[rect(9,5,14,23,'o'),rect(5,9,22,15,'o'),rect(7,10,18,13,'d'),rect(10,7,12,19,'g')]+[rect(x,y,3,2,'h') for x,y in [(10,9),(18,8),(7,14),(22,13),(13,13),(18,23)]]+face())
svg('crescent',feet+[rect(3,11,26,11,'o'),rect(7,7,18,16,'o'),rect(11,5,10,20,'o'),rect(4,12,24,8,'d'),rect(8,8,16,14,'g'),rect(12,6,8,18,'g'),rect(10,8,2,14,'d'),rect(20,9,2,12,'d'),rect(2,18,5,4,'g'),rect(26,17,4,4,'g')]+face(14))
svg('mallow',feet+[rect(8,5,16,23,'o'),rect(6,8,20,17,'o'),rect(8,8,16,17,'c'),rect(10,6,12,20,'c'),rect(8,23,16,3,'p'),rect(9,9,2,6,'#ffffff')]+face())
svg('miso',feet+[rect(8,6,16,21,'o'),rect(4,10,24,13,'o'),rect(6,11,20,11,'m'),rect(9,8,14,17,'m'),rect(5,16,22,4,'c'),rect(7,15,18,1,'g'),rect(9,9,6,2,'c')]+face(12))
svg('cocoa',feet+[rect(5,8,22,19,'o'),rect(7,10,18,15,'b'),rect(6,9,20,5,'h'),rect(9,6,4,5,'h'),rect(17,7,6,5,'h'),rect(8,22,17,3,'h'),rect(8,11,3,2,'g'),rect(19,10,4,2,'g')]+face())
svg('pip',feet+[rect(8,17,17,10,'o'),rect(10,18,13,7,'p'),rect(5,12,23,8,'o'),rect(8,8,17,6,'o'),rect(12,5,9,5,'o'),rect(7,13,19,5,'c'),rect(10,9,13,6,'c'),rect(14,6,5,5,'c'),rect(15,3,4,4,'v'),rect(12,19,2,6,'r'),rect(21,19,2,6,'r')]+face(13))
for i in range(6):
 hats=[[rect(8,6,17,9,'c'),rect(11,3,11,5,'c'),rect(10,15,13,3,'p')],[rect(12,10,9,8,'r'),rect(14,9,6,7,'p'),rect(17,5,2,5,'m'),rect(19,4,4,2,'m')],[rect(7,8,4,10,'g'),rect(14,5,4,13,'g'),rect(22,8,4,10,'g'),rect(7,16,19,4,'d')],[rect(11,5,10,15,'p'),rect(7,10,5,7,'p'),rect(11,19,10,3,'c')],[rect(5,8,9,10,'p'),rect(19,8,9,10,'p'),rect(13,11,7,5,'g')],[rect(14,9,5,13,'v'),rect(15,3,3,5,'g'),rect(14,12,5,2,'p'),rect(14,18,5,2,'p')]][i]
 svg('hat-'+str(i),hats)
 col=['p','g','h','d','m','v'][i];parts=[]
 for x,y in [(4,5),(23,3),(27,14),(5,23),(24,25),(2,14)]:
  parts+=[rect(x,y,2,2,col)]
  if i in [1,3]:parts += [rect(x-1,y+1,4,1,col),rect(x+1,y-1,1,4,col)]
 svg('aura-'+str(i),parts)
 col=['d','p','h','m','v','g'][i]
 svg('frame-'+str(i),[rect(1,1,30,2,col),rect(1,29,30,2,col),rect(1,3,2,26,col),rect(29,3,2,26,col)]+[rect(x,y,3,3,'c') for x,y in [(1,1),(28,1),(1,28),(28,28)]])
for i,tier in enumerate(cat['tiers']):
 svg('frosting-'+str(i),[rect(8,10,16,18,'o'),rect(10,12,12,14,tier['color']),rect(7,6,18,5,'h'),rect(9,4,14,3,'g'),rect(12,16,8,6,'c'),rect(15,17,2,4,tier['color'])])
for i,(id,_,_,_,_) in enumerate(badges):
 col=['d','p','m','g','v','g','p','g','m','v','p','g'][i]
 parts=[rect(9,21,5,9,'r'),rect(19,21,5,9,'r'),rect(9,3,15,23,'o'),rect(5,7,23,15,'o'),rect(10,5,13,19,col),rect(7,8,19,13,col),rect(11,8,11,12,'h')]
 # Distinct pixel glyphs, including stacked trays for cumulative badges.
 glyphs=[[(12,12,9,5),(14,10,5,2)],[(12,11,9,8),(14,10,5,10)],[(12,15,9,4),(14,12,5,4),(15,10,3,3)],[(12,14,9,5),(13,10,2,5),(18,10,2,5)],[(12,13,9,3),(15,10,3,9)],[(12,10,3,8),(19,10,2,8),(15,13,4,6)],[(12,13,9,2),(16,9,1,10),(13,10,2,2),(19,16,2,2)],[(12,10,2,9),(19,10,2,9),(14,17,5,2),(15,12,2,2)],[(12,10,9,2),(12,14,9,2),(12,18,9,2)],[(12,10,9,2),(18,12,3,7)],[(12,10,2,9),(16,10,2,6),(16,15,6,2),(20,10,2,9)],[(12,10,2,7),(15,9,3,8),(20,10,2,7),(12,17,10,2)]]
 for x,y,w,h in glyphs[i]:parts.append(rect(x,y,w,h,'c'))
 parts += [rect(12,18,9,1,'g')]
 svg('badge-'+id,parts)
print('Created',len(list(d.glob('*.svg'))),'pixel assets')

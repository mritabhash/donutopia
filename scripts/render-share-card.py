"""Render the website's typography-only social card using its existing font."""
from pathlib import Path
from io import BytesIO
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
font=TTFont(ROOT/'_next/static/media/0c8c4ded07fff55c-s.p.2tcyrya9o07vu.woff2');font.flavor=None
buf=BytesIO();font.save(buf);fontdata=buf.getvalue()
def face(size):return ImageFont.truetype(BytesIO(fontdata),size)
im=Image.new('RGB',(1200,630),'#180f19');d=ImageDraw.Draw(im)
d.rectangle((35,35,1165,595),outline='#624250',width=2)
d.rectangle((75,84,155,91),fill='#f3bc7a')
d.text((75,155),'DONUTOPIA',font=face(126),fill='#fff0dc')
d.text((80,300),'THE DAILY BAKE',font=face(44),fill='#f3bc7a')
d.text((80,383),'Seven prompts. Bake a rarer batch.',font=face(32),fill='#c5aabd')
d.text((80,522),'mritabhash.github.io/donutopia',font=face(27),fill='#c5aabd')
im.save(ROOT/'donutopia-share-v2.png',optimize=True)

# The Veterinary Society mark, in two arrangements on one 1800x614 plate.
# Every stroke scales with the drawing (no vector-effect): the lines are part of the proportion, and a
# stroke fixed in screen pixels made the header and the phone strip heavy and filled the ears solid.
#   shut: the head and the name, small, in the band a shut door shows (y 219-395)
#   open: the head big at the left beside the words, the name in the middle, and the magazine's
#         other three animals — pig, hen, cow — drawing themselves in on the right.
# Every element is authored in its group's own box; a group carries where it sits in each state.
import json, sys
CREAM, MOSS, AMBER = '#F3E7C9', '#9DB7AE', '#F5A623'
def path(cmds):
    return ' '.join(c[0] + ' ' + ' '.join(f'{x:.0f} {y:.0f}' for x, y in c[1:]) for c in cmds)

# ---------- the head: a horse in one line (local box ~0..400 x -10..425) ----------
head_paths = [
  # left ear: up the front edge to the tip, back down the rear edge to the poll
  dict(d=path([('M',(230,74)), ('C',(214,48),(200,20),(196,-8)), ('C',(214,10),(234,40),(244,68))]), width=9, colour=CREAM, at=0.00, seconds=.25),
  # right ear
  dict(d=path([('M',(266,70)), ('C',(276,38),(290,14),(304,-4)), ('C',(306,24),(292,52),(276,74))]), width=9, colour=CREAM, at=0.10, seconds=.25),
  # the tube: poll -> forehead -> nose -> muzzle -> lips -> jaw -> jowl -> cheek -> eye
  dict(d=path([('M',(248,72)),
               ('C',(238,108),(198,148),(160,190)), ('C',(128,226),(94,254),(66,282)),
               ('C',(44,304),(38,330),(56,344)),    ('C',(76,358),(104,352),(124,338)),
               ('C',(150,330),(196,338),(240,334)), ('C',(290,330),(326,296),(322,246)),
               ('C',(318,210),(288,178),(246,164))]), width=9, colour=CREAM, at=0.30, seconds=.95),
  # a forelock between the ears, and the mane down the crest
  dict(d=path([('M',(252,70)), ('C',(238,84),(226,104),(222,124))]), width=5, colour=MOSS, at=0.5, seconds=.2),
  dict(d=path([('M',(292,68)), ('C',(348,100),(384,180),(390,300))]), width=6, colour=MOSS, at=0.55, seconds=.4),
  dict(d=path([('M',(300,92)), ('C',(332,132),(346,190),(344,258))]), width=5, colour=MOSS, at=0.62, seconds=.35),
  dict(d=path([('M',(314,122)), ('C',(348,160),(362,214),(362,280))]), width=5, colour=MOSS, at=0.69, seconds=.35),
  dict(d=path([('M',(326,160)), ('C',(364,200),(378,246),(380,300))]), width=5, colour=MOSS, at=0.76, seconds=.35),
  # the throat, down from the jowl
  dict(d=path([('M',(300,326)), ('C',(320,352),(336,384),(346,420))]), width=6, colour=MOSS, at=0.95, seconds=.3),
  # a nostril and the mouth
  dict(d=path([('M',(64,298)), ('C',(74,292),(84,294),(90,302))]), width=6, colour=CREAM, at=1.15, seconds=.18),
  dict(d=path([('M',(70,332)), ('C',(84,336),(98,336),(110,330))]), width=5, colour=CREAM, at=1.22, seconds=.18),
]
head_marks = [ dict(cx=222, cy=156, r=27, colour=CREAM, width=8, fill='none', at=1.28),
               dict(cx=222, cy=156, r=12, fill=AMBER, at=1.36) ]

# ---------- the name (local: baselines at 0, 56, 90) ----------
name_text = [
  dict(x=0, y=0,  text='Veterinary', size=58, family='Fraunces, Georgia, serif', style='italic', weight=400, fill=CREAM, at=1.45),
  dict(x=0, y=56, text='Society',    size=58, family='Fraunces, Georgia, serif', style='normal', weight=400, fill=CREAM, at=1.55),
  dict(x=3, y=90, text='NLCS JEJU',  size=15, family="'IBM Plex Mono', monospace", spacing=4, fill=MOSS, at=1.65),
]

# ---------- the pig, side on, facing left (local ~0..300 x 0..185) ----------
pig_paths = [
  # the body, one round shape that is also the head
  dict(d=path([('M',(72,64)), ('C',(112,32),(222,32),(262,66)), ('C',(292,92),(290,140),(258,158)),
               ('C',(220,176),(112,176),(74,152)), ('C',(46,134),(44,86),(72,64))]), width=5, colour=MOSS, at=1.25, seconds=.6),
  # the snout: a disc on the front
  dict(d=path([('M',(46,96)), ('C',(30,98),(28,124),(46,126)), ('C',(62,128),(64,94),(46,96))]), width=4, colour=MOSS, at=1.8, seconds=.2),
  dict(d=path([('M',(40,106)), ('L',(40,108)), ('M',(40,116)), ('L',(40,118))]), width=5, colour=MOSS, at=1.95, seconds=.08),   # the nostrils
  dict(d=path([('M',(60,134)), ('C',(70,142),(82,140),(90,132))]), width=4, colour=MOSS, at=2.0, seconds=.12),                  # the mouth
  dict(d=path([('M',(102,54)), ('L',(112,20)), ('L',(140,50))]), width=5, colour=MOSS, at=2.05, seconds=.2),                    # the ear
  dict(d=path([('M',(274,86)), ('C',(300,70),(306,100),(288,104)), ('C',(278,104),(278,92),(288,90))]), width=4, colour=MOSS, at=2.2, seconds=.25),  # the curl of the tail
  dict(d=path([('M',(102,172)), ('L',(102,190)), ('M',(130,175)), ('L',(130,190)), ('M',(200,175)), ('L',(200,190)), ('M',(232,170)), ('L',(234,190))]), width=5, colour=MOSS, at=2.4, seconds=.25),  # four legs
]
pig_marks = [ dict(cx=78, cy=86, r=4, fill=MOSS, at=2.55) ]

# ---------- the hen, side on, facing left (local ~0..230 x 0..200) ----------
hen_paths = [
  # the body, an egg lying on its side; the head sits on a short neck at its front
  dict(d=path([('M',(92,70)), ('C',(126,48),(180,58),(188,104)), ('C',(194,144),(156,168),(112,166)),
               ('C',(72,164),(46,140),(50,106)), ('C',(54,86),(70,74),(92,70))]), width=5, colour=MOSS, at=1.55, seconds=.55),
  dict(d=path([('M',(72,80)), ('C',(54,60),(58,26),(84,18)), ('C',(110,10),(128,30),(118,54)), ('C',(112,68),(100,72),(92,70))]), width=5, colour=MOSS, at=2.05, seconds=.3),  # the head
  dict(d=path([('M',(62,36)), ('L',(38,44)), ('L',(62,52))]), width=4, colour=MOSS, at=2.3, seconds=.12),   # the beak
  dict(d=path([('M',(80,20)), ('C',(78,4),(90,2),(92,14)), ('C',(96,0),(110,2),(108,16)), ('C',(114,8),(124,12),(122,26))]), width=4, colour=MOSS, at=2.4, seconds=.2),  # the comb
  dict(d=path([('M',(68,56)), ('C',(62,70),(76,76),(82,64))]), width=3, colour=MOSS, at=2.55, seconds=.1),   # the wattle
  dict(d=path([('M',(180,80)), ('C',(198,54),(214,46),(228,32)), ('M',(186,90)), ('C',(208,76),(224,76),(236,70)), ('M',(188,102)), ('C',(208,100),(222,106),(230,114))]), width=4, colour=MOSS, at=2.6, seconds=.3),  # the tail
  dict(d=path([('M',(104,166)), ('L',(104,190)), ('M',(92,192)), ('L',(118,192)), ('M',(130,165)), ('L',(132,190)), ('M',(120,192)), ('L',(146,192))]), width=4, colour=MOSS, at=2.85, seconds=.2),  # legs and feet
]
hen_marks = [ dict(cx=94, cy=36, r=4, fill=MOSS, at=3.0) ]

# ---------- the cow, head on (local ~0..280 x 0..300) ----------
cow_paths = [
  dict(d=path([('M',(96,92)), ('C',(84,140),(84,200),(98,236)),                   # the left side of the face
               ('C',(104,272),(176,272),(182,236)),                                # the muzzle
               ('C',(196,200),(196,140),(184,92)),                                 # the right side
               ('C',(174,56),(106,56),(96,92))]), width=5, colour=MOSS, at=1.75, seconds=.7),   # the poll
  dict(d=path([('M',(94,104)), ('C',(62,92),(30,98),(30,116)), ('C',(30,132),(66,130),(94,116))]), width=4, colour=MOSS, at=2.3, seconds=.3),   # the left ear
  dict(d=path([('M',(186,104)), ('C',(218,92),(250,98),(250,116)), ('C',(250,132),(214,130),(186,116))]), width=4, colour=MOSS, at=2.3, seconds=.3),  # the right ear
  dict(d=path([('M',(102,72)), ('C',(76,60),(52,40),(54,8)), ('C',(64,22),(84,34),(108,44))]), width=4, colour=MOSS, at=2.55, seconds=.3),    # the left horn
  dict(d=path([('M',(178,72)), ('C',(204,60),(228,40),(226,8)), ('C',(216,22),(196,34),(172,44))]), width=4, colour=MOSS, at=2.55, seconds=.3),  # the right horn
  dict(d=path([('M',(112,232)), ('C',(114,242),(124,242),(126,232)), ('M',(154,232)), ('C',(156,242),(166,242),(168,232))]), width=3, colour=MOSS, at=2.85, seconds=.15),  # the nostrils
]
cow_marks = [ dict(cx=118, cy=152, r=4, fill=MOSS, at=2.9), dict(cx=162, cy=152, r=4, fill=MOSS, at=2.95) ]

groups = [
  dict(id='head', shut=dict(x=1024, y=236, s=.36), open=dict(x=26, y=44, s=1.24), paths=head_paths, marks=head_marks),
  dict(id='name', shut=dict(x=1196, y=292, s=1),    open=dict(x=612, y=318, s=1.58), text=name_text),
  dict(id='hen',  open=dict(x=1150, y=70,  s=.78), onlyOpen=True, paths=hen_paths, marks=hen_marks),
  dict(id='pig',  open=dict(x=1130, y=330, s=.86), onlyOpen=True, paths=pig_paths, marks=pig_marks),
  dict(id='cow',  open=dict(x=1440, y=40,  s=1.02), onlyOpen=True, paths=cow_paths, marks=cow_marks),
]

def inner(g, cls=True):
    out = ''
    for p in g.get('paths', []):
        out += (f'<path{" class=\"mo-draw\"" if cls else ""} pathLength="1000" d="{p["d"]}" fill="none" '
                f'stroke="{p["colour"]}" stroke-width="{p["width"]}" stroke-linecap="round" stroke-linejoin="round" '
                f'style="--t:{p["seconds"]}s;--wait:{p["at"]:.2f}s"/>')
    for m in g.get('marks', []):
        out += (f'<g{" class=\"mo-pop\"" if cls else ""} style="--wait:{m["at"]:.2f}s"><circle cx="{m["cx"]}" cy="{m["cy"]}" r="{m["r"]}" '
                f'fill="{m.get("fill","none")}" stroke="{m.get("colour","none")}" stroke-width="{m.get("width",0)}"/></g>')
    for x in g.get('text', []):
        out += (f'<text{" class=\"mo-fade\"" if cls else ""} style="--wait:{x["at"]:.2f}s" x="{x["x"]}" y="{x["y"]}" font-family="{x["family"]}" '
                f'font-size="{x["size"]}" font-style="{x.get("style","normal")}" font-weight="{x.get("weight",400)}" '
                f'letter-spacing="{x.get("spacing",0)}" fill="{x["fill"]}">{x["text"]}</text>')
    return out

def svg(state, guides=False):
    body = ''
    for g in groups:
        if state == 'shut' and g.get('onlyOpen'): continue
        t = g['shut'] if state == 'shut' else g['open']
        body += f'<g transform="translate({t["x"]} {t["y"]}) scale({t["s"]})">{inner(g, cls=False)}</g>'
    band = '<rect x="0" y="219" width="1800" height="176" fill="none" stroke="#FF6B6B" stroke-dasharray="8 8"/><rect x="0" y="0" width="756" height="614" fill="#000" fill-opacity=".35"/>' if guides else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 614" width="1800" height="614"><rect width="1800" height="614" fill="#12262B"/>{band}{body}</svg>'

HEAD = '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=IBM+Plex+Mono:wght@400;500&display=swap"><style>body{margin:0;background:#12262B}</style>'
mode = sys.argv[1]
if mode == 'draft-open':  print(HEAD + svg('open'))
elif mode == 'draft-shut': print(HEAD + svg('shut', guides=True))
elif mode == 'json':       print(json.dumps(dict(scaleStrokes=True, groups=groups), ensure_ascii=False))   # scaleStrokes: the hub draws these without vector-effect too
elif mode == 'header':
    # the head and the name only, in their open places, for the top of the society's page
    body = ''.join(f'<g transform="translate({g["open"]["x"]} {g["open"]["y"]}) scale({g["open"]["s"]})">{inner(g)}</g>' for g in groups if g['id'] in ('head', 'name'))
    print(f'<svg class="mark" viewBox="0 20 1110 580" role="img" aria-label="The Veterinary Society mark: a horse’s head drawn in one line, beside the words Veterinary Society, NLCS Jeju">{body}</svg>')
elif mode == 'svgfile':
    # a standalone file of the finished mark, open arrangement, for the README and anywhere else
    body = ''.join(f'<g transform="translate({g["open"]["x"]} {g["open"]["y"]}) scale({g["open"]["s"]})">{inner(g, cls=False)}</g>' for g in groups)
    body = body.replace(' style="--t:', ' data-t="').replace('s;--wait:', '" data-wait="').replace('s"/>', '"/>')
    import re; body = re.sub(r' style="--wait:[0-9.]+s"', '', body)
    print(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 614" width="1800" height="614"><rect width="1800" height="614" fill="#12262B"/><defs><radialGradient id="g" cx="70%" cy="50%" r="60%"><stop offset="0" stop-color="#1A363B"/><stop offset="1" stop-color="#12262B"/></radialGradient></defs><rect width="1800" height="614" fill="url(#g)"/>{body}</svg>')
elif mode == 'page':
    # the page shows the open arrangement, drawing itself once on load
    body = ''.join(f'<g transform="translate({g["open"]["x"]} {g["open"]["y"]}) scale({g["open"]["s"]})">{inner(g)}</g>' for g in groups)
    print(f'<svg class="mark" viewBox="0 0 1800 614" role="img" aria-label="The Veterinary Society mark: a horse’s head drawn in one line, with a pig, a hen and a cow beside the name">{body}</svg>')

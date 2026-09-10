# The Veterinary Society mark, in two arrangements on one 1800x614 plate.
#   shut: the head and the name, small, in the band a shut door shows (y 219-395)
#   open: the head big at the left beside the words, the name in the middle, and the magazine's
#         other three animals — pig, hen, cow — drawing themselves in on the right.
# Every element is authored in its group's own box; a group carries where it sits in each state.
import json, sys
CREAM, MOSS, AMBER = '#F3E7C9', '#9DB7AE', '#F5A623'
def path(cmds):
    return ' '.join(c[0] + ' ' + ' '.join(f'{x:.0f} {y:.0f}' for x, y in c[1:]) for c in cmds)

# ---------- the head: a stethoscope that is a horse (local box ~0..400 x -10..425) ----------
head_paths = [
  dict(d=path([('M',(188,-4)), ('C',(174,34),(198,64),(234,72))]), width=9, colour=CREAM, at=0.00, seconds=.22),
  dict(d=path([('M',(312,-2)), ('C',(320,38),(296,66),(262,72))]), width=9, colour=CREAM, at=0.12, seconds=.22),
  dict(d=path([('M',(248,72)),
               ('C',(238,108),(198,148),(160,190)), ('C',(128,226),(94,254),(66,282)),
               ('C',(44,304),(38,330),(56,344)),    ('C',(76,358),(104,352),(124,338)),
               ('C',(150,330),(196,338),(240,334)), ('C',(290,330),(326,296),(322,246)),
               ('C',(318,210),(288,178),(246,164))]), width=9, colour=CREAM, at=0.30, seconds=.95),
  dict(d=path([('M',(300,66)), ('C',(350,102),(384,186),(388,300))]), width=6, colour=MOSS, at=0.55, seconds=.4),
  dict(d=path([('M',(314,90)), ('C',(338,134),(346,196),(342,262))]), width=5, colour=MOSS, at=0.65, seconds=.35),
  dict(d=path([('M',(330,118)), ('C',(354,162),(362,216),(360,278))]), width=5, colour=MOSS, at=0.75, seconds=.35),
  dict(d=path([('M',(300,326)), ('C',(320,352),(336,384),(346,420))]), width=6, colour=MOSS, at=0.95, seconds=.3),
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
  dict(d=path([('M',(16,82)), ('C',(4,88),(4,100),(16,106)),                       # the snout
               ('C',(22,112),(34,112),(44,108)),                                   # under the snout
               ('C',(70,126),(120,142),(180,146)), ('C',(230,150),(268,142),(280,120)),  # the belly, back to the rump
               ('C',(292,96),(288,66),(262,52)),                                   # the rump, up
               ('C',(220,36),(160,34),(118,48)),                                   # the back
               ('L',(100,22)), ('L',(88,58)),                                      # the ear, up and back down
               ('C',(60,60),(30,66),(16,82))]), width=5, colour=MOSS, at=1.25, seconds=.7),
  dict(d=path([('M',(266,60)), ('C',(286,44),(300,62),(284,72)), ('C',(276,76),(276,64),(284,62))]), width=4, colour=MOSS, at=1.85, seconds=.25),  # the curl of the tail
  dict(d=path([('M',(64,124)), ('L',(60,176)), ('M',(96,138)), ('L',(94,180)), ('M',(196,146)), ('L',(198,182)), ('M',(246,140)), ('L',(250,178))]), width=5, colour=MOSS, at=1.95, seconds=.3),  # four legs
  dict(d=path([('M',(10,92)), ('C',(12,88),(16,88),(18,92)), ('M',(10,100)), ('C',(12,96),(16,96),(18,100))]), width=3, colour=MOSS, at=2.15, seconds=.15),  # the two nostrils
]
pig_marks = [ dict(cx=50, cy=76, r=4, fill=MOSS, at=2.2) ]

# ---------- the hen, side on, facing left (local ~0..230 x 0..200) ----------
hen_paths = [
  dict(d=path([('M',(8,74)), ('L',(30,66)),                                        # the beak
               ('C',(34,52),(44,44),(58,46)),                                      # the head
               ('C',(80,44),(120,48),(150,70)),                                    # the neck and the back
               ('C',(168,76),(178,84),(182,96)),                                   # the tail root
               ('C',(184,130),(150,158),(104,156)),                                # the belly
               ('C',(72,154),(50,130),(46,104)),                                   # the breast
               ('C',(44,92),(38,84),(30,84)), ('L',(8,74))]), width=5, colour=MOSS, at=1.55, seconds=.6),
  dict(d=path([('M',(178,90)), ('C',(196,60),(216,50),(226,30)), ('M',(180,96)), ('C',(206,78),(222,72),(230,60)), ('M',(182,102)), ('C',(204,96),(218,96),(226,90))]), width=4, colour=MOSS, at=2.05, seconds=.3),  # the tail feathers
  dict(d=path([('M',(50,48)), ('C',(52,36),(60,34),(62,42)), ('C',(66,32),(74,32),(76,42)), ('C',(80,34),(88,36),(88,46))]), width=4, colour=MOSS, at=2.25, seconds=.2),  # the comb
  dict(d=path([('M',(96,156)), ('L',(96,184)), ('M',(84,186)), ('L',(108,186)), ('M',(122,154)), ('L',(124,184)), ('M',(112,186)), ('L',(136,186))]), width=4, colour=MOSS, at=2.35, seconds=.25),  # legs and feet
  dict(d=path([('M',(34,84)), ('C',(30,94),(36,100),(42,94))]), width=3, colour=MOSS, at=2.5, seconds=.12),   # the wattle
]
hen_marks = [ dict(cx=46, cy=58, r=3.5, fill=MOSS, at=2.55) ]

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
        out += (f'<path{" class=\"mo-draw\"" if cls else ""} pathLength="1000" vector-effect="non-scaling-stroke" d="{p["d"]}" fill="none" '
                f'stroke="{p["colour"]}" stroke-width="{p["width"]}" stroke-linecap="round" stroke-linejoin="round" '
                f'style="--t:{p["seconds"]}s;--wait:{p["at"]:.2f}s"/>')
    for m in g.get('marks', []):
        out += (f'<g{" class=\"mo-pop\"" if cls else ""} style="--wait:{m["at"]:.2f}s"><circle cx="{m["cx"]}" cy="{m["cy"]}" r="{m["r"]}" '
                f'fill="{m.get("fill","none")}" stroke="{m.get("colour","none")}" stroke-width="{m.get("width",0)}" vector-effect="non-scaling-stroke"/></g>')
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
elif mode == 'json':       print(json.dumps(dict(groups=groups), ensure_ascii=False))
elif mode == 'page':
    # the page shows the open arrangement, drawing itself once on load
    body = ''.join(f'<g transform="translate({g["open"]["x"]} {g["open"]["y"]}) scale({g["open"]["s"]})">{inner(g)}</g>' for g in groups)
    print(f'<svg class="mark" viewBox="0 0 1800 614" role="img" aria-label="The Veterinary Society mark: a stethoscope drawn as a horse’s head, the chest piece its eye, with a pig, a hen and a cow beside the name">{body}</svg>')

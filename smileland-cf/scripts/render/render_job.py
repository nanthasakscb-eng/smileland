import sys, json, time, os
sys.path.insert(0, '/tmp/claude-0/blend')
from lib import *
from arch import *
import lib

name = sys.argv[-3]; res = int(sys.argv[-2]); outdir = sys.argv[-1]
J = json.load(open('/tmp/claude-0/blend/jobs.json'))
job = next(j for j in J['jobs'] if j['out'] == name)
L = next(l for l in J['listings'] if l['id'] == job['listing'])
v, var, S = job['view'], L['variant'], L['seed']
lib.seed(S * 7 + len(v))
rr = random.Random(S * 13 + len(v))
interior = v in ('living', 'bedroom')
spp = 44 if interior else (30 if var in ('grass', 'laterite', 'paddy') else 28)
reset(res, res * 3 // 4, spp, 1.7 if interior else 0.0)
se, sr = L['sun_elev'], L['sun_rot']

if interior:
    from interior import living_room, bedroom
    condo = var == 'condo'
    view = L['cond_view'] if condo else 'trees'
    if v == 'living':
        W, D, H, cx = living_room(S, condo, view)
        camera_level((W - 0.35, 0.3, 1.45), (0.9, D - 0.6, 1.45), 16, -0.06)
    else:
        W, D, H, cx = bedroom(S, condo, view)
        camera_level((W - 0.3, 0.55, 1.45), (0.4, D * 0.62, 1.45), 16, -0.1)
    sky(rr.uniform(45, 65), rr.uniform(-10, 40), 0.1)

elif var.startswith('modern'):
    floors = 2 if var == 'modern2' else 1
    m = make_mats(tuple(L['wall']), tuple(L['trim']), L['roof'])
    ground(m)
    W, D = L['W'], L['D']
    modern_house(m, W, D, floors, 3.0, 0.45, 'hip', rr.choice([26, 30, 34]), True, S)
    grass_patch('lawn', W * 0.7, 5.5, (-W * 0.38, -D / 2 - 4.0, 0.0), 2200, 0.06, None, mat_ground('lawnsoil', (0.08, 0.12, 0.03), (0.15, 0.1, 0.05), 0.1), S)
    box('path', (1.4, 3.6, 0.05), (-W * 0.15, -D / 2 - 4.2, 0.02), m.concrete)
    road(m, -D / 2 - 11.2, 6, kind=rr.choice(['asphalt', 'asphalt', 'concrete']), lines=True)
    fence_wall(m, -W / 2 - 3, W / 2 + 5, -D / 2 - 6.9, 1.5, (W / 2 + 1.9, 4.0))
    pole_line(m, -D / 2 - 14.8)
    tree((-W / 2 - 3.5, -D / 2 - 2, 0), rr.uniform(6, 8), rr.uniform(2.4, 3.2), seed_=S + 2, palette=((0.025, 0.055, 0.012), (0.09, 0.14, 0.03)))
    if rr.random() < 0.7:
        palm((W / 2 + 5, D / 2, 0), rr.uniform(7.5, 10), S + 5)
    for i, bx in enumerate((-0.5, -W * 0.33, -W * 0.6 + 0.6)):
        bush((bx, -D / 2 - 1.2, 0), rr.uniform(0.45, 0.7), 3000, S + 10 + i)
    neighbor_houses(None, [-W - 13, W + 15], 2, S)
    surroundings(S, 24, 70, 60, 0.3, 2500)
    far_treeline(S + 1)
    sky(se, sr, 0.1)
    top = 1.6 if floors == 1 else 2.6
    if v == 'ext_a':
        if floors == 1:
            camera_level((W / 2 + 2.5, -D / 2 - 6.3, 1.65), (-0.5, 0, 1.6), 20, 0.08)
        else:
            camera_level((W / 2 + 1.5, -D / 2 - 6.7, 1.65), (-1.0, 0, 1.6), 16, 0.21)
    else:
        camera_level((-W * 0.15, -D / 2 - 15.5, 1.75), (-W * 0.1, 0, 1.75), 26, 0.1 if floors == 1 else 0.18)

elif var == 'town':
    m = make_mats(tuple(L['wall']), tuple(L['trim']), 'tile_grey')
    ground(m)
    units = rr.choice([4, 5])
    townhouses(m, units, 4.5, 10, 2, 3.0, S)
    road(m, -13, 6, kind='concrete', lines=False)
    pole_line(m, -16.2)
    for i in range(3):
        bush((-units * 2.25 + 1 + i * 4.5, -7.2, 0), 0.45, 2000, S + i)
    surroundings(S, 30, 90, 45); far_treeline(S + 1)
    sky(se, sr, 0.1)
    if v == 'ext_a':
        camera_level((units * 1.6, -15.5, 1.65), (-1, 0, 1.6), 22, 0.15)
    else:
        camera_level((-units * 2.25 + 4.5 * 1.5 + 1.5, -11.2, 1.6), (-units * 2.25 + 4.5 * 1.5, 0, 1.6), 20, 0.2)

elif var == 'stilt':
    m = make_mats((0.5, 0.5, 0.5), (0.7, 0.7, 0.7), L['roof'])
    ground(m, grass=(0.12, 0.16, 0.04), soil=(0.3, 0.16, 0.08), mix=0.3)
    stilt_house(m, rr.uniform(7.5, 9.5), rr.uniform(6, 7), 2.4, 2.8, S)
    grass_patch('lawn', 14, 8, (0, -8, 0), 500, 0.07, None, None, S)
    palm((-7, -3, 0), rr.uniform(8, 11), S); tree((8, 4, 0), 8, 3.2, seed_=S + 3); bush((-4, -5, 0), 0.7, 3000, S + 6)
    if rr.random() < 0.6:
        tree((-10, 6, 0), 9, 3.8, seed_=S + 8)
    road(m, -14, 5, kind='concrete', lines=False)
    pole_line(m, -17)
    surroundings(S, 26, 80, 45); far_treeline(S + 1)
    sky(se, sr, 0.1)
    if v == 'ext_a':
        camera_level((9, -13.5, 1.7), (0, 0, 2.6), 22, 0.12)
    else:
        camera_level((-10, -11, 1.7), (1, 0, 2.6), 22, 0.12)

elif var == 'condo':
    m = make_mats((0.72, 0.7, 0.66), (0.8, 0.8, 0.78), 'tile_grey', rr.choice([(0.3, 0.32, 0.35), (0.45, 0.35, 0.25), (0.25, 0.3, 0.28)]))
    ground(m)
    floors = rr.randint(8, 14)
    condo_tower(m, rr.uniform(26, 34), 16, floors, 3.0, S)
    road(m, -16, 8)
    pole_line(m, -21)
    for i in range(6):
        tree((-28 + i * 11, -12.5, 0), 7, 2.6, seed_=S + 40 + i, leaves=9000)
    surroundings(S, 40, 90, 40); far_treeline(S + 1)
    sky(se, sr, 0.1)
    camera((rr.choice([-1, 1]) * 24, -34, 1.7), (0, 0, floors * 1.3), 20)

else:  # land
    from land import vacant_land, rice_paddy
    if var == 'paddy':
        W, D = rice_paddy(S, rr.choice(['green', 'green', 'gold']))
        if v == 'v1':
            camera_level((6, -2.2, 1.7), (-2, 30, 1.7), 24, 0.05)
        else:
            camera_level((-W / 2 + 2, -1.8, 1.8), (6, D * 0.6, 1.8), 22, 0.06)
    else:
        W, D = vacant_land(S, var)
        if v == 'v1':
            camera_level((-14, -1.4, 1.7), (2, 20, 1.7), 24, -0.08)
        else:
            camera_level((W / 2 + 4, -5.5, 1.7), (-4, D * 0.5, 1.7), 22, -0.02)
    sky(se, sr, 0.1)

t = time.time()
render(os.path.join(outdir, name + '.png'))
print('DONE', name, round(time.time() - t, 1), flush=True)

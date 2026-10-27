"""Hero slideshow renders (16:9): estate street, shophouses, condo exterior, condo interior, aerial estate."""
import sys, time, math, random
sys.path.insert(0, '/tmp/claude-0/blend')
from lib import *
from arch import *
import lib

kind = sys.argv[-4]; W_ = int(sys.argv[-3]); spp = int(sys.argv[-2]); out = sys.argv[-1]
H_ = W_ * 9 // 16


def place(before, dx=0.0, dy=0.0, rotz=0.0):
    """Move/rotate every new top-level object created since `before` (rotation about world origin)."""
    c, s = math.cos(rotz), math.sin(rotz)
    for o in set(bpy.data.objects) - before:
        if o.parent is not None:
            continue
        x, y = o.location.x, o.location.y
        o.location.x = x * c - y * s + dx
        o.location.y = x * s + y * c + dy
        o.rotation_euler.z += rotz


def street_lamp(x, y, rot=0.0):
    pm = mat_basic('lamppole', (0.08, 0.08, 0.08), 0.4, 0.7)
    cyl('lpole', 0.06, 6.0, (x, y, 3.0), pm, 10)
    arm = box('larm', (1.2, 0.06, 0.06), (x + 0.6 * math.cos(rot), y + 0.6 * math.sin(rot), 5.95), pm, 0, (0, 0, rot))
    box('lhead', (0.5, 0.22, 0.1), (x + 1.15 * math.cos(rot), y + 1.15 * math.sin(rot), 5.9), mat_basic('lhd', (0.75, 0.75, 0.72), 0.3), 0.02, (0, 0, rot))


def curb_and_walk(m, x0, x1, y, side=1):
    box('curb', (x1 - x0, 0.2, 0.15), ((x0 + x1) / 2, y, 0.075), m.concrete)
    box('walk', (x1 - x0, 1.6, 0.1), ((x0 + x1) / 2, y + side * 0.9, 0.05), mat_tiles_floor('walkt', (0.5, 0.48, 0.45), (0.56, 0.53, 0.5), 0.4, (0.4, 0.38, 0.36), 0.6))


def estate_street():
    """บ้านเดี่ยวในโครงการ: แถวบ้านริมถนนโครงการ มองตามแนวถนน"""
    rr = random.Random(7)
    ground(lib_m := make_mats())
    road(lib_m, 0, 7.0, 260, 0, 'asphalt', False)
    curb_and_walk(lib_m, -120, 120, -3.6, -1)
    curb_and_walk(lib_m, -120, 120, 3.6, 1)
    palettes = [((0.66, 0.63, 0.56), 'tile_grey'), ((0.62, 0.57, 0.47), 'tile_brown'), ((0.7, 0.68, 0.64), 'tile_grey'), ((0.6, 0.6, 0.58), 'tile_grey'), ((0.64, 0.6, 0.52), 'tile_brown')]
    xs = [-34, -18, -2, 14, 30, 46]
    for i, x in enumerate(xs):
        for side in (1, -1):
            if side == -1 and i % 2:
                continue
            wall, roof = palettes[(i + (side < 0) * 2) % len(palettes)]
            m = make_mats(wall, (0.76, 0.75, 0.73), roof)
            before = set(bpy.data.objects)
            W, D = 11.0, 8.5
            modern_house(m, W, D, 2 if (i + (side > 0)) % 2 else 1, 3.0, 0.45, 'hip', 30, True, i * 3 + (side > 0), True)
            # front fence + gate (low, open style)
            fence_wall(m, -W / 2 - 2.5, W / 2 + 4.5, -D / 2 - 6.0, 1.2, (W / 2 + 1.9, 3.6))
            if abs(x) <= 14:
                grass_patch(f'lawn{i}{side}', W * 0.62, 4.6, (-W * 0.3, -D / 2 - 3.6, 0.0), 900, 0.06, None, mat_ground('ls', (0.08, 0.12, 0.03), (0.15, 0.1, 0.05), 0.1), i)
            else:
                plane(f'lawnf{i}{side}', W * 0.62, 4.6, (-W * 0.3, -D / 2 - 3.6, 0.01), mat_ground('lsf', (0.08, 0.13, 0.03), (0.15, 0.1, 0.05), 0.15, 2.0))
            bush((-W * 0.2, -D / 2 - 1.2, 0), 0.5, 1500, i * 10 + side)
            # house front faces -Y; place so front faces the road
            if side > 0:
                place(before, x, 4.4 + D / 2 + 6.2, 0.0)         # north side: front (-Y) faces the road
            else:
                place(before, x, -4.4 - D / 2 - 6.2, math.pi)    # south side: rotated to face the road
    for x in range(-60, 70, 14):
        tree((x, 5.1, 0), rr.uniform(5, 6.5), 2.0, leaves=3500, seed_=200 + x, palette=((0.03, 0.065, 0.015), (0.11, 0.17, 0.035)))
        street_lamp(x + 7, -4.0, math.pi / 2)
    surroundings(9, 45, 100, 25, 0.35, 2000)
    far_treeline(10, 110, 200, 120)
    sky(24, 250, 0.1)                          # late afternoon, warm low sun
    camera((-22, -1.6, 1.7), (20, 1.5, 2.2), 28)


def shophouses_scene():
    """อาคารพาณิชย์ในโครงการ: อาคารพาณิชย์ 3 ชั้นริมถนน หน้าร้านกระจก"""
    m = make_mats((0.46, 0.42, 0.36), (0.36, 0.36, 0.35), 'tile_grey', (0.16, 0.17, 0.19))
    ground(m)
    units, uw, D, floors, hf = 8, 4.2, 14.0, 3, 3.3
    W = units * uw
    plinth = 0.25
    box('plinth', (W, D, plinth), (0, 0, plinth / 2), m.concrete)
    glass = mat_tinted_glass('shopglass', (0.1, 0.13, 0.14))
    awn = mat_metal_sheet('awning', (0.12, 0.2, 0.15), 0.4, 0.15)
    for f in range(floors):
        zb = plinth + f * hf
        wall = box(f'sh{f}', (W, D, hf), (0, 0, zb + hf / 2), m.wall)
        for u in range(units):
            cx = -W / 2 + uw * (u + 0.5)
            if f == 0:
                cut(wall, opening_cutter(cx, -D / 2, zb, uw - 0.5, 2.9))
                window(m, cx, -D / 2, zb, uw - 0.5, 2.9, 'X', 0.25, 3, False)
                # warm interior light behind storefront glass
                em = bpy.data.materials.new(f'shoplight{u}'); em.use_nodes = True
                nt = em.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
                e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 1.2 + (u % 3) * 0.4; e.inputs['Color'].default_value = (1, 0.88, 0.7, 1)
                nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
                plane('shopback', uw - 0.6, 2.8, (cx, -D / 2 + 1.2, zb + 1.45), em, (math.pi / 2, 0, 0))
                box('awn', (uw - 0.1, 1.4, 0.08), (cx, -D / 2 - 0.7, zb + 3.05), awn)
            else:
                cut(wall, opening_cutter(cx, -D / 2, zb + 0.5, uw - 1.0, 2.2))
                window(m, cx, -D / 2, zb + 0.5, uw - 1.0, 2.2, 'X', 0.12, 2, True)
                box('balrail', (uw - 0.9, 0.05, 0.05), (cx, -D / 2 - 0.12, zb + 1.5), m.steel)
            box('pier', (0.28, 0.35, hf), (-W / 2 + uw * u, -D / 2 - 0.1, zb + hf / 2), m.trim)
        box('pier', (0.28, 0.35, hf), (W / 2, -D / 2 - 0.1, zb + hf / 2), m.trim)
        box('slabband', (W + 0.2, 0.4, 0.3), (0, -D / 2 - 0.15, zb + hf), m.accent)
    ztop = plinth + floors * hf
    box('parapet', (W + 0.2, D + 0.2, 1.1), (0, 0, ztop + 0.55), m.trim)
    # signboard band (blank panels, no text)
    for u in range(units):
        cx = -W / 2 + uw * (u + 0.5)
        box('sign', (uw - 0.6, 0.06, 0.55), (cx, -D / 2 - 0.25, plinth + hf + 0.5), mat_basic(f'sg{u}', [(0.7, 0.55, 0.15), (0.12, 0.25, 0.18), (0.55, 0.12, 0.06), (0.08, 0.15, 0.32), (0.75, 0.73, 0.68), (0.35, 0.08, 0.1), (0.1, 0.3, 0.35), (0.6, 0.35, 0.1)][u], 0.4))
    # forecourt parking + road
    box('apron', (W + 10, 9, 0.06), (0, -D / 2 - 4.5, 0.03), m.concrete)
    for i in range(units + 1):
        box('pline', (0.12, 5, 0.005), (-W / 2 + uw * i, -D / 2 - 5.5, 0.065), m.white_paint)
    road(m, -D / 2 - 13, 9, 260)
    pole_line(m, -D / 2 - 18.5)
    for x in (-W / 2 - 6, W / 2 + 6):
        tree((x, -D / 2 - 3, 0), 7, 2.8, seed_=int(x) + 99, leaves=9000)
    # neighbour project buildings & trees
    surroundings(4, 40, 100, 45, 0.3, 2500)
    far_treeline(5, 110, 200, 160)
    sky(28, 245, 0.1)
    camera((W / 2 + 6, -D / 2 - 17, 1.7), (-6, 0, 4.0), 20)


def condo_ext():
    m = make_mats((0.74, 0.72, 0.68), (0.82, 0.81, 0.79), 'tile_grey', (0.28, 0.3, 0.33))
    ground(m, 3000)
    condo_tower(m, 32, 16, 14, 3.0, 11)
    # pool deck in front
    deck = mat_tiles_floor('deck', (0.62, 0.6, 0.56), (0.66, 0.64, 0.6), 0.6, (0.5, 0.48, 0.45), 0.35)
    box('deck', (40, 16, 0.3), (0, -19, 0.15), deck)
    water = mat_glass('pool', (0.35, 0.75, 0.85), 0.04)
    box('poolbasin', (24, 7, 0.2), (0, -19.5, 0.2), mat_basic('pooltile', (0.08, 0.38, 0.55), 0.2))
    plane('water', 24, 7, (0, -19.5, 0.31), water)
    for x in range(-18, 20, 6):
        palm((x, -12.5, 0.3), random.Random(x).uniform(6, 8), 300 + x)
    for i, x in enumerate((-14, -8, 8, 14)):
        box('lounger', (0.7, 1.9, 0.35), (x, -24.5, 0.48), mat_fabric(f'lg{i}', (0.85, 0.84, 0.8)), 0.05)
    road(m, -30, 8)
    surroundings(12, 50, 110, 40, 0.3, 2500)
    far_treeline(13, 120, 220, 160)
    sky(18, 235, 0.1)                       # golden hour
    camera((-38, -62, 9.0), (0, 0, 22), 20)


def condo_int():
    from interior import living_room
    reset(W_, H_, spp, 1.7)
    Wr, D, H, cx = living_room(21, True, 'city')
    camera_level((Wr - 0.35, 0.3, 1.4), (0.9, D - 0.4, 1.4), 15, -0.04)
    sky(40, 20, 0.1)


def light_house(m, x, y, rotz, W=9.5, D=8.0, floors=1, roofmat=None):
    """Cheap house for aerial shots (no booleans)."""
    before = set(bpy.data.objects)
    hf = 3.0
    box('lh', (W, D, hf * floors), (0, 0, 0.3 + hf * floors / 2), m.wall)
    for f in range(floors):
        for i in range(3):
            plane('lw', 1.6, 1.3, (-W / 3 + i * W / 3, -D / 2 - 0.01, 0.3 + f * hf + 1.6), m.glass, (math.pi / 2, 0, 0))
    hip_roof('lr', W, D, 0.3 + hf * floors, 0.8, 30, roofmat or m.roof, m.trim)
    box('drive', (3.2, 6, 0.05), (W / 2 - 1.6, -D / 2 - 3, 0.03), m.concrete)
    box('carport', (3.4, 5.5, 0.06), (W / 2 + 1.9, -D / 2 + 1.5, 2.6), m.roof)
    place(before, x, y, rotz)


def aerial():
    rr = random.Random(5)
    m = make_mats()
    plane('ground', 8000, 8000, (0, 0, -0.01), mat_ground('wide', (0.1, 0.16, 0.035), (0.26, 0.16, 0.08), 0.25, 0.05))
    lawn = mat_ground('lawn', (0.1, 0.16, 0.035), (0.14, 0.12, 0.06), 0.1, 0.8)
    plane('estate', 150, 120, (0, 0, 0.005), lawn)
    roofs = [mat_roof_tiles(f'ar{i}', *c) for i, c in enumerate([((0.06, 0.065, 0.07), (0.13, 0.13, 0.14)), ((0.16, 0.07, 0.04), (0.28, 0.13, 0.07)), ((0.3, 0.07, 0.03), (0.45, 0.13, 0.06)), ((0.05, 0.12, 0.08), (0.1, 0.18, 0.12))])]
    walls = [mat_plaster(f'aw{i}', c) for i, c in enumerate([(0.7, 0.68, 0.64), (0.66, 0.62, 0.54), (0.62, 0.63, 0.62), (0.72, 0.7, 0.66)])]
    # internal roads (grid)
    for y in (-36, 0, 36):
        box('eroad', (140, 7, 0.04), (0, y, 0.03), m.asphalt)
    box('mainroad', (8, 120, 0.05), (-62, 0, 0.035), m.asphalt)
    for y in (-36, 0, 36):
        for side in (1, -1):
            for k in range(9):
                x = -48 + k * 13
                mm = make_mats()
                mm.wall = walls[(k + y) % 4]; mm.roof = roofs[(k * 3 + side + y) % 4]
                light_house(mm, x, y + side * 12.5, 0 if side < 0 else math.pi, 9.5, 8.0, 2 if (k + side) % 3 == 0 else 1)
                if True:
                    tree((x + 6.5, y + side * 5.3, 0), rr.uniform(5, 7), 2.2, leaves=3000, seed_=k * 31 + y + side, leaf_scale=1.6, branches=False)
    # clubhouse + pond at the entrance
    box('club', (16, 10, 4), (-48, 58, 2), m.trim)
    hip_roof('clubroof', 16, 10, 4, 1, 25, roofs[0], m.trim, -48, 58)
    water = mat_glass('pond', (0.35, 0.5, 0.45), 0.03)
    o = sphere('pondbed', 1, (-25, 58, -0.2), mat_basic('pb', (0.06, 0.08, 0.05), 0.5), 3); o.scale = (14, 6, 0.4)
    plane('pondwater', 28, 12, (-25, 58, -0.02), water)
    # perimeter wall
    for (sx, sy, lx, ly) in ((0, -60, 150, 0.3), (0, 60, 150, 0.3), (75, 0, 0.3, 120), (-75, 0, 0.3, 120)):
        box('perim', (max(lx, 0.3), max(ly, 0.3), 2.2), (sx, sy, 1.1), m.wall)
    # outside: paddies & trees
    for i in range(10):
        for j in range(4):
            plane('paddy', 38, 28, (-180 + i * 40, -110 - j * 30, 0.01), mat_noisy(f'pd{i}{j}', (0.1, 0.2, 0.03), (0.22, 0.34, 0.06), 3, 0.8, 0.6, 60))
    surroundings(21, 90, 220, 50, 0.3, 1400)
    far_treeline(22, 230, 420, 220)
    sky(30, 215, 0.1, haze=1.6)
    camera((70, -95, 45), (-10, 8, 0), 24)


reset(W_, H_, spp)
{'estate': estate_street, 'shop': shophouses_scene, 'condo_ext': condo_ext, 'condo_int': condo_int, 'aerial': aerial}[kind]()
t = time.time()
render(out)
print('DONE', kind, round(time.time() - t, 1), flush=True)

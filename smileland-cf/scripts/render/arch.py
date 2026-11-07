"""Parametric Thai/Isan houses, site elements and backgrounds."""
import bpy, bmesh, math, random
from mathutils import Vector
from lib import *


# ------------------------------------------------------------------ materials cache
class M:
    pass


def make_mats(wall=(0.85, 0.82, 0.74), trim=(0.93, 0.92, 0.9), roof='tile_grey', accent=None, seed_=0):
    m = M()
    m.wall = mat_plaster('wall', wall)
    m.trim = mat_plaster('trim', trim, 0.02)
    m.accent = mat_plaster('accent', accent) if accent else m.trim
    m.frame = mat_basic('frame', (0.03, 0.03, 0.03), 0.35, 0.6)
    m.frame_w = mat_basic('frame_w', (0.85, 0.85, 0.83), 0.4, 0.2)
    m.glass = mat_tinted_glass('tglass')
    m.door = mat_planks('door', (0.18, 0.09, 0.04), (0.33, 0.18, 0.08), 0.12, 'X', 0.45, 0.02)
    roofs = {
        'tile_grey': lambda: mat_roof_tiles('roof', (0.06, 0.065, 0.07), (0.13, 0.13, 0.14)),
        'tile_brown': lambda: mat_roof_tiles('roof', (0.16, 0.07, 0.04), (0.28, 0.13, 0.07)),
        'tile_red': lambda: mat_roof_tiles('roof', (0.3, 0.07, 0.03), (0.45, 0.13, 0.06)),
        'tile_green': lambda: mat_roof_tiles('roof', (0.05, 0.12, 0.08), (0.1, 0.18, 0.12)),
        'metal_blue': lambda: mat_metal_sheet('roof', (0.08, 0.14, 0.25)),
        'metal_red': lambda: mat_metal_sheet('roof', (0.32, 0.05, 0.03)),
        'metal_rust': lambda: mat_noisy('roof', (0.18, 0.09, 0.05), (0.42, 0.3, 0.22), 4, 0.8, 0.6, 30, metal=0.3),
        'metal_zinc': lambda: mat_metal_sheet('roof', (0.5, 0.5, 0.5), 0.45),
    }
    m.roof = roofs[roof]()
    m.concrete = mat_concrete('concrete')
    m.floor_tile = mat_tiles_floor('porchtile', (0.62, 0.58, 0.52), (0.66, 0.62, 0.56), 0.6, (0.45, 0.43, 0.4), 0.3)
    m.wood = mat_planks('wood', (0.2, 0.11, 0.05), (0.38, 0.22, 0.11), 0.15, 'Z', 0.7)
    m.wood_dark = mat_planks('wood_d', (0.08, 0.045, 0.025), (0.17, 0.09, 0.05), 0.18, 'Z', 0.75)
    m.steel = mat_basic('steel', (0.04, 0.04, 0.04), 0.4, 0.8)
    m.asphalt = mat_asphalt()
    m.white_paint = mat_basic('linepaint', (0.8, 0.8, 0.78), 0.6)
    m.yellow_paint = mat_basic('ylw', (0.8, 0.55, 0.05), 0.6)
    return m


# ------------------------------------------------------------------ building parts
def window(m, x, y, z, w, h, axis='X', depth=0.12, mullions=1, sill=True, frame_mat=None, outward=-1):
    """Window centered at (x, y, z) (bottom z). axis = wall direction. outward = sign of wall normal."""
    fm = frame_mat or m.frame
    t = 0.05
    if axis == 'X':
        # wall runs along X; normal is ±Y
        yy = y - outward * depth
        box('wf', (w, t * 1.4, t), (x, yy, z + t / 2), fm)
        box('wf', (w, t * 1.4, t), (x, yy, z + h - t / 2), fm)
        box('wf', (t, t * 1.4, h), (x - w / 2 + t / 2, yy, z + h / 2), fm)
        box('wf', (t, t * 1.4, h), (x + w / 2 - t / 2, yy, z + h / 2), fm)
        for i in range(1, mullions + 1):
            box('wm', (t * 0.8, t * 1.2, h), (x - w / 2 + w * i / (mullions + 1), yy, z + h / 2), fm)
        g = plane('glass', w - t, h - t, (x, yy + outward * 0.005, z + h / 2), m.glass, (math.pi / 2, 0, 0))
        if sill:
            box('sill', (w + 0.12, 0.08 + depth, 0.04), (x, y + outward * 0.02, z - 0.02), m.trim)
    else:
        xx = x - outward * depth
        box('wf', (t * 1.4, w, t), (xx, y, z + t / 2), fm)
        box('wf', (t * 1.4, w, t), (xx, y, z + h - t / 2), fm)
        box('wf', (t * 1.4, t, h), (xx, y - w / 2 + t / 2, z + h / 2), fm)
        box('wf', (t * 1.4, t, h), (xx, y + w / 2 - t / 2, z + h / 2), fm)
        for i in range(1, mullions + 1):
            box('wm', (t * 1.2, t * 0.8, h), (xx, y - w / 2 + w * i / (mullions + 1), z + h / 2), fm)
        plane('glass', h - t, w - t, (xx + outward * 0.005, y, z + h / 2), m.glass, (0, math.pi / 2, 0))
        if sill:
            box('sill', (0.08 + depth, w + 0.12, 0.04), (x + outward * 0.02, y, z - 0.02), m.trim)


def opening_cutter(x, y, z, w, h, axis='X', d=0.6):
    if axis == 'X':
        return box('cutter', (w, d, h), (x, y, z + h / 2))
    return box('cutter', (d, w, h), (x, y, z + h / 2))


def hip_roof(name, W, D, z, overhang, pitch_deg, mat, fascia_mat, cx=0, cy=0, thickness=0.12, gable=False):
    W2, D2 = W / 2 + overhang, D / 2 + overhang
    rise = math.tan(math.radians(pitch_deg)) * min(W2, D2)
    if gable:
        # ridge along X, gables on X ends
        verts = [(-W2, -D2, 0), (W2, -D2, 0), (W2, D2, 0), (-W2, D2, 0), (-W2, 0, rise), (W2, 0, rise)]
        faces = [(0, 1, 5, 4), (2, 3, 4, 5)]
    elif W >= D:
        r = W2 - D2
        verts = [(-W2, -D2, 0), (W2, -D2, 0), (W2, D2, 0), (-W2, D2, 0), (-r, 0, rise), (r, 0, rise)]
        faces = [(0, 1, 5, 4), (1, 2, 5), (2, 3, 4, 5), (3, 0, 4)]
    else:
        r = D2 - W2
        verts = [(-W2, -D2, 0), (W2, -D2, 0), (W2, D2, 0), (-W2, D2, 0), (0, -r, rise), (0, r, rise)]
        faces = [(0, 1, 4), (1, 2, 5, 4), (2, 3, 5), (3, 0, 4, 5)]
    o = mesh_from(name, verts, faces, mat)
    o.location = (cx, cy, z)
    solidify(o, thickness, 1)
    # fascia board around eaves
    fh = 0.22
    box('fascia', (2 * W2 + 0.04, 0.035, fh), (cx, cy - D2, z - fh / 2 + 0.06), fascia_mat)
    box('fascia', (2 * W2 + 0.04, 0.035, fh), (cx, cy + D2, z - fh / 2 + 0.06), fascia_mat)
    box('fascia', (0.035, 2 * D2, fh), (cx - W2, cy, z - fh / 2 + 0.06), fascia_mat)
    box('fascia', (0.035, 2 * D2, fh), (cx + W2, cy, z - fh / 2 + 0.06), fascia_mat)
    # soffit
    so = plane('soffit', 2 * W2, 2 * D2, (cx, cy, z - 0.1), fascia_mat)
    # ridge cap
    if gable or W >= D:
        L = (2 * W2) if gable else 2 * (W2 - D2)
        if L > 0.05:
            cyl('ridge', 0.09, L + 0.1, (cx, cy, z + rise + 0.08), mat, 10, rot=(0, math.pi / 2, 0))
    else:
        cyl('ridge', 0.09, 2 * (D2 - W2) + 0.1, (cx, cy, z + rise + 0.08), mat, 10, rot=(math.pi / 2, 0, 0))
    if gable:
        # gable end walls (triangles)
        for sx in (-1, 1):
            g = mesh_from('gable', [(sx * W / 2, -D / 2, 0), (sx * W / 2, D / 2, 0), (sx * W / 2, 0, rise * (D / 2) / D2)], [(0, 1, 2)], None)
            g.location = (cx, cy, z)
    return rise


def gable_ends(W, D, z, rise_eff, mat, cx=0, cy=0, t=0.2):
    for sx in (-1, 1):
        g = mesh_from('gableend', [(0, -D / 2, 0), (0, D / 2, 0), (0, 0, rise_eff)], [(0, 1, 2)], mat)
        g.location = (cx + sx * (W / 2 - t / 2), cy, z)
        solidify(g, t, 0)


# ------------------------------------------------------------------ house types
def modern_house(m, W=10.0, D=8.0, floors=1, hf=3.0, plinth=0.45, roof='hip', pitch=30, porch=True, seed_=0, garage=True):
    """Thai modern single/two-storey house. Front faces -Y. Returns dict of key coords."""
    rr = random.Random(seed_)
    # plinth / terrace
    box('plinth', (W + 0.3, D + 0.3, plinth), (0, 0, plinth / 2), m.concrete)
    if porch:
        box('terrace', (W * 0.55, 2.2, plinth), (-W * 0.15, -D / 2 - 1.1, plinth / 2), m.concrete)
        plane('terr_tile', W * 0.55 - 0.05, 2.15, (-W * 0.15, -D / 2 - 1.1, plinth + 0.003), m.floor_tile)
        for i in range(3):
            box('step', (1.6, 0.32, plinth * (3 - i) / 3), (-W * 0.15, -D / 2 - 2.2 - 0.16 - 0.32 * i + 0.32 * 0, plinth * (3 - i) / 6), m.concrete)
    z0 = plinth
    for f in range(floors):
        zb = z0 + f * hf
        wall = box(f'walls{f}', (W, D, hf), (0, 0, zb + hf / 2), m.wall)
        # band between floors
        if f > 0:
            box('band', (W + 0.12, D + 0.12, 0.25), (0, 0, zb), m.trim)
        # front windows
        n = rr.choice([2, 3]) if W > 8 else 2
        xs = [-W / 2 + W * (i + 0.5) / n for i in range(n)]
        for i, x in enumerate(xs):
            if f == 0 and porch and i == 0:
                # door + side window under porch
                cut(wall, opening_cutter(x - 0.6, -D / 2, zb, 1.0, 2.3))
                box('door', (0.95, 0.06, 2.25), (x - 0.6, -D / 2 + 0.12, zb + 1.125), m.door)
                box('knob', (0.04, 0.05, 0.04), (x - 0.25, -D / 2 + 0.07, zb + 1.05), m.steel)
                cut(wall, opening_cutter(x + 0.75, -D / 2, zb + 0.4, 1.4, 1.9))
                window(m, x + 0.75, -D / 2, zb + 0.4, 1.4, 1.9, 'X', 0.1, 2, False)
                continue
            ww, wh = rr.choice([(1.8, 1.5), (2.2, 1.5), (1.5, 1.4)]), None
            w_, h_ = ww
            zz = zb + 0.9
            cut(wall, opening_cutter(x, -D / 2, zz, w_, h_))
            window(m, x, -D / 2, zz, w_, h_, 'X', 0.1, 2)
        # side windows
        for y in (-D / 4, D / 4):
            cut(wall, opening_cutter(W / 2, y, zb + 0.9, 1.2, 1.4, 'Y'))
            window(m, W / 2, y, zb + 0.9, 1.2, 1.4, 'Y', 0.1, 1, True, None, 1)
            cut(wall, opening_cutter(-W / 2, y, zb + 0.9, 1.2, 1.4, 'Y'))
            window(m, -W / 2, y, zb + 0.9, 1.2, 1.4, 'Y', 0.1, 1, True, None, -1)
    ztop = z0 + floors * hf
    box('topband', (W + 0.1, D + 0.1, 0.18), (0, 0, ztop - 0.09), m.trim)
    if roof in ('hip', 'gable'):
        rise = hip_roof('roof', W, D, ztop, 0.9, pitch, m.roof, m.trim, gable=(roof == 'gable'))
        if roof == 'gable':
            gable_ends(W, D, ztop, math.tan(math.radians(pitch)) * (D / 2), m.wall)
    else:
        # flat roof with parapet + metal skillion behind
        box('parapet', (W + 0.3, D + 0.3, 0.7), (0, 0, ztop + 0.35), m.trim)
        rise = 0.7
    if porch:
        # porch roof (lean-to) supported by columns
        pw = W * 0.55
        for x in (-W * 0.15 - pw / 2 + 0.15, -W * 0.15 + pw / 2 - 0.15):
            box('col', (0.2, 0.2, hf), (x, -D / 2 - 2.0, z0 + hf / 2), m.trim)
        pr = mesh_from('porchroof', [(-pw / 2 - 0.3, -2.6, 0), (pw / 2 + 0.3, -2.6, 0), (pw / 2 + 0.3, 0, 0.55), (-pw / 2 - 0.3, 0, 0.55)], [(0, 1, 2, 3)], m.roof)
        pr.location = (-W * 0.15, -D / 2, z0 + hf + 0.05)
        solidify(pr, 0.1, 1)
        box('pbeam', (pw + 0.6, 0.18, 0.25), (-W * 0.15, -D / 2 - 2.0, z0 + hf - 0.05), m.trim)
        plane('psoffit', pw + 0.6, 2.6, (-W * 0.15, -D / 2 - 1.3, z0 + hf - 0.17), m.trim)
        # porch lamp
        cyl('lamp', 0.08, 0.06, (-W * 0.15, -D / 2 - 1.3, z0 + hf - 0.2), mat_basic('lampm', (1, 1, 1), 0.3), 16)
    # AC condenser + downpipe on side
    box('ac', (0.35, 0.8, 0.55), (W / 2 + 0.2, D / 4 + 1.0, plinth + 0.35), mat_basic('acm', (0.8, 0.8, 0.78), 0.4))
    for x in (-W / 2 + 0.1, W / 2 - 0.1):
        cyl('pipe', 0.04, ztop, (x, -D / 2 - 0.05, ztop / 2), m.trim, 10)
    if garage:
        # carport with metal roof on the right
        cw, cd = 3.4, 6.0
        cx = W / 2 + cw / 2 + 0.2
        for x in (cx - cw / 2 + 0.1, cx + cw / 2 - 0.1):
            for y in (-D / 2 - 1.0, -D / 2 + cd - 1.2):
                cyl('cpost', 0.06, 2.6, (x, y, 1.3), m.steel, 12)
        cr = box('carroof', (cw + 0.3, cd + 0.3, 0.05), (cx, -D / 2 + cd / 2 - 1.1, 2.65), m.roof, 0, (math.radians(-4), 0, 0))
        box('carpad', (cw, cd + 2.5, 0.08), (cx, -D / 2 + cd / 2 - 2.2, 0.04), m.concrete)
    return {'W': W, 'D': D, 'top': ztop + (rise if roof != 'flat' else 0.7)}


def stilt_house(m, W=8.0, D=6.5, stilt=2.4, hf=2.8, seed_=0):
    """Traditional Isan wooden house raised on concrete stilts (ใต้ถุนสูง), gable metal roof."""
    rr = random.Random(seed_)
    for ix in range(4):
        for iy in range(3):
            x = -W / 2 + 0.2 + (W - 0.4) * ix / 3
            y = -D / 2 + 0.2 + (D - 0.4) * iy / 2
            box('stilt', (0.22, 0.22, stilt), (x, y, stilt / 2), m.concrete)
    box('floorbeam', (W + 0.2, D + 0.2, 0.25), (0, 0, stilt + 0.12), m.wood_dark)
    wall = box('woodwall', (W, D, hf), (0, 0, stilt + 0.25 + hf / 2), m.wood)
    z = stilt + 0.25
    for x in (-W / 3, 0, W / 3):
        if abs(x) < 0.1:
            cut(wall, opening_cutter(x, -D / 2, z, 1.0, 2.1))
            box('door', (0.95, 0.06, 2.05), (x, -D / 2 + 0.1, z + 1.03), m.wood_dark)
            continue
        cut(wall, opening_cutter(x, -D / 2, z + 0.8, 1.1, 1.2))
        window(m, x, -D / 2, z + 0.8, 1.1, 1.2, 'X', 0.06, 1, False, m.wood_dark)
        # open wooden shutters
        for s in (-1, 1):
            box('shutter', (0.55, 0.04, 1.2), (x + s * 0.85, -D / 2 - 0.05, z + 1.4), m.wood_dark)
    # balcony / chan (ชาน) in front with railing
    box('chan', (W * 0.6, 2.0, 0.12), (-W * 0.15, -D / 2 - 1.0, stilt + 0.19), m.wood_dark)
    for i in range(14):
        x = -W * 0.15 - W * 0.3 + W * 0.6 * i / 13
        box('baluster', (0.05, 0.05, 0.9), (x, -D / 2 - 1.95, stilt + 0.7), m.wood_dark)
    box('rail', (W * 0.6, 0.08, 0.06), (-W * 0.15, -D / 2 - 1.95, stilt + 1.15), m.wood_dark)
    for x in (-W * 0.45 + 0.05, W * 0.15 - 0.05):
        box('chanpost', (0.12, 0.12, 2.2), (x, -D / 2 - 1.9, stilt + 0.2 + 1.1), m.wood_dark)
    # stairs
    n = 10
    for i in range(n):
        box('tread', (1.0, 0.28, 0.05), (W * 0.35, -D / 2 - 1.2 - 0.25 * (n - i), stilt * (i + 1) / (n + 1)), m.wood_dark)
    for s in (-1, 1):
        L = math.hypot(stilt, 0.25 * n)
        box('stringer', (0.06, L, 0.2), (W * 0.35 + s * 0.5, -D / 2 - 1.2 - 0.125 * n, stilt / 2), m.wood_dark, 0, (math.atan2(stilt, 0.25 * n), 0, 0))
    ztop = z + hf
    rise = hip_roof('roof', W, D, ztop, 0.7, 34, m.roof, m.wood_dark, gable=True)
    gable_ends(W, D, ztop, math.tan(math.radians(34)) * (D / 2), m.wood)
    # chan roof
    pr = mesh_from('chanroof', [(-W * 0.3 - 0.2, -2.3, 0), (W * 0.3 + 0.2, -2.3, 0), (W * 0.3 + 0.2, 0, 0.5), (-W * 0.3 - 0.2, 0, 0.5)], [(0, 1, 2, 3)], m.roof)
    pr.location = (-W * 0.15, -D / 2, stilt + 2.45)
    solidify(pr, 0.06, 1)
    # under-house life: table/hammock bench, clay water jar (โอ่ง)
    box('bench', (2.0, 0.9, 0.08), (-W / 4, 0, 0.45), m.wood_dark)
    for x in (-W / 4 - 0.9, -W / 4 + 0.9):
        box('benchleg', (0.08, 0.8, 0.45), (x, 0, 0.22), m.wood_dark)
    jar = mat_noisy('jar', (0.12, 0.06, 0.03), (0.25, 0.12, 0.05), 3, 0.25, 0.1, 20)
    for i, (x, y) in enumerate([(W / 2 + 0.6, -D / 2 + 0.6), (W / 2 + 0.6, -D / 2 + 1.5)]):
        o = sphere('oong', 0.42, (x, y, 0.42), jar, 3); o.scale = (1, 1, 1.15)
    return {'W': W, 'D': D, 'top': ztop + rise}


def townhouses(m, units=4, uw=4.5, D=10.0, floors=2, hf=3.0, seed_=0):
    """Row of townhouses / commercial units, front faces -Y. Returns centre of first unit."""
    rr = random.Random(seed_)
    W = units * uw
    plinth = 0.3
    box('plinth', (W, D, plinth), (0, 0, plinth / 2), m.concrete)
    for f in range(floors):
        zb = plinth + f * hf
        wall = box(f'tw{f}', (W, D, hf), (0, 0, zb + hf / 2), m.wall)
        for u in range(units):
            cx = -W / 2 + uw * (u + 0.5)
            if f == 0:
                cut(wall, opening_cutter(cx - 0.9, -D / 2, zb, 1.0, 2.3))
                box('door', (0.95, 0.06, 2.25), (cx - 0.9, -D / 2 + 0.12, zb + 1.125), m.door)
                cut(wall, opening_cutter(cx + 0.8, -D / 2, zb + 0.5, 1.8, 1.8))
                window(m, cx + 0.8, -D / 2, zb + 0.5, 1.8, 1.8, 'X', 0.1, 2, False)
            else:
                cut(wall, opening_cutter(cx, -D / 2, zb + 0.6, 2.6, 1.8))
                window(m, cx, -D / 2, zb + 0.6, 2.6, 1.8, 'X', 0.1, 3)
            # party wall fins
            box('fin', (0.2, 0.5, hf), (-W / 2 + uw * u, -D / 2 - 0.15, zb + hf / 2), m.trim)
        box('fin', (0.2, 0.5, hf), (W / 2, -D / 2 - 0.15, zb + hf / 2), m.trim)
        # canopy
        if f == 0:
            box('canopy', (W, 1.2, 0.12), (0, -D / 2 - 0.6, zb + hf - 0.2), m.trim)
    ztop = plinth + floors * hf
    box('parapet', (W + 0.1, D + 0.1, 0.9), (0, 0, ztop + 0.45), m.trim)
    # front yard dividers + gates
    for u in range(units + 1):
        x = -W / 2 + uw * u
        box('div', (0.15, 4.5, 1.2), (x, -D / 2 - 2.25, 0.6), m.wall)
    for u in range(units):
        cx = -W / 2 + uw * (u + 0.5)
        box('yard', (uw - 0.15, 4.4, 0.06), (cx, -D / 2 - 2.2, 0.03), m.concrete)
        for i in range(12):
            box('gatebar', (0.03, 0.03, 1.4), (cx - uw / 2 + 0.2 + (uw - 0.4) * i / 11, -D / 2 - 4.45, 0.7), m.steel)
        box('gatetop', (uw - 0.3, 0.05, 0.06), (cx, -D / 2 - 4.45, 1.4), m.steel)
    return {'W': W, 'D': D, 'top': ztop + 0.9}


def condo_tower(m, W=28, D=16, floors=12, hf=3.0, seed_=0):
    """Mid-rise condo with balconies. Front faces -Y."""
    rr = random.Random(seed_)
    podium = 4.5
    box('podium', (W + 4, D + 4, podium), (0, 0, podium / 2), m.trim)
    pod = bpy.data.objects['podium']
    for i in range(6):
        x = -W / 2 - 2 + (W + 4) * (i + 0.5) / 6
        cut(pod, opening_cutter(x, -D / 2 - 2, 0.3, (W + 4) / 6 - 0.6, 3.6))
        window(m, x, -D / 2 - 2, 0.3, (W + 4) / 6 - 0.6, 3.6, 'X', 0.15, 2, False)
    body = box('body', (W, D, floors * hf), (0, 0, podium + floors * hf / 2), m.wall)
    nb = int(W // 4.0)
    rail = mat_glass('railglass', (0.75, 0.85, 0.85), 0.05)
    for f in range(floors):
        zb = podium + f * hf
        box('slab', (W + 0.04, 1.6, 0.18), (0, -D / 2 - 0.8, zb), m.trim)
        for i in range(nb):
            x = -W / 2 + W * (i + 0.5) / nb
            window(m, x, -D / 2 + 0.001, zb + 0.15, W / nb - 0.6, hf - 0.45, 'X', 0.02, 2, False)
            box('railg', (W / nb - 0.2, 0.02, 1.05), (x, -D / 2 - 1.55, zb + 0.62), rail)
        for i in range(nb + 1):
            box('bfin', (0.18, 1.6, hf), (-W / 2 + W * i / nb, -D / 2 - 0.8, zb + hf / 2), m.accent)
        # side windows
        for y in (-D / 4, D / 4):
            plane('sglass', 1.6, 1.6, (W / 2 + 0.005, y, zb + 1.5), m.glass, (0, math.pi / 2, 0))
            plane('sglass', 1.6, 1.6, (-W / 2 - 0.005, y, zb + 1.5), m.glass, (0, -math.pi / 2, 0))
    ztop = podium + floors * hf
    box('crown', (W + 0.6, D + 0.6, 1.2), (0, 0, ztop + 0.6), m.accent)
    box('lifthouse', (6, 5, 3), (2, 2, ztop + 2.7), m.trim)
    return {'W': W, 'D': D, 'top': ztop + 4}


# ------------------------------------------------------------------ site & context
def ground(m, size=400, grass=(0.12, 0.17, 0.04), soil=(0.33, 0.17, 0.08), mix=0.4):
    g = plane('ground', size, size, (0, 0, -0.01), mat_ground('groundm', grass, soil, mix))
    sub = g.modifiers.new('sub', 'SUBSURF'); sub.subdivision_type = 'SIMPLE'; sub.levels = 0; sub.render_levels = 6
    tex = bpy.data.textures.new('gdisp', 'CLOUDS'); tex.noise_scale = 6
    d = g.modifiers.new('disp', 'DISPLACE'); d.texture = tex; d.strength = 0.08; d.texture_coords = 'GLOBAL'
    return g


def road(m, y, width=6.0, length=300, x=0, kind='asphalt', lines=True):
    mat = m.asphalt if kind == 'asphalt' else m.concrete
    box('road', (length, width, 0.06), (x, y, 0.0), mat)
    if lines and kind == 'asphalt':
        for i in range(int(length / 6)):
            box('lane', (3.0, 0.12, 0.005), (x - length / 2 + i * 6, y, 0.032), m.white_paint)
    # curb / shoulder
    box('shoulder', (length, 0.6, 0.04), (x, y - width / 2 - 0.3, 0.0), mat_noisy('dirt', (0.28, 0.16, 0.08), (0.42, 0.27, 0.15), 3, 0.95, 0.4, 50))
    box('shoulder', (length, 0.6, 0.04), (x, y + width / 2 + 0.3, 0.0), mat_noisy('dirt2', (0.28, 0.16, 0.08), (0.42, 0.27, 0.15), 3, 0.95, 0.4, 50))


def fence_wall(m, x0, x1, y, h=1.5, gate=None, post=3.0, mat=None):
    """Masonry fence along X between x0..x1 with posts; gate=(xc, w) leaves an opening with steel gate."""
    mat = mat or m.wall
    segs = []
    if gate:
        gx, gw = gate
        segs = [(x0, gx - gw / 2), (gx + gw / 2, x1)]
    else:
        segs = [(x0, x1)]
    for a, b in segs:
        if b - a < 0.1:
            continue
        box('fence', (b - a, 0.15, h * 0.6), ((a + b) / 2, y, h * 0.3), mat)
        n = max(1, int((b - a) / post))
        for i in range(n + 1):
            xx = a + (b - a) * i / n
            box('fpost', (0.25, 0.25, h), (xx, y, h / 2), m.trim)
        # steel grille on top
        k = int((b - a) / 0.12)
        for i in range(k):
            box('grill', (0.02, 0.02, h * 0.4), (a + (b - a) * (i + 0.5) / k, y, h * 0.8), m.steel)
        box('grilltop', (b - a, 0.04, 0.04), ((a + b) / 2, y, h - 0.02), m.steel)
    if gate:
        gx, gw = gate
        k = int(gw / 0.1)
        for i in range(k):
            box('gbar', (0.025, 0.025, h - 0.1), (gx - gw / 2 + gw * (i + 0.5) / k, y, h / 2), m.steel)
        box('gtop', (gw, 0.05, 0.05), (gx, y, h - 0.05), m.steel)
        box('gbot', (gw, 0.05, 0.05), (gx, y, 0.08), m.steel)


def pole_line(m, y, x0=-120, x1=120, spacing=40, h=9.0, sag=0.8):
    """Concrete electricity poles with sagging wires along X at y."""
    pm = mat_concrete('polec', (0.6, 0.59, 0.56))
    xs = []
    x = x0
    while x <= x1:
        xs.append(x); x += spacing
    for x in xs:
        cyl('pole', 0.13, h, (x, y, h / 2), pm, 8, r2=0.09)
        box('arm', (0.1, 1.6, 0.1), (x, y, h - 0.6), pm)
        for dy in (-0.7, 0.0, 0.7):
            cyl('insul', 0.04, 0.12, (x, y + dy, h - 0.48), mat_basic('ins', (0.85, 0.85, 0.8), 0.2), 8)
    wm = mat_basic('wire', (0.01, 0.01, 0.01), 0.4)
    for dy, dz in ((-0.7, -0.42), (0.0, -0.42), (0.7, -0.42), (0.3, -1.6), (-0.3, -1.9)):
        cu = bpy.data.curves.new('wire', 'CURVE'); cu.dimensions = '3D'
        cu.bevel_depth = 0.008 if dz > -1 else 0.012; cu.bevel_resolution = 2
        sp = cu.splines.new('POLY')
        pts = []
        for i in range(len(xs) - 1):
            a, b = xs[i], xs[i + 1]
            for k in range(12):
                t = k / 12
                pts.append((a + (b - a) * t, y + dy, h + dz - sag * 4 * t * (1 - t)))
        pts.append((xs[-1], y + dy, h + dz))
        sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts):
            p.co = (*c, 1)
        o = link(bpy.data.objects.new('wire', cu))
        o.data.materials.append(wm)


def tree_line(y0, y1, x0, x1, n=12, seed_=0, h=(6, 11), palms=0.25, leaves=3000):
    rr = random.Random(seed_)
    for i in range(n):
        x = rr.uniform(x0, x1); y = rr.uniform(y0, y1)
        if rr.random() < palms:
            palm((x, y, 0), rr.uniform(7, 11), seed_ * 100 + i)
        else:
            hh = rr.uniform(*h)
            pal = rr.choice([((0.035, 0.08, 0.015), (0.14, 0.22, 0.04)), ((0.05, 0.1, 0.02), (0.2, 0.26, 0.05)), ((0.03, 0.065, 0.02), (0.1, 0.16, 0.04))])
            tree((x, y, 0), hh, hh * 0.38, 'broad', leaves, pal, None, seed_ * 100 + i)


def neighbor_houses(m_list_seed, xs, y, seed_=0):
    rr = random.Random(seed_)
    for i, x in enumerate(xs):
        W, D = rr.uniform(7, 10), rr.uniform(6, 9)
        col = rr.choice([(0.82, 0.78, 0.68), (0.75, 0.8, 0.82), (0.88, 0.85, 0.78), (0.8, 0.72, 0.6)])
        wm = mat_plaster(f'nw{i}', col)
        hb = box('nh', (W, D, 3.0), (x, y, 1.7), wm)
        rf = mat_roof_tiles(f'nr{i}', *rr.choice([((0.12, 0.12, 0.13), (0.2, 0.2, 0.21)), ((0.28, 0.07, 0.03), (0.42, 0.12, 0.05)), ((0.16, 0.07, 0.04), (0.28, 0.13, 0.07))]))
        hip_roof('nroof', W, D, 3.2, 0.7, 28, rf, mat_plaster(f'nt{i}', (0.9, 0.9, 0.88)), x, y)
        for k in range(2):
            plane('nwin', 1.4, 1.2, (x - W / 4 + k * W / 2, y - D / 2 - 0.01, 1.9), mat_tinted_glass(f'ng{i}{k}'), (math.pi / 2, 0, 0))


def surroundings(seed_=0, r0=26, r1=80, n=26, palms=0.3, leaves=4000, skip_sector=None):
    """Ring of trees around the site so the horizon is a natural tree line (typical flat Isan landscape)."""
    rr = random.Random(seed_)
    for i in range(n):
        a = rr.uniform(0, 2 * math.pi)
        if skip_sector and skip_sector[0] <= math.degrees(a) % 360 <= skip_sector[1]:
            continue
        d = rr.uniform(r0, r1)
        x, y = math.cos(a) * d, math.sin(a) * d
        if rr.random() < palms:
            palm((x, y, 0), rr.uniform(7, 12), seed_ * 1000 + i)
        else:
            hh = rr.uniform(6, 12)
            pal = rr.choice([((0.025, 0.055, 0.012), (0.09, 0.14, 0.03)), ((0.035, 0.07, 0.015), (0.12, 0.18, 0.04)), ((0.03, 0.06, 0.02), (0.08, 0.13, 0.035))])
            tree((x, y, 0), hh, hh * rr.uniform(0.35, 0.5), 'broad', leaves, pal, None, seed_ * 1000 + i)


def far_treeline(seed_=0, r0=85, r1=160, n=140, skip_sector=None):
    """Distant tree belt: low-poly trees with large leaves (only seen far away)."""
    rr = random.Random(seed_)
    pals = [((0.02, 0.045, 0.01), (0.07, 0.11, 0.025)), ((0.025, 0.05, 0.012), (0.08, 0.12, 0.03))]
    for i in range(n):
        a = rr.uniform(0, 2 * math.pi)
        if skip_sector and skip_sector[0] <= math.degrees(a) % 360 <= skip_sector[1]:
            continue
        dd = rr.uniform(r0, r1)
        x, y = math.cos(a) * dd, math.sin(a) * dd
        if rr.random() < 0.18:
            palm((x, y, 0), rr.uniform(8, 13), seed_ * 7000 + i)
        else:
            h = rr.uniform(6, 14)
            tree((x, y, 0), h, h * rr.uniform(0.4, 0.55), 'broad', 1400, rr.choice(pals), None, seed_ * 7000 + i, 0, 3.5, False)

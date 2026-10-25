"""Land plots: vacant land, rice paddy, laterite-filled plot, with survey pegs & sale sign."""
import bpy, math, random
from lib import *
from arch import road, pole_line, surroundings, far_treeline, make_mats, fence_wall


def survey_peg(x, y):
    cm = mat_concrete('pegc', (0.6, 0.6, 0.58))
    rm = mat_basic('pegred', (0.5, 0.03, 0.02), 0.5)
    box('peg', (0.1, 0.1, 0.45), (x, y, 0.2), cm)
    box('pegtop', (0.105, 0.105, 0.08), (x, y, 0.42), rm)


def sale_sign(x, y, rot=0.0):
    """Generic blank-ish sale board (no text) on two posts."""
    pm = mat_basic('signpost', (0.05, 0.05, 0.05), 0.4, 0.7)
    bm = mat_basic('signboard', (0.85, 0.82, 0.2), 0.5)
    rm = mat_basic('signred', (0.55, 0.04, 0.03), 0.5)
    parts = [cyl('sp', 0.03, 2.4, (-0.7, 0, 1.2), pm, 8), cyl('sp', 0.03, 2.4, (0.7, 0, 1.2), pm, 8),
             box('board', (1.8, 0.03, 1.0), (0, 0, 1.85), bm), box('stripe', (1.8, 0.035, 0.28), (0, 0, 2.21), rm)]
    root = bpy.data.objects.new('sign', None); link(root)
    for p in parts: p.parent = root
    root.location = (x, y, 0); root.rotation_euler = (0, 0, rot)


def wire_fence(x0, x1, y, h=1.3, posts=2.5, along='X'):
    pm = mat_concrete('fpostc', (0.58, 0.57, 0.55))
    wm = mat_basic('barb', (0.05, 0.05, 0.05), 0.5, 0.8)
    n = max(1, int(abs(x1 - x0) / posts))
    for i in range(n + 1):
        t = x0 + (x1 - x0) * i / n
        if along == 'X':
            box('wpost', (0.1, 0.1, h), (t, y, h / 2), pm)
        else:
            box('wpost', (0.1, 0.1, h), (y, t, h / 2), pm)
    for z in (0.4, 0.75, 1.1):
        L = abs(x1 - x0)
        if along == 'X':
            cyl('wire', 0.004, L, ((x0 + x1) / 2, y, z), wm, 6, rot=(0, math.pi / 2, 0))
        else:
            cyl('wire', 0.004, L, (y, (x0 + x1) / 2, z), wm, 6, rot=(math.pi / 2, 0, 0))


def weeds_field(sx, sy, loc, density=180, length=0.35, seed_=0, palette=None, ground_mat=None):
    """Tall wild grass (หญ้าขึ้นรก) over a plot."""
    palette = palette or ((0.12, 0.13, 0.04), (0.35, 0.33, 0.12))
    g = grass_patch('weeds', sx, sy, loc, density, length, palette, ground_mat, seed_)
    st = g.particle_systems[0].settings
    st.roughness_endpoint = 0.12
    st.roughness_2 = 0.06
    st.radius_scale = 0.004
    st.hair_length = length
    return g


def vacant_land(seed_=0, kind='grass', W=40, D=50, road_kind='asphalt'):
    """Plot from x∈[-W/2,W/2], y∈[0,D]; road along y<0."""
    rr = random.Random(seed_)
    m = make_mats(roof='tile_grey')
    if kind == 'laterite':
        gm = mat_ground('lot', (0.13, 0.11, 0.05), (0.2, 0.075, 0.03), 0.9, 0.8)
    else:
        gm = mat_ground('lot', (0.11, 0.15, 0.04), (0.33, 0.2, 0.1), 0.35, 0.2)
    g = plane('ground', 600, 600, (0, 0, -0.01), mat_ground('wide', (0.1, 0.14, 0.04), (0.32, 0.18, 0.09), 0.4))
    lot = plane('lot', W, D, (0, D / 2, 0.02 if kind == 'laterite' else 0.0), gm)
    if kind == 'laterite':
        # raised filled plot with sloped edges
        lot.location.z = 0.5
        for sx in (-1, 1):
            s = mesh_from('slope', [(sx * W / 2, 0, 0.5), (sx * W / 2, D, 0.5), (sx * (W / 2 + 1.2), D, 0), (sx * (W / 2 + 1.2), 0, 0)], [(0, 1, 2, 3)], gm)
        s = mesh_from('slopeF', [(-W / 2, 0, 0.5), (W / 2, 0, 0.5), (W / 2 + 1.2, -1.2, 0), (-W / 2 - 1.2, -1.2, 0)], [(0, 1, 2, 3)], gm)
        # tyre tracks & a few weeds
        weeds_field(W, D * 0.3, (0, D * 0.85, 0.5), 25, 0.3, seed_, None, gm)
        tm = mat_noisy('track', (0.12, 0.06, 0.035), (0.2, 0.1, 0.06), 3, 0.9, 0.6, 40)
        for k, (x0, ang) in enumerate(((rr.uniform(-6, 2), rr.uniform(-0.25, 0.25)), (rr.uniform(2, 8), rr.uniform(-0.3, 0.3)))):
            for off in (-0.85, 0.85):
                plane('track', 0.4, D * 0.9, (x0 + off, D * 0.45, 0.53), tm, (0, 0, ang))
        # gravel stones
        st = mat_noisy('stone', (0.08, 0.04, 0.025), (0.18, 0.1, 0.06), 6, 0.8, 0.3, 30)
        for i in range(260):
            o = sphere('pebble', rr.uniform(0.02, 0.07), (rr.uniform(-W / 2, W / 2), rr.uniform(0, 18), 0.5), st, 1)
            o.scale = (1, rr.uniform(0.6, 1.2), 0.5)
    else:
        weeds_field(W, 14, (0, 7, 0.0), 110, 0.32, seed_, None, gm)
        weeds_field(W, D - 14, (0, 14 + (D - 14) / 2, 0.0), 30, 0.35, seed_ + 1, None, gm)
    road(m, -4.0, 6.0, 300, 0, road_kind)
    pole_line(m, -7.6)
    for (x, y) in ((-W / 2, 0.6), (W / 2, 0.6), (-W / 2, D), (W / 2, D)):
        survey_peg(x, y)
    if kind != 'laterite' and rr.random() < 0.6:
        wire_fence(-W / 2, W / 2, 0.3, 1.3)
    sale_sign(rr.uniform(-W / 4, W / 4), 1.6, rr.uniform(-0.15, 0.15))
    # some trees inside / on the boundary
    for i in range(rr.randint(2, 4)):
        tree((rr.uniform(-W / 2, W / 2), rr.uniform(D * 0.4, D), 0), rr.uniform(6, 10), rr.uniform(2.5, 3.5), seed_=seed_ * 31 + i, leaves=9000)
    if rr.random() < 0.6:
        palm((W / 2 - 2, D * 0.7, 0), 9, seed_ + 77)
    surroundings(seed_ + 3, 45, 110, 40, 0.3, 2500)
    far_treeline(seed_ + 4, 110, 220, 300)
    return W, D


def rice_paddy(seed_=0, stage='green', W=60, D=80):
    rr = random.Random(seed_)
    m = make_mats(roof='tile_grey')
    plane('ground', 600, 600, (0, 0, -0.01), mat_ground('wide', (0.1, 0.14, 0.04), (0.32, 0.18, 0.09), 0.4))
    bund = mat_ground('bund', (0.12, 0.15, 0.05), (0.3, 0.17, 0.08), 0.45, 1.0)
    water = mat_basic('water', (0.05, 0.06, 0.05), 0.04)
    mud = mat_noisy('mud', (0.08, 0.06, 0.04), (0.16, 0.12, 0.07), 2, 0.5, 0.2, 40)
    # plots separated by bunds (คันนา)
    nx, ny = rr.randint(3, 4), rr.randint(3, 5)
    for i in range(nx):
        for j in range(ny):
            pw, pd = W / nx, D / ny
            cx, cy = -W / 2 + pw * (i + 0.5), pd * (j + 0.5) + 1
            plane('paddywater', pw - 0.8, pd - 0.8, (cx, cy, 0.0), water if stage != 'dry' else mud)
            if stage in ('green', 'gold') and j >= 2:
                pal = ((0.1, 0.22, 0.02), (0.28, 0.42, 0.05)) if stage == 'green' else ((0.35, 0.28, 0.06), (0.6, 0.48, 0.15))
                far = mat_noisy(f'ricefar{i}{j}', pal[0], pal[1], 4, 0.8, 1.0, 80)
                o = plane('ricefar', pw - 1.0, pd - 1.0, (cx, cy, 0.35), far)
            elif stage in ('green', 'gold'):
                pal = ((0.1, 0.22, 0.02), (0.28, 0.42, 0.05)) if stage == 'green' else ((0.35, 0.28, 0.06), (0.6, 0.48, 0.15))
                g = grass_patch('rice', pw - 1.0, pd - 1.0, (cx, cy, 0.0), 55 if (j < 1) else 18, 0.6 if stage == 'green' else 0.75, pal, water, seed_ * 10 + i * 5 + j)
                st = g.particle_systems[0].settings
                st.roughness_endpoint = 0.08; st.radius_scale = 0.005
                st.hair_length = 0.6 if stage == 'green' else 0.75
            elif stage == 'dry':
                weeds_field(pw - 1.0, pd - 1.0, (cx, cy, 0.01), 40, 0.15, seed_ + i * 9 + j, ((0.3, 0.25, 0.12), (0.5, 0.42, 0.22)), mud)
            # bunds
            box('bundx', (pw, 0.6, 0.3), (cx, cy - pd / 2, 0.1), bund, 0.12)
            box('bundy', (0.6, pd, 0.3), (cx - pw / 2, cy, 0.1), bund, 0.12)
    road(m, -3.5, 5.0, 300, 0, 'concrete', False)
    pole_line(m, -6.8)
    for (x, y) in ((-W / 2, 0.4), (W / 2, 0.4)):
        survey_peg(x, y)
    sale_sign(rr.uniform(-6, 6), 0.9)
    # small rice-field hut (เถียงนา)
    hx, hy = rr.uniform(-W / 3, W / 3), D * rr.uniform(0.55, 0.8)
    wd = mat_planks('hutwood', (0.15, 0.1, 0.06), (0.3, 0.22, 0.14), 0.2, 'Z', 0.85)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('hutpost', (0.12, 0.12, 2.6), (hx + sx * 1.1, hy + sy * 1.1, 1.3), wd)
    box('hutfloor', (2.5, 2.5, 0.08), (hx, hy, 1.1), wd)
    from arch import hip_roof
    hip_roof('hutroof', 2.4, 2.4, 2.6, 0.35, 28, mat_noisy('thatch', (0.25, 0.18, 0.1), (0.42, 0.33, 0.2), 6, 0.95, 0.8, 60), wd, hx, hy, 0.15, True)
    for i in range(rr.randint(2, 5)):
        palm((rr.uniform(-W / 2, W / 2), rr.uniform(D * 0.2, D * 1.1), 0), rr.uniform(8, 13), seed_ * 3 + i)
    tree((rr.uniform(-W / 2, W / 2), D * 0.9, 0), 9, 4, seed_=seed_ + 99, leaves=12000)
    surroundings(seed_ + 3, 70, 150, 30, 0.35, 2000)
    far_treeline(seed_ + 4, 150, 260, 170)
    return W, D

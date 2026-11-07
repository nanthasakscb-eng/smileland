"""Interior rooms: living room, bedroom (Thai home / condo)."""
import bpy, math, random
from lib import *


def room_shell(W, D, H, wall_col, floor_kind, win_w, win_h, win_sill, seed_=0, view='trees'):
    """Room spans x∈[0,W], y∈[0,D], z∈[0,H]. Window centred on the back wall (y = D)."""
    rr = random.Random(seed_)
    wm = mat_plaster('iwall', wall_col, 0.01)
    if floor_kind == 'wood':
        fm = mat_planks('floor', (0.22, 0.13, 0.07), (0.42, 0.27, 0.15), 0.19, 'Y', 0.35, 0.015)
    elif floor_kind == 'tile_light':
        fm = mat_tiles_floor('floor', (0.62, 0.6, 0.56), (0.66, 0.64, 0.6), 0.6, (0.5, 0.48, 0.45), 0.12)
    else:
        fm = mat_tiles_floor('floor', (0.42, 0.38, 0.33), (0.47, 0.43, 0.38), 0.6, (0.35, 0.33, 0.3), 0.15)
    cm = mat_basic('ceil', (0.75, 0.75, 0.73), 0.9)
    plane('floor', W, D, (W / 2, D / 2, 0), fm)
    plane('ceiling', W, D, (W / 2, D / 2, H), cm, (math.pi, 0, 0))
    t = 0.15
    back = box('wallB', (W + 2 * t, t, H), (W / 2, D + t / 2, H / 2), wm)
    cx = W / 2 + rr.uniform(-0.3, 0.3)
    cut(back, box('cutw', (win_w, 1.0, win_h), (cx, D, win_sill + win_h / 2)))
    box('wallL', (t, D, H), (-t / 2, D / 2, H / 2), wm)
    box('wallR', (t, D, H), (W + t / 2, D / 2, H / 2), wm)
    box('wallF', (W + 2 * t, t, H), (W / 2, -t / 2, H / 2), wm)
    # skirting
    sk = mat_basic('skirt', (0.8, 0.8, 0.78), 0.4)
    box('skB', (W, 0.015, 0.08), (W / 2, D - 0.008, 0.04), sk)
    box('skL', (0.015, D, 0.08), (0.008, D / 2, 0.04), sk)
    box('skR', (0.015, D, 0.08), (W - 0.008, D / 2, 0.04), sk)
    # window frame + clear glass (sliding door style)
    fr = mat_basic('wframe', (0.05, 0.05, 0.05) if rr.random() < 0.6 else (0.8, 0.8, 0.78), 0.35, 0.5)
    g = mat_glass('wglass', (0.95, 0.97, 0.97), 0.0)
    y = D + 0.05
    box('wfB', (win_w, 0.08, 0.06), (cx, y, win_sill + 0.03), fr)
    box('wfT', (win_w, 0.08, 0.06), (cx, y, win_sill + win_h - 0.03), fr)
    box('wfL', (0.06, 0.08, win_h), (cx - win_w / 2 + 0.03, y, win_sill + win_h / 2), fr)
    box('wfR', (0.06, 0.08, win_h), (cx + win_w / 2 - 0.03, y, win_sill + win_h / 2), fr)
    nm = 2 if win_w > 2 else 1
    for i in range(1, nm + 1):
        box('wfM', (0.05, 0.08, win_h), (cx - win_w / 2 + win_w * i / (nm + 1), y, win_sill + win_h / 2), fr)
    gp = plane('glassp', win_w - 0.1, win_h - 0.1, (cx, y, win_sill + win_h / 2), g, (math.pi / 2, 0, 0))
    gp.visible_shadow = False   # let sunlight through cheaply
    # curtains (wavy) on both sides
    cmat = mat_fabric('curtain', rr.choice([(0.75, 0.72, 0.65), (0.6, 0.58, 0.55), (0.55, 0.6, 0.62), (0.7, 0.66, 0.58)]), 0.9)
    for side in (-1, 1):
        cw = rr.uniform(0.5, 0.8)
        nseg = 40
        verts, faces = [], []
        for i in range(nseg + 1):
            xx = cw * i / nseg
            yy = 0.05 * math.sin(i / nseg * cw * 2 * math.pi / 0.16)
            verts += [(xx, yy, 0.02), (xx, yy, H - 0.05)]
            if i:
                k = 2 * (i - 1)
                faces.append((k, k + 2, k + 3, k + 1))
        c = mesh_from('curtain', verts, faces, cmat, True)
        c.location = (cx + side * (win_w / 2 + 0.05) - (cw if side < 0 else 0), D - 0.12, 0)
    box('rod', (win_w + 1.8, 0.03, 0.03), (cx, D - 0.12, H - 0.06), mat_basic('rodm', (0.15, 0.15, 0.15), 0.3, 0.8))
    return cx, wm, fm


def outside_view(D, kind='trees', seed_=0):
    """What's visible through the window."""
    from arch import surroundings, far_treeline, condo_tower, make_mats
    rr = random.Random(seed_)
    g = plane('outground', 400, 400, (0, 0, -0.02 if kind != 'city' else -25), mat_ground('og', (0.08, 0.13, 0.03), (0.3, 0.17, 0.08), 0.75))
    if kind == 'trees':
        for i in range(5):
            tree((rr.uniform(-6, 10), D + rr.uniform(4, 14), 0), rr.uniform(5, 8), rr.uniform(2, 3), seed_=seed_ * 50 + i, leaves=7000)
        palm((rr.uniform(0, 5), D + 7, 0), 8, seed_ + 3)
        far_treeline(seed_ + 7, 30, 90, 50, (200, 360))
    else:
        # city: we're on a high floor (ground at -25 m); a few towers + tree tops below
        mats = make_mats((0.7, 0.68, 0.64), (0.8, 0.8, 0.78), 'tile_grey', (0.35, 0.36, 0.38))
        before = set(bpy.data.objects)
        for i in range(4):
            x = rr.uniform(-60, 70)
            before = set(bpy.data.objects)
            info = condo_tower(mats, rr.uniform(18, 30), rr.uniform(12, 16), rr.randint(8, 16), 3.0, seed_ + i)
            for o in set(bpy.data.objects) - before:
                if o.parent is None and o.type in ('MESH',):
                    o.location.x += x
                    o.location.y += D + rr.uniform(60, 160)
                    o.location.z -= 25
        before = set(bpy.data.objects)
        far_treeline(seed_ + 9, 60, 200, 120, (200, 360))
        for o in set(bpy.data.objects) - before:
            if o.name.startswith('trunk') or o.name.startswith('crown') or o.name.startswith('core') or o.name.startswith('branch') or o.name.startswith('ptrunk') or o.name.startswith('frond') or o.name.startswith('coconut'):
                o.location.z -= 25


def sofa(x, y, rot, w=2.2, col=(0.4, 0.38, 0.35), seed_=0):
    f = mat_fabric(f'sofa{seed_}', col)
    leg = mat_basic('leg', (0.05, 0.04, 0.03), 0.4)
    parts = []
    parts.append(box('sbase', (w, 0.92, 0.22), (0, 0, 0.25), f, 0.04))
    for i in range(3 if w > 2 else 2):
        n = 3 if w > 2 else 2
        cw = (w - 0.36) / n
        parts.append(box('scush', (cw - 0.02, 0.62, 0.16), (-w / 2 + 0.18 + cw * (i + 0.5), 0.05, 0.44), f, 0.06))
        parts.append(box('sback', (cw - 0.02, 0.2, 0.42), (-w / 2 + 0.18 + cw * (i + 0.5), 0.38, 0.62), f, 0.07))
    parts.append(box('sarm', (0.18, 0.92, 0.42), (-w / 2 + 0.09, 0, 0.48), f, 0.05))
    parts.append(box('sarm', (0.18, 0.92, 0.42), (w / 2 - 0.09, 0, 0.48), f, 0.05))
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(cyl('sleg', 0.02, 0.14, (sx * (w / 2 - 0.08), sy * 0.38, 0.07), leg, 8))
    # throw pillows
    pc = mat_fabric(f'pillow{seed_}', random.Random(seed_).choice([(0.6, 0.45, 0.25), (0.2, 0.3, 0.35), (0.7, 0.68, 0.62), (0.45, 0.2, 0.12)]))
    for px in (-w / 2 + 0.45, w / 2 - 0.45):
        p = box('pillow', (0.42, 0.14, 0.4), (px, 0.24, 0.72), pc, 0.06); p.rotation_euler = (math.radians(-15), 0, 0)
        parts.append(p)
    root = bpy.data.objects.new('sofa_root', None); link(root)
    for p in parts:
        p.parent = root
    root.location = (x, y, 0); root.rotation_euler = (0, 0, rot)
    return root


def group(parts, loc, rot=0.0, name='grp'):
    root = bpy.data.objects.new(name, None); link(root)
    for p in parts:
        p.parent = root
    root.location = loc; root.rotation_euler = (0, 0, rot)
    return root


def plant_pot(x, y, h=1.2, seed_=0):
    pm = mat_basic('pot', (0.6, 0.58, 0.55), 0.6)
    cyl('pot', 0.2, 0.4, (x, y, 0.2), pm, 24, r2=0.16)
    rr = random.Random(seed_)
    lm = mat_leaf(f'ipl{seed_}', (0.03, 0.08, 0.02), (0.12, 0.2, 0.04))
    # big tropical leaves on stems
    for i in range(9):
        a = rr.uniform(0, 6.28); L = rr.uniform(0.5, h)
        tilt = rr.uniform(0.2, 0.7)
        stem = cyl('stem', 0.008, L, (x + math.cos(a) * math.sin(tilt) * L / 2, y + math.sin(a) * math.sin(tilt) * L / 2, 0.4 + math.cos(tilt) * L / 2), lm, 6,
                   rot=(-math.sin(a) * tilt, math.cos(a) * tilt, 0))
        top = Vector((x + math.cos(a) * math.sin(tilt) * L, y + math.sin(a) * math.sin(tilt) * L, 0.4 + math.cos(tilt) * L))
        lw, ll = rr.uniform(0.12, 0.2), rr.uniform(0.3, 0.45)
        verts = []
        for k in range(9):
            t = k / 8
            w = math.sin(t * math.pi) * lw
            verts += [(-w, ll * t, -0.1 * t * t), (w, ll * t, -0.1 * t * t)]
        faces = [(2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2) for k in range(8)]
        lf = mesh_from('ileaf', verts, faces, lm, True)
        lf.location = top
        lf.rotation_euler = (rr.uniform(-0.5, 0.3), 0, a - math.pi / 2)


def wall_art(x, y, z, w, h, normal_rot, seed_=0):
    rr = random.Random(seed_)
    fm = mat_basic('artframe', (0.05, 0.04, 0.03), 0.4)
    m, nt, b = (lambda m: (m, m.node_tree, m.node_tree.nodes['Principled BSDF']))(bpy.data.materials.new(f'art{seed_}'))
    m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = rr.uniform(1.5, 4); nz.inputs['Detail'].default_value = 2
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB')
    pal = rr.choice([[(0.75, 0.7, 0.6), (0.4, 0.25, 0.15), (0.1, 0.15, 0.2)], [(0.8, 0.78, 0.72), (0.55, 0.45, 0.3), (0.2, 0.25, 0.2)], [(0.7, 0.72, 0.75), (0.3, 0.4, 0.5), (0.8, 0.6, 0.4)]])
    r.color_ramp.elements[0].color = (*pal[0], 1); r.color_ramp.elements[1].color = (*pal[2], 1)
    e = r.color_ramp.elements.new(0.5); e.color = (*pal[1], 1)
    r.color_ramp.interpolation = 'CONSTANT'
    nt.links.new(nz.outputs['Fac'], r.inputs['Fac'])
    nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.8
    fr = box('frame', (w + 0.06, 0.03, h + 0.06), (0, 0, 0), fm)
    pic = plane('pic', w, h, (0, -0.017, 0), m, (math.pi / 2, 0, 0))
    group([fr, pic], (x, y, z), normal_rot)


def ceiling_lights(W, D, H, n=2, energy=25):
    em = bpy.data.materials.new('emit'); em.use_nodes = True
    nt = em.node_tree; nt.nodes.remove(nt.nodes['Principled BSDF'])
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Strength'].default_value = 8; e.inputs['Color'].default_value = (1, 0.85, 0.65, 1)
    nt.links.new(e.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    for i in range(n):
        for j in range(n):
            x = W * (i + 0.5) / n; y = D * (j + 0.5) / n
            cyl('downlight', 0.06, 0.01, (x, y, H - 0.004), em, 16)
            ld = bpy.data.lights.new('spot', 'SPOT'); ld.energy = energy; ld.spot_size = math.radians(110); ld.spot_blend = 0.6
            ld.color = (1, 0.86, 0.68); ld.shadow_soft_size = 0.05
            o = link(bpy.data.objects.new('spot', ld)); o.location = (x, y, H - 0.02)


def living_room(seed_=0, condo=False, view='trees'):
    rr = random.Random(seed_)
    W, D, H = rr.uniform(4.6, 5.6), rr.uniform(4.2, 5.0), 2.75 if not condo else 2.6
    wall = rr.choice([(0.72, 0.7, 0.66), (0.7, 0.68, 0.62), (0.62, 0.64, 0.62), (0.74, 0.72, 0.7)])
    cx, wm, fm = room_shell(W, D, H, wall, rr.choice(['wood', 'tile_light', 'tile_warm']), min(W - 1.4, 3.2), H - 0.5 if condo else 1.6, 0.05 if condo else 0.8, seed_)
    outside_view(D, view, seed_)
    # rug
    rug = mat_fabric(f'rug{seed_}', rr.choice([(0.55, 0.5, 0.42), (0.35, 0.33, 0.3), (0.6, 0.55, 0.48)]))
    box('rug', (2.4, 1.7, 0.012), (W * 0.5, D * 0.42, 0.006), rug)
    sofa(0.55, D * 0.45, math.pi / 2, 2.2, rr.choice([(0.35, 0.33, 0.3), (0.5, 0.47, 0.42), (0.18, 0.22, 0.28), (0.45, 0.35, 0.25)]), seed_)
    # coffee table
    wd = mat_planks(f'tablewood{seed_}', (0.2, 0.11, 0.05), (0.35, 0.2, 0.1), 0.2, 'X', 0.3, 0.0)
    box('ctable', (1.1, 0.6, 0.05), (W * 0.5, D * 0.45, 0.42), wd, 0.01)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('ctleg', (0.04, 0.04, 0.4), (W * 0.5 + sx * 0.5, D * 0.45 + sy * 0.25, 0.2), wd)
    # books/vase on table
    vm = mat_basic('vase', (0.8, 0.78, 0.74), 0.15)
    cyl('vase', 0.06, 0.22, (W * 0.5 + 0.3, D * 0.45, 0.555), vm, 24, r2=0.04)
    box('book', (0.28, 0.2, 0.04), (W * 0.5 - 0.25, D * 0.45, 0.465), mat_basic('bk', (0.5, 0.15, 0.1), 0.6))
    # TV console under the side wall (right wall)
    cm = mat_planks(f'console{seed_}', (0.08, 0.05, 0.03), (0.15, 0.09, 0.05), 0.4, 'Y', 0.4, 0.0)
    box('console', (0.42, 1.8, 0.45), (W - 0.23, D * 0.45, 0.25), cm, 0.01)
    box('tv', (0.05, 1.45, 0.83), (W - 0.06, D * 0.45, 1.25), mat_basic('tvm', (0.01, 0.01, 0.012), 0.1))
    # floor lamp + plant + armchair
    plant_pot(0.45, D - 0.55, 1.3, seed_)
    lm = mat_basic('lampmetal', (0.05, 0.05, 0.05), 0.3, 0.8)
    lx, ly = 0.4, D * 0.45 - 1.45
    cyl('lpole', 0.015, 1.5, (lx, ly, 0.75), lm, 8)
    cyl('lbase', 0.14, 0.03, (lx, ly, 0.015), lm, 24)
    shade = cyl('lshade', 0.22, 0.3, (lx, ly, 1.55), mat_fabric('shade', (0.85, 0.8, 0.7)), 32, r2=0.16)
    lt = bpy.data.lights.new('lamp', 'POINT'); lt.energy = 15; lt.color = (1, 0.8, 0.55); lt.shadow_soft_size = 0.1
    o = link(bpy.data.objects.new('lamp', lt)); o.location = (lx, ly, 1.5)
    wall_art(0.02, D * 0.45, 1.55, 1.0, 0.7, -math.pi / 2, seed_)
    ceiling_lights(W, D, H, 2, 12)
    return W, D, H, cx


def bedroom(seed_=0, condo=False, view='trees'):
    rr = random.Random(seed_)
    W, D, H = rr.uniform(4.0, 4.8), rr.uniform(3.8, 4.4), 2.7 if not condo else 2.6
    wall = rr.choice([(0.7, 0.68, 0.64), (0.6, 0.62, 0.6), (0.72, 0.68, 0.6)])
    cx, wm, fm = room_shell(W, D, H, wall, rr.choice(['wood', 'wood', 'tile_light']), min(W - 1.6, 2.4), H - 0.6 if condo else 1.5, 0.05 if condo else 0.85, seed_ + 1)
    outside_view(D, view, seed_ + 1)
    # bed against left wall, headboard at x=0
    hb = mat_fabric(f'headb{seed_}', rr.choice([(0.4, 0.37, 0.33), (0.25, 0.27, 0.3), (0.5, 0.42, 0.33)]))
    by = D * 0.42
    box('headboard', (0.08, 1.9, 1.15), (0.05, by, 0.58), hb, 0.03)
    box('bedbase', (2.05, 1.85, 0.3), (1.1, by, 0.2), hb, 0.02)
    sheet = mat_fabric('sheet', (0.82, 0.81, 0.78))
    duvet = mat_fabric(f'duvet{seed_}', rr.choice([(0.8, 0.79, 0.76), (0.62, 0.6, 0.56), (0.55, 0.6, 0.65)]))
    box('mattress', (2.0, 1.8, 0.24), (1.1, by, 0.47), sheet, 0.06)
    dv = box('duvet', (1.45, 1.9, 0.1), (1.42, by, 0.6), duvet, 0.05)
    sub = dv.modifiers.new('s', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
    box('throw', (0.5, 1.92, 0.04), (1.85, by, 0.66), mat_fabric('throw', rr.choice([(0.35, 0.25, 0.18), (0.2, 0.25, 0.3), (0.45, 0.4, 0.3)])), 0.02)
    for py in (by - 0.45, by + 0.45):
        p = box('pillow', (0.4, 0.68, 0.16), (0.32, py, 0.68), sheet, 0.07)
        p.rotation_euler = (0, math.radians(-20), 0)
    nm = mat_planks(f'ns{seed_}', (0.15, 0.09, 0.05), (0.28, 0.17, 0.09), 0.3, 'X', 0.4, 0.0)
    for py in (by - 1.25, by + 1.25):
        box('nightstand', (0.45, 0.45, 0.5), (0.25, py, 0.25), nm, 0.01)
        cyl('blamp', 0.12, 0.22, (0.25, py, 0.65), mat_fabric('bls', (0.85, 0.8, 0.7)), 24, r2=0.09)
        lt = bpy.data.lights.new('bl', 'POINT'); lt.energy = 6; lt.color = (1, 0.78, 0.5); lt.shadow_soft_size = 0.08
        o = link(bpy.data.objects.new('bl', lt)); o.location = (0.25, py, 0.68)
    # wardrobe on right wall
    wd = mat_basic('wardrobe', (0.78, 0.76, 0.72), 0.35)
    wy = D - 1.35
    box('wardrobe', (0.6, 1.8, 2.3), (W - 0.31, wy, 1.15), wd, 0.01)
    for k in range(3):
        box('handle', (0.02, 0.02, 0.3), (W - 0.62, wy - 0.6 + 0.6 * k, 1.1), mat_basic('hdl', (0.1, 0.1, 0.1), 0.3, 0.9))
    # wall AC unit above bed side
    box('ac', (0.24, 0.9, 0.3), (0.12, by, H - 0.35), mat_basic('acw', (0.85, 0.85, 0.83), 0.35), 0.02) if False else \
        box('ac', (0.9, 0.24, 0.3), (W * 0.5, 0.12, H - 0.35), mat_basic('acw', (0.85, 0.85, 0.83), 0.35), 0.02)
    wall_art(0.1, by, 1.55, 1.1, 0.55, -math.pi / 2, seed_ + 5)
    box('rug', (1.4, 2.2, 0.012), (2.1, by, 0.006), mat_fabric('brug', (0.5, 0.46, 0.4)))
    ceiling_lights(W, D, H, 1, 18)
    return W, D, H, cx

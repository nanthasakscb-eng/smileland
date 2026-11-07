"""Procedural photoreal scene library for Isan property renders (Blender / Cycles)."""
import bpy, bmesh, math, random
from mathutils import Vector, Euler

R = random.Random(1)


def seed(s):
    global R
    R = random.Random(s)


def reset(w=1600, h=1200, samples=96, exposure=0.0):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 3
    sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 6
    sc.cycles.transparent_max_bounces = 8
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = False
    try:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        try:
            sc.view_settings.view_transform = 'Filmic'
        except Exception:
            pass
    sc.view_settings.exposure = exposure
    if not sc.world:
        sc.world = bpy.data.worlds.new('World')
    return sc


# ------------------------------------------------------------------ materials
def _bsdf(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    return m, nt, b


def _inp(b, *names):
    for n in names:
        if n in b.inputs:
            return b.inputs[n]
    return None


def mat_basic(name, color, rough=0.6, metal=0.0, spec=0.5):
    m, nt, b = _bsdf(name)
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    s = _inp(b, 'Specular IOR Level', 'Specular')
    if s: s.default_value = spec
    return m


def _tex_coord(nt, kind='Object'):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    return tc.outputs[kind]


def _noise(nt, vec, scale, detail=6, rough=0.6):
    n = nt.nodes.new('ShaderNodeTexNoise')
    n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = rough
    nt.links.new(vec, n.inputs['Vector'])
    return n


def _ramp(nt, fac, stops):
    r = nt.nodes.new('ShaderNodeValToRGB')
    el = r.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
    el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
    for p, c in stops[1:-1]:
        e = el.new(p)
        e.color = (*c, 1)
    nt.links.new(fac, r.inputs['Fac'])
    return r


def _bump(nt, b, height, strength=0.3, dist=0.02):
    bp = nt.nodes.new('ShaderNodeBump')
    bp.inputs['Strength'].default_value = strength
    if 'Distance' in bp.inputs:
        bp.inputs['Distance'].default_value = dist
    nt.links.new(height, bp.inputs['Height'])
    nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return bp


def mat_noisy(name, c1, c2, scale=3.0, rough=0.7, bump=0.15, bscale=40, coord='Object', metal=0.0, spec=0.5):
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, coord)
    n = _noise(nt, v, scale)
    r = _ramp(nt, n.outputs['Fac'], [(0.3, c1), (0.7, c2)])
    nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    s = _inp(b, 'Specular IOR Level', 'Specular')
    if s: s.default_value = spec
    if bump:
        n2 = _noise(nt, v, bscale, 8, 0.7)
        _bump(nt, b, n2.outputs['Fac'], bump, 0.01)
    return m


def mat_plaster(name, color, dirt=0.06):
    """Painted render wall with subtle stucco bump + dirt toward the bottom."""
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    n = _noise(nt, v, 1.5, 4)
    dark = tuple(max(0, x * (1 - dirt * 2)) for x in color)
    r = _ramp(nt, n.outputs['Fac'], [(0.35, dark), (0.65, color)])
    nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85
    n2 = _noise(nt, v, 180, 10, 0.75)
    _bump(nt, b, n2.outputs['Fac'], 0.12, 0.004)
    return m


def mat_glass(name='glass', tint=(0.85, 0.92, 0.95), rough=0.02):
    m, nt, b = _bsdf(name)
    b.inputs['Base Color'].default_value = (*tint, 1)
    b.inputs['Roughness'].default_value = rough
    t = _inp(b, 'Transmission Weight', 'Transmission')
    t.default_value = 1.0
    b.inputs['IOR'].default_value = 1.45
    return m


def mat_tinted_glass(name='tglass', color=(0.12, 0.16, 0.18)):
    """Reflective dark window glass (cheap: no transmission) – exterior shots."""
    m, nt, b = _bsdf(name)
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = 0.03
    b.inputs['Metallic'].default_value = 0.0
    s = _inp(b, 'Specular IOR Level', 'Specular')
    if s: s.default_value = 1.0
    c = _inp(b, 'Coat Weight', 'Clearcoat')
    if c: c.default_value = 1.0
    return m


def mat_roof_tiles(name, c1, c2, rows=0.33, axis='Z'):
    """Concrete roof tiles: horizontal courses via wave bands on world Z."""
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(v, sep.inputs[0])
    # courses
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
    mul.inputs[1].default_value = 1.0 / rows
    nt.links.new(sep.outputs[axis], mul.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'
    nt.links.new(mul.outputs[0], fr.inputs[0])
    # tile profile: wave across X
    wv = nt.nodes.new('ShaderNodeTexWave')
    wv.inputs['Scale'].default_value = 3.2
    wv.bands_direction = 'X'
    nt.links.new(v, wv.inputs['Vector'])
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'
    nt.links.new(fr.outputs[0], add.inputs[0])
    m2 = nt.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; m2.inputs[1].default_value = 0.35
    nt.links.new(wv.outputs['Fac'], m2.inputs[0])
    nt.links.new(m2.outputs[0], add.inputs[1])
    _bump(nt, b, add.outputs[0], 0.6, 0.03)
    n = _noise(nt, v, 2.0, 5)
    r = _ramp(nt, n.outputs['Fac'], [(0.3, c1), (0.75, c2)])
    nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.55
    return m


def mat_metal_sheet(name, color, rough=0.35, pitch=0.2):
    """Corrugated metal roof (sine bump across X)."""
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    wv = nt.nodes.new('ShaderNodeTexWave')
    wv.inputs['Scale'].default_value = 1.0 / pitch
    wv.bands_direction = 'X'
    wv.wave_profile = 'SIN'
    nt.links.new(v, wv.inputs['Vector'])
    _bump(nt, b, wv.outputs['Fac'], 0.8, 0.02)
    n = _noise(nt, v, 3, 4)
    dark = tuple(x * 0.82 for x in color)
    r = _ramp(nt, n.outputs['Fac'], [(0.3, dark), (0.7, color)])
    nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = 0.6
    return m


def mat_planks(name, c1, c2, width=0.15, axis='Z', rough=0.7, gap=0.06):
    """Horizontal/vertical wooden planks with grain."""
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(v, sep.inputs[0])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 1 / width
    nt.links.new(sep.outputs[axis], mul.inputs[0])
    fl = nt.nodes.new('ShaderNodeMath'); fl.operation = 'FLOOR'
    nt.links.new(mul.outputs[0], fl.inputs[0])
    fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'
    nt.links.new(mul.outputs[0], fr.inputs[0])
    # per-plank colour variation
    wn = nt.nodes.new('ShaderNodeTexWhiteNoise'); wn.noise_dimensions = '1D'
    nt.links.new(fl.outputs[0], wn.inputs['W'])
    # grain: stretched noise
    mp = nt.nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (1, 1, 1)
    if axis == 'Z':
        mp.inputs['Scale'].default_value = (0.6, 0.6, 30)
    elif axis == 'X':
        mp.inputs['Scale'].default_value = (30, 0.6, 0.6)
    else:
        mp.inputs['Scale'].default_value = (0.6, 30, 0.6)
    nt.links.new(v, mp.inputs['Vector'])
    gn = _noise(nt, mp.outputs['Vector'], 4, 8, 0.65)
    mix = nt.nodes.new('ShaderNodeMath'); mix.operation = 'ADD'
    m1 = nt.nodes.new('ShaderNodeMath'); m1.operation = 'MULTIPLY'; m1.inputs[1].default_value = 0.5
    nt.links.new(wn.outputs['Value'], m1.inputs[0])
    m2 = nt.nodes.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; m2.inputs[1].default_value = 0.6
    nt.links.new(gn.outputs['Fac'], m2.inputs[0])
    nt.links.new(m1.outputs[0], mix.inputs[0]); nt.links.new(m2.outputs[0], mix.inputs[1])
    r = _ramp(nt, mix.outputs[0], [(0.2, c1), (0.85, c2)])
    # dark gaps between planks
    gp = nt.nodes.new('ShaderNodeMath'); gp.operation = 'LESS_THAN'; gp.inputs[1].default_value = gap
    nt.links.new(fr.outputs[0], gp.inputs[0])
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    nt.links.new(gp.outputs[0], mixc.inputs['Factor'])
    nt.links.new(r.outputs['Color'], mixc.inputs[6])
    mixc.inputs[7].default_value = (0.03, 0.02, 0.015, 1)
    nt.links.new(mixc.outputs[2], b.inputs['Base Color'])
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1
    nt.links.new(gp.outputs[0], inv.inputs[1])
    _bump(nt, b, inv.outputs[0], 0.4, 0.004)
    b.inputs['Roughness'].default_value = rough
    return m


def mat_tiles_floor(name, c1, c2, size=0.6, grout=(0.55, 0.53, 0.5), rough=0.18):
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    br = nt.nodes.new('ShaderNodeTexBrick')
    br.inputs['Scale'].default_value = 1.0
    br.offset = 0.0
    br.inputs['Brick Width'].default_value = size
    br.inputs['Row Height'].default_value = size
    br.inputs['Mortar Size'].default_value = 0.003
    br.inputs['Color1'].default_value = (*c1, 1)
    br.inputs['Color2'].default_value = (*c2, 1)
    br.inputs['Mortar'].default_value = (*grout, 1)
    nt.links.new(v, br.inputs['Vector'])
    n = _noise(nt, v, 6, 6)
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'; mixc.blend_type = 'OVERLAY'
    mixc.inputs['Factor'].default_value = 0.15
    nt.links.new(br.outputs['Color'], mixc.inputs[6]); nt.links.new(n.outputs['Color'], mixc.inputs[7])
    nt.links.new(mixc.outputs[2], b.inputs['Base Color'])
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1
    nt.links.new(br.outputs['Fac'], inv.inputs[1])
    _bump(nt, b, inv.outputs[0], 0.3, 0.002)
    b.inputs['Roughness'].default_value = rough
    return m


def mat_fabric(name, color, rough=0.95):
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    n = _noise(nt, v, 400, 3)
    _bump(nt, b, n.outputs['Fac'], 0.15, 0.002)
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    sh = _inp(b, 'Sheen Weight', 'Sheen')
    if sh: sh.default_value = 0.5
    return m


def mat_leaf(name, c1, c2):
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    oi = nt.nodes.new('ShaderNodeObjectInfo')
    r = _ramp(nt, oi.outputs['Random'], [(0.0, c1), (1.0, c2)])
    nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.62
    sp_ = _inp(b, 'Specular IOR Level', 'Specular')
    if sp_: sp_.default_value = 0.3
    sst = _inp(b, 'Subsurface Weight', 'Subsurface')
    tw = _inp(b, 'Transmission Weight', 'Transmission')
    # thin translucency
    if tw:
        tw.default_value = 0.0
    m.use_backface_culling = False
    # mix with translucent shader for backlit leaves
    tr = nt.nodes.new('ShaderNodeBsdfTranslucent')
    nt.links.new(r.outputs['Color'], tr.inputs['Color'])
    mx = nt.nodes.new('ShaderNodeMixShader')
    mx.inputs['Fac'].default_value = 0.3
    out = nt.nodes['Material Output']
    nt.links.new(b.outputs[0], mx.inputs[1])
    nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs['Surface'])
    return m


def mat_ground(name, grass=(0.13, 0.2, 0.05), soil=(0.35, 0.18, 0.08), mix=0.35, scale=0.25):
    """Ground blending grass and laterite soil patches."""
    m, nt, b = _bsdf(name)
    v = _tex_coord(nt, 'Object')
    n = _noise(nt, v, scale, 8, 0.65)
    n2 = _noise(nt, v, 6, 8, 0.7)
    g2 = tuple(x * 0.7 for x in grass)
    gr = _ramp(nt, n2.outputs['Fac'], [(0.3, g2), (0.5, grass), (0.7, (grass[0] * 1.5, grass[1] * 1.3, grass[2]))])
    s2 = tuple(x * 0.75 for x in soil)
    so = _ramp(nt, n2.outputs['Fac'], [(0.3, s2), (0.7, soil)])
    mk = _ramp(nt, n.outputs['Fac'], [(mix, (0, 0, 0)), (mix + 0.12, (1, 1, 1))])
    mixc = nt.nodes.new('ShaderNodeMix'); mixc.data_type = 'RGBA'
    nt.links.new(mk.outputs['Color'], mixc.inputs['Factor'])
    nt.links.new(so.outputs['Color'], mixc.inputs[6]); nt.links.new(gr.outputs['Color'], mixc.inputs[7])
    nt.links.new(mixc.outputs[2], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    n3 = _noise(nt, v, 60, 10, 0.75)
    _bump(nt, b, n3.outputs['Fac'], 0.6, 0.05)
    return m


def mat_asphalt(name='asphalt'):
    return mat_noisy(name, (0.035, 0.035, 0.035), (0.08, 0.08, 0.075), scale=8, rough=0.85, bump=0.5, bscale=200)


def mat_concrete(name='concrete', c=(0.55, 0.53, 0.5)):
    return mat_noisy(name, tuple(x * 0.8 for x in c), c, scale=2.5, rough=0.8, bump=0.2, bscale=120)


# ------------------------------------------------------------------ geometry
def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def box(name, size, loc, mat=None, bevel=0.0, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.location = loc
    o.rotation_euler = rot
    if mat: me.materials.append(mat)
    if bevel > 0:
        md = o.modifiers.new('bev', 'BEVEL'); md.width = bevel; md.segments = 3
        md.limit_method = 'ANGLE'
        for p in me.polygons: p.use_smooth = True
        try:
            me.shade_smooth_by_angle()
        except Exception:
            pass
    return o


def cyl(name, r, h, loc, mat=None, verts=24, r2=None, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me))
    o.location = loc; o.rotation_euler = rot
    if mat: me.materials.append(mat)
    return o


def sphere(name, r, loc, mat=None, sub=3):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me))
    o.location = loc
    if mat: me.materials.append(mat)
    return o


def mesh_from(name, verts, faces, mat=None, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = link(bpy.data.objects.new(name, me))
    if mat: me.materials.append(mat)
    return o


def plane(name, sx, sy, loc, mat=None, rot=(0, 0, 0)):
    o = mesh_from(name, [(-sx / 2, -sy / 2, 0), (sx / 2, -sy / 2, 0), (sx / 2, sy / 2, 0), (-sx / 2, sy / 2, 0)], [(0, 1, 2, 3)], mat)
    o.location = loc; o.rotation_euler = rot
    return o


def cut(target, cutter):
    md = target.modifiers.new('cut', 'BOOLEAN')
    md.operation = 'DIFFERENCE'
    md.object = cutter
    md.solver = 'EXACT'
    cutter.hide_render = True
    cutter.hide_viewport = True
    cutter.display_type = 'WIRE'


def solidify(o, t, offset=-1):
    md = o.modifiers.new('sol', 'SOLIDIFY'); md.thickness = t; md.offset = offset
    return o


# ------------------------------------------------------------------ lighting & camera
def sky(sun_elev=35, sun_rot=140, strength=1.0, sun_strength=1.0, haze=1.0, clouds=True):
    w = bpy.context.scene.world
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    st = nt.nodes.new('ShaderNodeTexSky')
    for t in ('MULTIPLE_SCATTERING', 'NISHITA'):
        try:
            st.sky_type = t; break
        except Exception:
            pass
    for attr, val in (('sun_elevation', math.radians(sun_elev)), ('sun_rotation', math.radians(sun_rot)),
                      ('altitude', 200.0), ('air_density', 1.0 * haze), ('aerosol_density', 1.5 * haze), ('dust_density', 1.5 * haze),
                      ('ozone_density', 1.0), ('sun_intensity', sun_strength), ('sun_disc', True), ('sun_size', math.radians(0.6))):
        try:
            setattr(st, attr, val)
        except Exception:
            pass
    col = st.outputs['Color']
    if clouds:
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Generated'], sep.inputs[0])
        # project direction onto a cloud plane: (x/z, y/z)
        dz = nt.nodes.new('ShaderNodeMath'); dz.operation = 'MAXIMUM'; dz.inputs[1].default_value = 0.02
        nt.links.new(sep.outputs['Z'], dz.inputs[0])
        px = nt.nodes.new('ShaderNodeMath'); px.operation = 'DIVIDE'; nt.links.new(sep.outputs['X'], px.inputs[0]); nt.links.new(dz.outputs[0], px.inputs[1])
        py = nt.nodes.new('ShaderNodeMath'); py.operation = 'DIVIDE'; nt.links.new(sep.outputs['Y'], py.inputs[0]); nt.links.new(dz.outputs[0], py.inputs[1])
        cmb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(px.outputs[0], cmb.inputs[0]); nt.links.new(py.outputs[0], cmb.inputs[1])
        cmb.inputs[2].default_value = R.uniform(0, 50)
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.noise_dimensions = '3D'
        nz.inputs['Scale'].default_value = 0.9; nz.inputs['Detail'].default_value = 12; nz.inputs['Roughness'].default_value = 0.6
        nt.links.new(cmb.outputs[0], nz.inputs['Vector'])
        rp = nt.nodes.new('ShaderNodeValToRGB')
        cov = R.uniform(0.52, 0.6)
        rp.color_ramp.elements[0].position = cov; rp.color_ramp.elements[0].color = (0, 0, 0, 1)
        rp.color_ramp.elements[1].position = cov + 0.16; rp.color_ramp.elements[1].color = (1, 1, 1, 1)
        nt.links.new(nz.outputs['Fac'], rp.inputs['Fac'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.02; mr.inputs['From Max'].default_value = 0.25
        nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'
        nt.links.new(rp.outputs['Color'], mul.inputs[0]); nt.links.new(mr.outputs['Result'], mul.inputs[1])
        mul2 = nt.nodes.new('ShaderNodeMath'); mul2.operation = 'MULTIPLY'; mul2.inputs[1].default_value = 0.9
        nt.links.new(mul.outputs[0], mul2.inputs[0])
        # cloud brightness relative to sky: sky luminance * k
        cl = nt.nodes.new('ShaderNodeMix'); cl.data_type = 'RGBA'; cl.blend_type = 'MIX'
        nt.links.new(mul2.outputs[0], cl.inputs['Factor'])
        nt.links.new(col, cl.inputs[6])
        bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(col, bw.inputs[0])
        k = nt.nodes.new('ShaderNodeMath'); k.operation = 'MULTIPLY'; k.inputs[1].default_value = 2.2
        nt.links.new(bw.outputs[0], k.inputs[0])
        cc = nt.nodes.new('ShaderNodeCombineColor')
        for i in range(3): nt.links.new(k.outputs[0], cc.inputs[i])
        nt.links.new(cc.outputs[0], cl.inputs[7])
        col = cl.outputs[2]
    nt.links.new(col, bg.inputs['Color'])
    bg.inputs['Strength'].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs['Surface'])


def sun(elev=35, rot=140, strength=4.0, angle=0.6, color=(1.0, 0.96, 0.9)):
    ld = bpy.data.lights.new('sun', 'SUN')
    ld.energy = strength
    ld.angle = math.radians(angle)
    ld.color = color
    o = link(bpy.data.objects.new('sun', ld))
    # Blender sun points along -Z; sky sun_rotation measured from +Y? align: direction toward sun
    e, r = math.radians(elev), math.radians(rot)
    d = Vector((math.sin(r) * math.cos(e), math.cos(r) * math.cos(e), math.sin(e)))  # toward sun
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return o


def area_light(name, size, loc, target, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size[0]; ld.shape = 'RECTANGLE'
    ld.size_y = size[1]; ld.color = color
    o = link(bpy.data.objects.new(name, ld))
    o.location = loc
    look(o, target)
    return o


def look(o, target):
    d = Vector(target) - Vector(o.location)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def camera(loc, target, lens=24, shift_y=0.0, shift_x=0.0, sensor=36):
    cd = bpy.data.cameras.new('cam')
    cd.lens = lens; cd.sensor_width = sensor
    cd.shift_y = shift_y; cd.shift_x = shift_x
    cd.clip_start = 0.05; cd.clip_end = 2000
    o = link(bpy.data.objects.new('cam', cd))
    o.location = loc
    look(o, target)
    bpy.context.scene.camera = o
    return o


def camera_level(loc, yaw_target, lens=24, shift_y=0.1):
    """Architectural camera: level (no vertical convergence), framing via shift."""
    t = Vector(yaw_target)
    t.z = loc[2]
    return camera(loc, t, lens, shift_y)


def render(path):
    sc = bpy.context.scene
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ------------------------------------------------------------------ vegetation
_LEAF = {}


def leaf_mesh(kind='broad', size=0.09):
    key = (kind, size)
    if key in _LEAF:
        return _LEAF[key]
    if kind == 'broad':
        pts = [(0, 0, 0)]
        n = 8
        for i in range(n + 1):
            t = i / n
            w = math.sin(t * math.pi) * 0.38
            pts.append((w * size, t * size, 0.08 * size * math.sin(t * math.pi)))
        for i in range(n - 1, 0, -1):
            t = i / n
            w = math.sin(t * math.pi) * 0.38
            pts.append((-w * size, t * size, 0.08 * size * math.sin(t * math.pi)))
        faces = [tuple(range(1, len(pts)))]
        verts = pts[1:]
        faces = [tuple(range(len(verts)))]
    else:  # blade
        verts = [(-0.004, 0, 0), (0.004, 0, 0), (0.003, size * 0.6, 0.01 * size), (0.0, size, 0.03 * size), (-0.003, size * 0.6, 0.01 * size)]
        faces = [(0, 1, 2, 3, 4)]
    me = bpy.data.meshes.new('leaf_' + kind)
    me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new('leaf_' + kind, me)
    bpy.context.scene.collection.objects.link(o)
    o.hide_render = True; o.hide_viewport = True
    o.location = (0, 0, -100)
    _LEAF[key] = o
    return o


def scatter_leaves(emitter, count, leaf_obj, mat, size=1.0, rand_size=0.5, seed_=0):
    leaf_obj.data.materials.clear(); leaf_obj.data.materials.append(mat)
    ps = emitter.modifiers.new('leaves', 'PARTICLE_SYSTEM').particle_system
    st = ps.settings
    st.type = 'HAIR'
    st.use_advanced_hair = True
    st.count = count
    st.hair_length = 1.0
    st.emit_from = 'FACE'
    st.distribution = 'RAND'
    st.use_emit_random = True
    st.render_type = 'OBJECT'
    st.instance_object = leaf_obj
    st.particle_size = size
    st.size_random = rand_size
    st.use_rotations = True
    st.rotation_mode = 'NOR'
    st.phase_factor_random = 2.0
    st.rotation_factor_random = 1.0
    st.use_rotation_instance = False
    ps.seed = seed_
    emitter.show_instancer_for_render = False
    return ps


def tree(loc, height=6.0, crown=2.6, kind='broad', leaves=14000, palette=None, trunk_mat=None, seed_=0, lean=0.0, leaf_scale=1.0, branches=True):
    rr = random.Random(seed_)
    x, y, z = loc
    palette = palette or ((0.04, 0.09, 0.015), (0.16, 0.24, 0.04))
    lm = mat_leaf(f'leaf{seed_}', *palette)
    tm = trunk_mat or mat_noisy(f'bark{seed_}', (0.08, 0.06, 0.045), (0.2, 0.17, 0.13), 6, 0.9, 0.8, 30)
    th = height * 0.55
    cyl('trunk', 0.07 + height * 0.012, th, (x, y, z + th / 2), tm, 12, r2=0.05 + height * 0.006, rot=(lean, rr.uniform(-.1, .1), 0))
    # branches
    for i in range(4 if branches else 0):
        a = rr.uniform(0, 2 * math.pi)
        L = crown * rr.uniform(0.5, 0.8)
        cx = x + math.cos(a) * L / 2; cy = y + math.sin(a) * L / 2
        cyl('branch', 0.035, L, (cx, cy, z + th + rr.uniform(-0.3, 0.6)), tm, 8, r2=0.015,
            rot=(math.cos(a + math.pi / 2) * 1.0, math.sin(a + math.pi / 2) * -1.0, 0))
    # crown blobs (hidden emitters)
    lf = leaf_mesh('broad', 0.16 if kind == 'broad' else 0.1)
    nblob = rr.randint(10, 16)
    per = max(150, leaves // nblob)
    for i in range(nblob):
        a = rr.uniform(0, 2 * math.pi); d = rr.uniform(0.1, crown * 0.85) ** 1.0
        r = crown * rr.uniform(0.25, 0.45)
        c = sphere('crown', r, (x + math.cos(a) * d, y + math.sin(a) * d, z + th + crown * 0.35 + rr.uniform(-0.35, 0.6) * crown * (1 - d / crown) ), None, 2)
        c.scale = (rr.uniform(1, 1.4), rr.uniform(1, 1.4), rr.uniform(0.55, 0.8))
        scatter_leaves(c, per, lf, lm, leaf_scale, 0.6, seed_ * 10 + i)
        # dark inner core to block light (cheap)
        core = sphere('core', r * 0.8, c.location, mat_basic(f'core{seed_}{i}', (palette[0][0] * 0.6, palette[0][1] * 0.6, palette[0][2] * 0.6), 0.9), 2)
        core.scale = c.scale


def palm(loc, height=7.0, seed_=0):
    """Coconut / sugar palm (common in Isan landscapes)."""
    rr = random.Random(seed_)
    x, y, z = loc
    tm = mat_noisy(f'palmbark{seed_}', (0.18, 0.15, 0.12), (0.32, 0.28, 0.22), 4, 0.9, 1.0, 12)
    lean = rr.uniform(-0.12, 0.12)
    cyl('ptrunk', 0.16, height, (x, y, z + height / 2), tm, 12, r2=0.12, rot=(lean, rr.uniform(-.08, .08), 0))
    top = Vector((x, y, z)) + Euler((lean, 0, 0)).to_matrix() @ Vector((0, 0, height))
    lm = mat_leaf(f'frond{seed_}', (0.08, 0.12, 0.02), (0.22, 0.27, 0.06))
    for i in range(16):
        a = i / 16 * 2 * math.pi + rr.uniform(-.2, .2)
        up = rr.uniform(-0.35, 0.55)          # initial pitch of the rachis
        L = rr.uniform(2.8, 3.8)
        verts, faces = [], []
        seg = 34
        def rach(t):
            # rachis: rises then droops under gravity
            px = math.cos(a) * L * t * math.cos(up)
            py = math.sin(a) * L * t * math.cos(up)
            pz = L * t * math.sin(up) - 1.6 * (t ** 2) * (1.2 - up)
            return Vector((px, py, pz))
        for s_ in range(2, seg):
            t = s_ / seg
            p0 = rach(t); p1 = rach(min(1, t + 1 / seg))
            tang = (p1 - p0).normalized()
            side = tang.cross(Vector((0, 0, 1))).normalized()
            ll = 0.75 * math.sin(min(1, t * 1.15) * math.pi) + 0.12     # leaflet length
            for sg in (-1, 1):
                d = (side * sg * 0.85 + tang * 0.45 + Vector((0, 0, -0.55 - 0.4 * t))).normalized()
                tip = p0 + d * ll
                w = 0.035
                k = len(verts)
                verts += [tuple(p0 - tang * w), tuple(p0 + tang * w), tuple(tip + tang * 0.006), tuple(tip - tang * 0.006)]
                faces.append((k, k + 1, k + 2, k + 3))
        # rachis strip
        k0 = len(verts)
        for s_ in range(seg + 1):
            p = rach(s_ / seg)
            verts += [tuple(p + Vector((0, 0, 0.025))), tuple(p - Vector((0, 0, 0.025)))]
            if s_:
                kk = k0 + 2 * (s_ - 1)
                faces.append((kk, kk + 1, kk + 3, kk + 2))
        f = mesh_from('frond', verts, faces, lm, False)
        f.location = top
    # coconuts
    nut = mat_noisy(f'nut{seed_}', (0.2, 0.17, 0.05), (0.35, 0.3, 0.08), 4, 0.5, 0.1, 10)
    for k in range(rr.randint(3, 7)):
        aa = rr.uniform(0, 6.28)
        sphere('coconut', 0.12, (top.x + math.cos(aa) * 0.22, top.y + math.sin(aa) * 0.22, top.z - 0.25 - rr.uniform(0, .2)), nut, 2)


def bush(loc, r=0.7, leaves=4000, seed_=0, palette=None):
    rr = random.Random(seed_)
    palette = palette or ((0.03, 0.08, 0.015), (0.12, 0.2, 0.035))
    lm = mat_leaf(f'bush{seed_}', *palette)
    lf = leaf_mesh('broad', 0.06)
    c = sphere('bush', r, (loc[0], loc[1], loc[2] + r * 0.6), None, 2)
    c.scale = (rr.uniform(1, 1.5), rr.uniform(0.8, 1.2), 0.75)
    scatter_leaves(c, leaves, lf, lm, 1.0, 0.5, seed_)
    core = sphere('bcore', r * 0.85, c.location, mat_basic(f'bcore{seed_}', (0.02, 0.04, 0.01), 0.9), 2)
    core.scale = c.scale


def grass_patch(name, sx, sy, loc, density=900, length=0.06, palette=None, mat_ground_=None, seed_=0, rot_z=0.0):
    """Lawn with real hair strands. density = strands per m2."""
    g = plane(name, sx, sy, loc, mat_ground_, (0, 0, rot_z))
    palette = palette or ((0.06, 0.12, 0.02), (0.2, 0.28, 0.06))
    m, nt, b = _bsdf(name + 'hair')
    # Principled Hair is costly; use principled with random colour per strand
    hi = nt.nodes.new('ShaderNodeHairInfo')
    r = _ramp(nt, hi.outputs['Random'], [(0, palette[0]), (1, palette[1])])
    # lighter tips
    tip = _ramp(nt, hi.outputs['Intercept'], [(0, (0.4, 0.4, 0.4)), (1, (1.15, 1.1, 0.9))])
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1
    nt.links.new(r.outputs['Color'], mul.inputs[6]); nt.links.new(tip.outputs['Color'], mul.inputs[7])
    nt.links.new(mul.outputs[2], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.5
    g.data.materials.append(m)
    ps = g.modifiers.new('grass', 'PARTICLE_SYSTEM').particle_system
    st = ps.settings
    st.type = 'HAIR'; st.use_advanced_hair = False
    st.count = int(sx * sy * density)
    st.hair_length = length
    st.material = 2
    st.child_type = 'NONE'
    st.use_hair_bspline = True
    st.factor_random = 0.0
    st.brownian_factor = 0.0
    st.normal_factor = 1.0
    st.use_rotations = False
    st.child_type = 'INTERPOLATED'
    st.child_percent = 1
    st.rendered_child_count = 5
    st.child_parting_factor = 0
    st.clump_factor = 0.0
    st.roughness_1 = 0.02
    st.roughness_endpoint = 0.015
    st.child_length = 1.0
    st.child_length_threshold = 0.4
    st.length_random = 0.6 if hasattr(st, 'length_random') else 0
    st.root_radius = 1.0
    st.radius_scale = 0.003
    st.tip_radius = 0.0
    st.display_step = 3
    st.render_step = 3
    st.hair_length = length
    ps.seed = seed_
    return g

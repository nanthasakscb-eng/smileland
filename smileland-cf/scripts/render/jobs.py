"""30 demo listings in Isan + render jobs. Writes jobs.json (used by render_job.py and the seed builder)."""
import json, random

# (no, province_code, deal, type, variant, extra)
L = [
    (1, 34, 'sale', 'house', 'modern1', {}),
    (2, 40, 'sale', 'house', 'modern2', {}),
    (3, 30, 'sale', 'house', 'modern2', {}),
    (4, 41, 'sale', 'house', 'modern1', {}),
    (5, 34, 'sale', 'house', 'town', {}),
    (6, 40, 'rent', 'house', 'town', {}),
    (7, 30, 'sale', 'condo', 'condo', {}),
    (8, 40, 'sale', 'condo', 'condo', {}),
    (9, 41, 'rent', 'condo', 'condo', {}),
    (10, 40, 'rent', 'condo', 'condo', {}),
    (11, 34, 'rent', 'condo', 'condo', {}),
    (12, 30, 'sale', 'land', 'grass', {}),
    (13, 34, 'sale', 'land', 'paddy', {}),
    (14, 45, 'sale', 'land', 'paddy', {}),
    (15, 44, 'sale', 'house', 'modern1', {}),
    (16, 46, 'sale', 'house', 'stilt', {}),
    (17, 47, 'sale', 'house', 'modern1', {}),
    (18, 48, 'sale', 'house', 'modern2', {}),
    (19, 43, 'sale', 'land', 'laterite', {}),
    (20, 49, 'sale', 'land', 'grass', {}),
    (21, 31, 'sale', 'house', 'modern1', {}),
    (22, 32, 'sale', 'land', 'paddy', {}),
    (23, 33, 'sale', 'house', 'stilt', {}),
    (24, 35, 'sale', 'land', 'laterite', {}),
    (25, 36, 'rent', 'house', 'modern1', {}),
    (26, 37, 'sale', 'land', 'paddy', {}),
    (27, 38, 'sale', 'land', 'grass', {}),
    (28, 39, 'sale', 'house', 'stilt', {}),
    (29, 42, 'rent', 'house', 'modern2', {}),
    (30, 41, 'sale', 'land', 'laterite', {}),
]

VIEWS = {
    'modern1': ['ext_a', 'ext_b', 'living', 'bedroom'],
    'modern2': ['ext_a', 'ext_b', 'living', 'bedroom'],
    'town': ['ext_a', 'ext_b', 'living', 'bedroom'],
    'stilt': ['ext_a', 'ext_b'],
    'condo': ['ext_a', 'living', 'bedroom'],
    'grass': ['v1', 'v2'],
    'laterite': ['v1', 'v2'],
    'paddy': ['v1', 'v2'],
}

jobs, listings = [], []
for no, prov, deal, typ, var, ex in L:
    rr = random.Random(1000 + no)
    lid = f'n{no:02d}'
    p = {
        'no': no, 'id': lid, 'province': prov, 'deal': deal, 'type': typ, 'variant': var, 'seed': 1000 + no,
        'wall': rr.choice([(0.62, 0.57, 0.47), (0.66, 0.63, 0.56), (0.58, 0.6, 0.6), (0.65, 0.6, 0.5), (0.7, 0.68, 0.64), (0.56, 0.5, 0.42)]),
        'trim': rr.choice([(0.74, 0.73, 0.71), (0.7, 0.69, 0.66), (0.3, 0.3, 0.32)]) if var != 'town' else (0.74, 0.73, 0.71),
        'roof': rr.choice(['tile_grey', 'tile_grey', 'tile_brown', 'tile_red', 'tile_green']) if var.startswith('modern') else ('metal_zinc' if var == 'stilt' and rr.random() < 0.5 else rr.choice(['metal_red', 'metal_blue', 'metal_rust']) if var == 'stilt' else 'tile_grey'),
        'W': round(rr.uniform(9.5, 12.5), 2), 'D': round(rr.uniform(7.5, 9.5), 2),
        'sun_elev': round(rr.uniform(32, 58), 1), 'sun_rot': round(rr.uniform(195, 240), 1),
        'cond_view': rr.choice(['city', 'trees']),
    }
    p['images'] = [f'{lid}{v}' for v in VIEWS[var]]
    listings.append(p)
    for v in VIEWS[var]:
        jobs.append({'listing': lid, 'view': v, 'out': f'{lid}{v}'})

json.dump({'listings': listings, 'jobs': jobs}, open('/tmp/claude-0/blend/jobs.json', 'w'), ensure_ascii=False, indent=1)
print(len(listings), 'listings', len(jobs), 'jobs')

import json, re, sys, os
from PIL import Image, ImageDraw
ROOT='/home/claude/smileland-cf'
L=json.load(open(f'{ROOT}/src/data/isan-landmarks.json')); C=json.load(open(f'{ROOT}/src/data/isan-covers.json'))
ub=json.loads(re.search(r'=\s*(\[.*\])', open(f'{ROOT}/src/data/ubon-images.ts').read(), re.S).group(1))
UB={str(i+1):v for i,v in enumerate(ub)}
# (code, slug, provTh, [(src, key, caption, fy)])
SEL=[
(30,'nakhon-ratchasima','นครราชสีมา',[('C','nakhon-ratchasima','เจ้าหน้าที่อุทยานแห่งชาติเขาใหญ่',.5),('L','nakhon-ratchasima:1','อุทยานประวัติศาสตร์พิมาย',.5),('L','nakhon-ratchasima:0','อนุสาวรีย์ท้าวสุรนารี',.3)]),
(31,'buri-ram','บุรีรัมย์',[('L','buri-ram:0','อุทยานประวัติศาสตร์พนมรุ้ง',.6),('L','buri-ram:1','ปราสาทเมืองต่ำ',.5),('L','buri-ram:2','วนอุทยานเขากระโดง',.5)]),
(32,'surin','สุรินทร์',[('L','surin:0','ปราสาทศีขรภูมิ',.5),('L','surin:1','ปราสาทบ้านพลวง',.55),('L','surin:2','ปราสาทภูมิโปน',.45)]),
(33,'si-sa-ket','ศรีสะเกษ',[('L','si-sa-ket:0','ปราสาทสระกำแพงใหญ่',.5),('L','si-sa-ket:3','วัดป่ามหาเจดีย์แก้ว (วัดล้านขวด)',.5),('C','si-sa-ket','แม่น้ำมูล อำเภอราษีไศล',.5)]),
(34,'ubon-ratchathani','อุบลราชธานี',[('U','1','ผาแต้ม',.5),('U','2','สามพันโบก',.5),('U','5','หอไตรวัดทุ่งศรีเมือง',.5)]),
(35,'yasothon','ยโสธร',[('L','yasothon:3','พระธาตุก่องข้าวน้อย',.4),('C','yasothon','วัดศรีธรรมาราม',.5),('L','yasothon:2','พระธาตุอานนท์ วัดมหาธาตุ',.3)]),
(36,'chaiyaphum','ชัยภูมิ',[('L','chaiyaphum:2','อุทยานแห่งชาติป่าหินงาม',.5),('L','chaiyaphum:3','อุทยานแห่งชาติไทรทอง',.5),('C','chaiyaphum','ทุ่งหญ้าและฝูงกวางยามเย็น',.5)]),
(37,'amnat-charoen','อำนาจเจริญ',[('L','amnat-charoen:0','พุทธอุทยานพระมงคลมิ่งเมือง',.35),('L','amnat-charoen:2','วัดพระเหลาเทพนิมิต',.5)]),
(38,'bueng-kan','บึงกาฬ',[('L','bueng-kan:1','ภูทอก',.45),('L','bueng-kan:7','หนองกุดทิง',.5),('L','bueng-kan:8','บึงโขงหลง',.5)]),
(39,'nong-bua-lam-phu','หนองบัวลำภู',[('L','nong-bua-lam-phu:0','วัดถ้ำกลองเพล',.5),('L','nong-bua-lam-phu:3','ถ้ำเอราวัณ',.5)]),
(40,'khon-kaen','ขอนแก่น',[('L','khon-kaen:5','เขื่อนอุบลรัตน์',.5),('L','khon-kaen:6','อุทยานแห่งชาติภูผาม่าน',.5),('L','khon-kaen:0','พระมหาธาตุแก่นนคร วัดหนองแวง',.3)]),
(41,'udon-thani','อุดรธานี',[('L','udon-thani:3','คำชะโนด',.5),('L','udon-thani:7','วัดโพธิสมภรณ์',.5),('L','udon-thani:1','อุทยานประวัติศาสตร์ภูพระบาท',.5)]),
(42,'loei','เลย',[('L','loei:0','ผาหล่มสัก ภูกระดึง',.5),('C','loei','หลังแป ภูกระดึง',.5),('L','loei:1','อุทยานแห่งชาติภูเรือ',.5)]),
(43,'nong-khai','หนองคาย',[('L','nong-khai:4','วัดผาตากเสื้อ',.5),('C','nong-khai','สกายวอล์กชมวิวแม่น้ำโขง',.5),('L','nong-khai:1','ศาลาแก้วกู่',.35)]),
(44,'maha-sarakham','มหาสารคาม',[('C','maha-sarakham','บรรยากาศเมืองมหาสารคาม',.5)]),
(45,'roi-et','ร้อยเอ็ด',[('L','roi-et:1','บึงพลาญชัย',.5),('L','roi-et:3','วัดบูรพาภิราม',.35),('L','roi-et:6','กู่กาสิงห์',.5)]),
(46,'kalasin','กาฬสินธุ์',[('L','kalasin:2','เขื่อนลำปาว',.5),('L','kalasin:3','สะพานเทพสุดา',.5),('L','kalasin:0','พิพิธภัณฑ์สิรินธร',.5)]),
(47,'sakon-nakhon','สกลนคร',[('L','sakon-nakhon:2','หนองหาร',.5),('L','sakon-nakhon:6','วัดป่าอุดมสมพร',.5)]),
(48,'nakhon-phanom','นครพนม',[('L','nakhon-phanom:0','วัดพระธาตุพนมวรมหาวิหาร',.5),('L','nakhon-phanom:1','พระธาตุเรณู',.5),('C','nakhon-phanom','บ้านลุงโฮ (บ้านโฮจิมินห์)',.5)]),
(49,'mukdahan','มุกดาหาร',[('L','mukdahan:1','อุทยานแห่งชาติภูผาเทิบ',.5)]),
]
mode=sys.argv[1] if len(sys.argv)>1 else 'sheet'
out_dir=f'{ROOT}/public/assets/hero/p'; os.makedirs(out_dir,exist_ok=True)
thumbs=[]; ts=[]
def meta(src,key):
    v = L[key] if src=='L' else C[key] if src=='C' else UB[key]
    return v
for code,slug,th,items in SEL:
    slides=[]
    for i,(src,key,cap,fy) in enumerate(items):
        v=meta(src,key)
        im=Image.open(ROOT+'/public'+v['image']).convert('RGB')
        W,H=im.size; h=int(W*9/16)
        if h<=H: y=int((H-h)*fy); im=im.crop((0,y,W,y+h))
        else: w=int(H*16/9); x=(W-w)//2; im=im.crop((x,0,x+w,H))
        base=f'{slug}-{i+1}'
        big=min(1280, im.width)
        sizes=[960] if big<1280 else [1280,960]
        if mode=='build':
            for s in sizes:
                im.resize((s,int(s*9/16)),Image.LANCZOS).save(f'{out_dir}/{base}-{s}.webp',quality=74)
        thumbs.append((f'{code} {cap}', im.resize((320,180))))
        lu=v.get('licenseUrl') or ''
        if lu and not lu.endswith('/'): lu+='/'
        slides.append(dict(src=f'/assets/hero/p/{base}', w=sizes[0], alt=f'{cap} จังหวัด{th}', caption=f'{cap} · {th}', by=v['artist'], url=v['source'], license=v['license'], licenseUrl=lu))
    ts.append((code,slides))
if mode=='sheet':
    cols=6; rows=(len(thumbs)+cols-1)//cols
    c=Image.new('RGB',(cols*320,rows*200),'white'); d=ImageDraw.Draw(c)
    for n,(t,i) in enumerate(thumbs):
        x=(n%cols)*320;y=(n//cols)*200; c.paste(i,(x,y)); d.text((x+4,y+182),t[:40].encode('ascii','ignore').decode() or str(n),fill='black')
    c.save(sys.argv[2],quality=80)
else:
    def q(s): return "'"+s.replace("\\","\\\\").replace("'","\\'")+"'"
    lines=["/** ภาพสถานที่ท่องเที่ยวประจำจังหวัด (หัวคู่มือจังหวัด) — ภาพจาก Wikimedia Commons ตามสัญญาอนุญาต CC เท่านั้น สร้างด้วย scripts/build-province-photos.py */","import type { PhotoSlide } from './photos';","","export const PROVINCE_SLIDES: Record<number, PhotoSlide[]> = {"]
    for code,slides in ts:
        lines.append(f"  {code}: [")
        for s in slides:
            lines.append(f"    {{ src: {q(s['src'])}, w: {s['w']}, alt: {q(s['alt'])}, caption: {q(s['caption'])}, credit: {{ by: {q(s['by'])}, url: {q(s['url'])}, license: {q(s['license'])}, licenseUrl: {q(s['licenseUrl'])} }} }},")
        lines.append("  ],")
    lines.append("};")
    open(f'{ROOT}/src/data/province-photos.ts','w').write("\n".join(lines)+"\n")
    print('written', sum(len(s) for _,s in ts))

import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const content=JSON.parse(readFileSync('src/data/travel-content.json','utf8'));
const known=new Set();for(const n of [0,40,80,120,160]){const j=JSON.parse(readFileSync(`research/place-photos/wiki-${n}.json`));for(const p of Object.values(j.query?.pages||{}))if(p.pageimage)known.add(p.title);}
const items=content.flatMap(a=>a.places.map((p,i)=>({key:a.slug+':'+i,slug:a.slug,index:i,name:p[0],province:a.name})));
items.push(...['น้ำตกแสงจันทร์','วัดทุ่งศรีเมือง','อุทยานแห่งชาติแก่งตะนะ'].map((name,i)=>({key:'ubon-ratchathani:'+([3,5,6][i]),slug:'ubon-ratchathani',index:[3,5,6][i],name,province:'อุบลราชธานี'})));
const photos=JSON.parse(readFileSync('src/data/isan-landmarks.json'));
const out='research/place-photos/discovered.json',found=existsSync(out)?JSON.parse(readFileSync(out)):{};
const clean=s=>s.replace(/[\s()–—-]/g,'').replace(/จังหวัด|อุทยานแห่งชาติ|วนอุทยาน|พิพิธภัณฑ์|พิพิธภัณฑสถานแห่งชาติ|วัด|ชุมชน|หมู่บ้าน|อำเภอ/g,'');
for(const item of items){
 if(photos[item.key]||known.has(item.name)||found[item.key])continue;
 const term=item.name.split(' ')[0];if(clean(term).length<3)continue;
 const path=`research/place-photos/search-${item.slug}-${item.index}.json`;
 let j;if(existsSync(path))j=JSON.parse(readFileSync(path));else{
 const u=new URL('https://th.wikipedia.org/w/api.php');u.search=new URLSearchParams({action:'query',generator:'search',gsrsearch:`intitle:"${term}"`,gsrnamespace:'0',gsrlimit:'5',prop:'pageimages',piprop:'name',pilicense:'free',format:'json'});
 const r=await fetch(u);if(!r.ok){console.log('STOP',r.status);break;}j=await r.json();writeFileSync(path,JSON.stringify(j,null,2));await new Promise(r=>setTimeout(r,1300));}
 const candidates=Object.values(j.query?.pages||{}).filter(p=>p.pageimage&&clean(p.title).includes(clean(term))&&!/logo|map|flag|seal|แผนที่|ตรา|ธง/i.test(p.pageimage));
 const matching=candidates.filter(p=>!p.title.includes('(')||p.title.includes(item.province));
 if(matching.length===1){const p=matching[0];found[item.key]={...item,title:p.title,file:p.pageimage};console.log(item.key,item.name,'=>',p.title,p.pageimage);writeFileSync(out,JSON.stringify(found,null,2));}
 else console.log('unresolved',item.key,item.name,candidates.map(p=>p.title).join('|'));
}
console.log('Additional candidates',Object.keys(found).length);

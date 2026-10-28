import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const path='src/data/isan-landmarks.json',photos=JSON.parse(readFileSync(path));
// Lead images may depict a nearby attraction; do not use those mismatches.
delete photos['chaiyaphum:1'];delete photos['buri-ram:7'];
const en=JSON.parse(readFileSync('research/place-photos/en-found.json'));
const commons=JSON.parse(readFileSync('research/place-photos/commons-candidates.json'));
for(const k of ['chaiyaphum:7','nakhon-ratchasima:2','maha-sarakham:7','loei:2','sakon-nakhon:8'])delete en[k];
for(const k of ['chaiyaphum:7','nakhon-ratchasima:3','maha-sarakham:6','maha-sarakham:7','sakon-nakhon:8','loei:2'])delete commons[k];
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
async function save(item,i){const m=i?.extmetadata,license=m?.LicenseShortName?.value||'';
 if(!i||!['image/jpeg','image/png'].includes(i.mime)||!/^CC BY(?:-SA)? [1-4]\.(?:0|5)$/.test(license)||!m.LicenseUrl?.value||i.width<500){console.log('skip',item.key,license);return;}
 const r=await fetch(i.thumburl||i.url);if(!r.ok){console.log('download failed',item.key,r.status);return;}const image=`/travel/places/${item.slug}-${item.index}.${i.mime==='image/png'?'png':'jpg'}`;writeFileSync('public'+image,Buffer.from(await r.arrayBuffer()));let artist=clean(m.Artist?.value);if(artist.includes('Supanut Arunoprayote'))artist='Supanut Arunoprayote';
 photos[item.key]={image,artist,license,licenseUrl:m.LicenseUrl.value,source:i.descriptionurl,title:item.file,description:clean(m.ImageDescription?.value),placeName:item.name,province:item.slug,placeIndex:item.index};console.log('import',item.key,item.name,item.file);writeFileSync(path,JSON.stringify(photos,null,2));}
for(const item of Object.values(commons))if(!photos[item.key])await save(item,item.info);
const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',titles:Object.values(en).map(x=>'File:'+x.file).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1200',format:'json'});
const r=await fetch(u);if(!r.ok)throw Error('Commons '+r.status);const j=await r.json();writeFileSync('research/place-photos/en-commons-reviewed.json',JSON.stringify(j,null,2));
for(const item of Object.values(en)){if(photos[item.key])continue;const p=Object.values(j.query?.pages||{}).find(p=>p.title.replaceAll('_',' ')==='File:'+item.file.replaceAll('_',' '));await save(item,p?.imageinfo?.[0]);}
writeFileSync(path,JSON.stringify(photos,null,2));console.log('Reviewed place photos',Object.keys(photos).length);

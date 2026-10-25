import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
const provinces=[
 ['kalasin','Kalasin Province'],['khon-kaen','Khon Kaen Province'],['chaiyaphum','Chaiyaphum Province'],
 ['nakhon-phanom','Nakhon Phanom Province'],['nakhon-ratchasima','Nakhon Ratchasima Province'],
 ['bueng-kan','Bueng Kan Province'],['buri-ram','Buriram Province'],['maha-sarakham','Maha Sarakham Province'],
 ['mukdahan','Mukdahan Province'],['yasothon','Yasothon Province'],['roi-et','Roi Et Province'],['loei','Loei Province'],
 ['si-sa-ket','Sisaket Province'],['sakon-nakhon','Sakon Nakhon Province'],['surin','Surin Province'],
 ['nong-khai','Nong Khai Province'],['nong-bua-lam-phu','Nong Bua Lamphu Province'],
 ['amnat-charoen','Amnat Charoen Province'],['udon-thani','Udon Thani Province'],
];
const out='src/data/isan-covers.json';const covers=existsSync(out)?JSON.parse(readFileSync(out,'utf8')):{};
mkdirSync('public/travel/covers',{recursive:true});mkdirSync('research/commons-covers',{recursive:true});
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
for(const [slug,category] of provinces){
 if(covers[slug]?.image&&existsSync('public'+covers[slug].image))continue;
 const get=async(category)=>{
  const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',generator:'categorymembers',gcmtitle:'Category:'+category,gcmtype:'file',gcmlimit:'100',prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1200',format:'json'});
  const r=await fetch(u);if(!r.ok){console.log(slug,r.status);return [];}
  const j=await r.json();writeFileSync('research/commons-covers/'+slug+'.json',JSON.stringify(j,null,2));
  return Object.values(j.query?.pages||{}).filter(p=>{const i=p.imageinfo?.[0];return i&&['image/jpeg','image/png'].includes(i.mime)&&i.extmetadata.LicenseShortName?.value==='CC BY 4.0'&&i.width>=800&&!/map|flag|logo|seal|locator|chart|diagram|แผนที่|ตรา|ธง/i.test(p.title)});
 };
 const items=await get(category);
 const p=items.sort((a,b)=>{const score=p=>{const i=p.imageinfo[0];return (i.width>i.height?3:0)+(/Supanut Arunoprayote/.test(i.extmetadata.Artist?.value||'')?2:0)};return score(b)-score(a)})[0];
 if(p){const i=p.imageinfo[0],m=i.extmetadata;const r=await fetch(i.thumburl||i.url);if(r.ok){const image='/travel/covers/'+slug+'.jpg';writeFileSync('public'+image,Buffer.from(await r.arrayBuffer()));let artist=clean(m.Artist?.value);if(artist.includes('Supanut Arunoprayote'))artist='Supanut Arunoprayote';covers[slug]={image,artist,license:'CC BY 4.0',licenseUrl:m.LicenseUrl.value,source:i.descriptionurl,title:clean(m.ObjectName?.value)||p.title,description:clean(m.ImageDescription?.value)};console.log(slug,p.title);}}
 if(!covers[slug]){covers[slug]=null;console.log(slug,'no eligible cover yet');}
 writeFileSync(out,JSON.stringify(covers,null,2));await new Promise(r=>setTimeout(r,1000));
}

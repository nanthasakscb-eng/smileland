import {readFileSync,writeFileSync} from 'node:fs';
const covers=JSON.parse(readFileSync('src/data/isan-covers.json','utf8'));
const names={'kalasin':'Kalasin','khon-kaen':'Khon Kaen','chaiyaphum':'Chaiyaphum','nakhon-phanom':'Nakhon Phanom','nakhon-ratchasima':'Nakhon Ratchasima','bueng-kan':'Bueng Kan','buri-ram':'Buriram','maha-sarakham':'Maha Sarakham','mukdahan':'Mukdahan','yasothon':'Yasothon','roi-et':'Roi Et','loei':'Loei','si-sa-ket':'Sisaket','sakon-nakhon':'Sakon Nakhon','surin':'Surin','nong-khai':'Nong Khai','nong-bua-lam-phu':'Nong Bua Lamphu','amnat-charoen':'Amnat Charoen','udon-thani':'Udon Thani'};
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
for(const [slug,name] of Object.entries(names)){
 if(covers[slug]&&!['bueng-kan','buri-ram','maha-sarakham','loei'].includes(slug))continue;
 const u=new URL('https://commons.wikimedia.org/w/api.php');
 u.search=new URLSearchParams({action:'query',generator:'search',gsrsearch:`deepcat:"${name} Province" incategory:"CC-BY-4.0" -map -logo -flag -NTPLC -specimen -football -airport`,gsrnamespace:'6',gsrlimit:'40',prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1200',format:'json'});
 const r=await fetch(u);if(!r.ok){console.log(slug,r.status);if(r.status===429)break;continue;}
 const j=await r.json();writeFileSync(`research/commons-covers/${slug}-search.json`,JSON.stringify(j,null,2));
 const pages=Object.values(j.query?.pages||{}).filter(p=>{const i=p.imageinfo?.[0];return i&&i.mime==='image/jpeg'&&i.width>=800&&i.extmetadata.LicenseShortName?.value==='CC BY 4.0'&&!/portrait|politic|military|aircraft|bus |train |railway|hospital|school|NTPLC|specimen|insect|butterfly|Naturalist|MNHN|Corbicula|Tepi|ข้าวเม่า|Esteghlal/i.test(p.title+' '+clean(i.extmetadata.ImageDescription?.value))});
 pages.sort((a,b)=>{const score=p=>{const i=p.imageinfo[0];return (i.width>i.height?5:0)+(/temple|wat |park|phra|phu |chedi|view|lake|prang|mekong/i.test(p.title)?10:0)};return score(b)-score(a)});
 const p=pages[0];if(p){const i=p.imageinfo[0],m=i.extmetadata;const img=await fetch(i.thumburl||i.url);if(img.ok){const image=`/travel/covers/${slug}.jpg`;writeFileSync('public'+image,Buffer.from(await img.arrayBuffer()));covers[slug]={image,artist:clean(m.Artist?.value),license:'CC BY 4.0',licenseUrl:m.LicenseUrl.value,source:i.descriptionurl,title:clean(m.ObjectName?.value)||p.title,description:clean(m.ImageDescription?.value)};writeFileSync('src/data/isan-covers.json',JSON.stringify(covers,null,2));console.log(slug,JSON.stringify(covers[slug]));}}else console.log(slug,'no matches');
 await new Promise(r=>setTimeout(r,1500));
}

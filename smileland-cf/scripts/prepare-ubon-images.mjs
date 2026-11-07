import { mkdirSync, writeFileSync } from 'node:fs';
const titles = ['Phataem 01.jpg','Sam Phan Bok 20251226.jpg','Wat Sirindhorn Wararam Phu Phrao 20251227 (II).jpg','Wat Phra That Nong Bua - Feb 2026.jpg','Ho Trai, Wat Thung Si Muang 20251227.jpg','Tana rapid - panoramio.jpg','SaoChaLiang 01.jpg','Sirindhorn Reservoir.jpg','Cha Na Dai Cliff 20251226.jpg','Interior of Wat Maha Wanaram.jpg'];
const u=new URL('https://commons.wikimedia.org/w/api.php');
u.search=new URLSearchParams({action:'query',titles:titles.map(t=>'File:'+t).join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1200',format:'json'});
const response=await fetch(u);if(!response.ok)throw Error(response.status);
const j=await response.json();
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#039;/g,"'").trim();
mkdirSync('src/data',{recursive:true});mkdirSync('public/travel/ubon',{recursive:true});
const images=[];
for(const [index,title] of titles.entries()){
 const p=Object.values(j.query.pages).find(p=>p.title==='File:'+title);if(!p?.imageinfo)throw Error('Missing '+title);
 const i=p.imageinfo[0],m=i.extmetadata;
 if(m.LicenseShortName?.value!=='CC BY 4.0')throw Error('Only CC BY 4.0 is allowed: '+title);
 const image=i.thumburl||i.url;const r=await fetch(image);if(!r.ok)throw Error(title+' image '+r.status);
 writeFileSync('public/travel/ubon/'+(index+1)+'.jpg',Buffer.from(await r.arrayBuffer()));
 const artist=clean(m.Artist?.value);
 images.push({image:'/travel/ubon/'+(index+1)+'.jpg',source:i.descriptionurl,artist:artist.includes('Supanut Arunoprayote')?'Supanut Arunoprayote':artist,license:clean(m.LicenseShortName?.value),licenseUrl:m.LicenseUrl?.value||i.descriptionurl,title});
 console.log(index+1,title,clean(m.LicenseShortName?.value));
 await new Promise(r=>setTimeout(r,700));
}
writeFileSync('src/data/ubon-images.ts','// Photo credits retrieved from Wikimedia Commons. Display framing may crop images.\nexport const ubonImages = '+JSON.stringify(images,null,2)+';\n');

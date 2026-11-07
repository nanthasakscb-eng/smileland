import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const path='src/data/ubon-images.ts';
const raw=readFileSync(path,'utf8');
const images=JSON.parse(raw.slice(raw.indexOf('=')+1).trim().replace(/;$/,''));
const replacements=new Map([[0,'Pha Taem Cave Paintings 20251226.jpg'],[7,'World’s largest hydro-floating solar farm experiment1.jpg'],[9,'Phra Wihan, Wat Maha Wanaram 20251227.jpg']]);
const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',titles:[...replacements.values()].map(t=>'File:'+t).join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1200',format:'json'});
const response=await fetch(u);if(!response.ok)throw Error(response.status);const j=await response.json();
const clean=s=>(s||'').replace(/<[^>]*>/g,'').trim();
for(const [index,title] of replacements){
 const p=Object.values(j.query.pages).find(p=>p.title==='File:'+title);const photo=p?.imageinfo?.[0];
 if(photo?.extmetadata.LicenseShortName?.value!=='CC BY 4.0')throw Error('License not allowed: '+title);
 const r=await fetch(photo.thumburl||photo.url);if(!r.ok)throw Error(r.status);
 writeFileSync(`public/travel/ubon/${index+1}.jpg`,Buffer.from(await r.arrayBuffer()));
 let artist=clean(photo.extmetadata.Artist?.value);if(artist.includes('Supanut Arunoprayote'))artist='Supanut Arunoprayote';
 images[index]={image:`/travel/ubon/${index+1}.jpg`,source:photo.descriptionurl,artist,license:'CC BY 4.0',licenseUrl:photo.extmetadata.LicenseUrl.value,title};
}
for(let index=0;index<images.length;index++){
 if(images[index].license==='CC BY 4.0')continue;
 images[index]={image:'',source:'',artist:'',license:'',licenseUrl:'',title:''};
 // Remove only the generated article-photo assets belonging to this workspace.
 for(const directory of ['public/travel/ubon','travel-release/public/travel/ubon']){
  const target=resolve(directory,`${index+1}.jpg`);if(!target.startsWith(resolve(directory)+'\\'))throw Error('Invalid target');
  if(existsSync(target))unlinkSync(target);
 }
 console.log(`Place ${index+1}: photo withheld pending an eligible CC BY 4.0 image.`);
}
writeFileSync(path,'// Only Wikimedia Commons photos licensed CC BY 4.0 are displayed.\nexport const ubonImages = '+JSON.stringify(images,null,2)+';\n');

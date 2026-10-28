import { mkdirSync, writeFileSync } from 'node:fs';
const categories=['Pha Taem National Park','Wat Phra That Nong Bua','Kaeng Tana National Park','Sirindhorn Dam','Wat Maha Wanaram'];
const all=[];
for(const cat of categories){
 const u=new URL('https://commons.wikimedia.org/w/api.php');
 u.search=new URLSearchParams({action:'query',generator:'categorymembers',gcmtitle:'Category:'+cat,gcmtype:'file',gcmlimit:'100',prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:'1200',format:'json'});
 const r=await fetch(u);if(!r.ok)throw Error(cat+' '+r.status);const j=await r.json();
 const items=Object.values(j.query?.pages||{}).filter(p=>p.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value==='CC BY 4.0').map(p=>({title:p.title,...p.imageinfo[0]}));
 all.push({category:cat,items});
 console.log(JSON.stringify({category:cat,matches:items.map(p=>({title:p.title,artist:p.extmetadata.Artist?.value?.replace(/<[^>]*>/g,'').slice(0,120),description:p.extmetadata.ImageDescription?.value?.replace(/<[^>]*>/g,'').slice(0,170)}))}));
}
mkdirSync('research',{recursive:true});writeFileSync('research/ubon-ccby-only.json',JSON.stringify(all,null,2));

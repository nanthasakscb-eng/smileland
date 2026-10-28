import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
const plans=[
 ['kalasin',0,'Sirindhorn Museum'],['kalasin',4,'Wat Wang Kham'],
 ['khon-kaen',0,'Wat Nong Wang'],['khon-kaen',2,'Wat Chetiyaphum'],
 ['chaiyaphum',2,'Pa Hin Ngam National Park'],['chaiyaphum',4,'Tat Ton National Park'],
 ['nakhon-phanom',0,'Wat Phra That Phanom'],['nakhon-phanom',1,'Phra That Renu'],
 ['nakhon-ratchasima',1,'Phimai Historical Park'],['nakhon-ratchasima',4,'Khao Yai National Park'],
 ['bueng-kan',0,'Hin Sam Wan'],['bueng-kan',1,'Wat Phu Tok'],
 ['buri-ram',0,'Phanom Rung Historical Park'],['buri-ram',1,'Prasat Muang Tam'],
 ['maha-sarakham',0,'Phra That Na Dun'],['maha-sarakham',0,'Phrathat Na Dun'],
 ['mukdahan',0,'Wat Roi Phra Phutthabat Phu Manorom'],['mukdahan',1,'Phu Pha Thoep National Park'],
 ['yasothon',3,'Phra That Kong Khao Noi'],['yasothon',0,'Phaya Khan Khak Museum'],
 ['roi-et',2,'Phra Maha Chedi Chai Mongkhon'],['roi-et',3,'Wat Buraphaphiram'],
 ['loei',0,'Phu Kradueng National Park'],['loei',6,'Phra That Si Song Rak'],
 ['si-sa-ket',3,'Wat Pa Maha Chedi Kaew'],['si-sa-ket',0,'Prasat Sa Kamphaeng Yai'],
 ['sakon-nakhon',0,'Wat Phra That Choeng Chum'],['sakon-nakhon',3,'Tha Rae'],
 ['surin',0,'Prasat Sikhoraphum'],['surin',1,'Prasat Ban Phluang'],
 ['nong-khai',0,'Wat Pho Chai'],['nong-khai',1,'Sala Keoku'],
 ['nong-bua-lam-phu',0,'Wat Tham Klong Phen'],['nong-bua-lam-phu',3,'Tham Erawan'],
 ['amnat-charoen',0,'Phra Mongkhon Ming Mueang'],['amnat-charoen',2,'Wat Phra Lao Thep Nimit'],
 ['udon-thani',0,'Ban Chiang National Museum'],['udon-thani',1,'Phu Phra Bat Historical Park'],
];
const provinces=JSON.parse(readFileSync('src/data/travel-content.json','utf8'));
const path='src/data/isan-landmarks.json';const photos=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{};
mkdirSync('public/travel/covers',{recursive:true});mkdirSync('research/commons-landmarks',{recursive:true});
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
for(const [slug,index,category] of plans){
 const key=slug+':'+index;if(photos[key]?.image)continue;
 const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',generator:'categorymembers',gcmtitle:'Category:'+category,gcmtype:'file',gcmlimit:'100',prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1200',format:'json'});
 const r=await fetch(u);if(!r.ok){console.log(slug,r.status);if(r.status===429){console.log('Rate limited; stop and retry later.');break;}continue;}const j=await r.json();
 writeFileSync('research/commons-landmarks/'+slug+'-'+index+'.json',JSON.stringify(j,null,2));
 const items=Object.values(j.query?.pages||{}).filter(p=>{const i=p.imageinfo?.[0];return i&&['image/jpeg','image/png'].includes(i.mime)&&i.extmetadata.LicenseShortName?.value==='CC BY 4.0'&&i.width>=800&&!/map|flag|logo|seal|locator|chart|diagram/i.test(p.title)});
 const p=items.sort((a,b)=>{const score=p=>{const i=p.imageinfo[0];return (i.width>i.height?3:0)+(/Supanut Arunoprayote/.test(i.extmetadata.Artist?.value||'')?2:0)};return score(b)-score(a)})[0];
 if(p){const i=p.imageinfo[0],m=i.extmetadata;const r=await fetch(i.thumburl||i.url);if(r.ok){const image=`/travel/covers/${slug}-${index}.jpg`;writeFileSync('public'+image,Buffer.from(await r.arrayBuffer()));let artist=clean(m.Artist?.value);if(artist.includes('Supanut Arunoprayote'))artist='Supanut Arunoprayote';const place=provinces.find(p=>p.slug===slug).places[index];photos[key]={image,artist,license:'CC BY 4.0',licenseUrl:m.LicenseUrl.value,source:i.descriptionurl,title:clean(m.ObjectName?.value)||p.title,description:clean(m.ImageDescription?.value),placeName:place[0],province:slug,placeIndex:index};console.log(key,p.title);}}
 writeFileSync(path,JSON.stringify(photos,null,2));await new Promise(r=>setTimeout(r,800));
}

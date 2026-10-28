import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const names={
 'kalasin':['Sirindhorn Museum','Phu Faek','Lam Pao','Thepsuda','Wat Wang Kham','Ban Phon','Phu Po','Phra That Yakhu','Wat Phutthawat','Pha Sawoei'],
 'khon-kaen':['Wat Nong Wang','Bueng Kaen Nakhon','Phra That Kham Kaen','Phu Wiang Dinosaur Museum','Phu Wiang National Park','Ubol Ratana','Phu Pha Man','Wat Chai Si','Prasat Pueai Noi','Chonnabot'],
 'chaiyaphum':['Mo Hin Khao','Phu Laen Kha','Pa Hin Ngam','Sai Thong National Park','Tat Ton National Park','Phra That Nong Sam Muen','Prang Ku Chaiyaphum','Phu Khiao','Chulabhorn Dam','Pha Koeng'],
 'nakhon-phanom':['Wat Phra That Phanom','Phra That Renu','Phra That Tha Uthen','Phra That Prasit','Phra That Si Khun','Phra That Maha Chai','Si Sattanakharat','Vietnamese Memorial Clock Tower','Saint Anna Nong Saeng','Ho Chi Minh Nakhon Phanom'],
 'nakhon-ratchasima':['Thao Suranari','Phimai Historical Park','Phimai National Museum','Sai Ngam','Khao Yai','Lam Takhong','Khao Yai Thiang','Khao Phaeng Ma','Jim Thompson Farm','Wat Sala Loi'],
 'bueng-kan':['Hin Sam Wan','Wat Phu Tok','Naka Cave','Tham Phra Waterfall','Chet Si Waterfall','Chanaen Waterfall','Wat Ahong','Kud Ting','Bueng Khong Long','Wat Sawang Arom Bueng Kan'],
 'buri-ram':['Phanom Rung','Prasat Muang Tam','Khao Kradong','Wat Khao Angkhan','Chang Arena','Chang International Circuit','Huai Chorakhemak','Huai Talat','Na Pho silk','Ban Kruat kiln'],
 'maha-sarakham':['Phra That Na Dun','Ku Santarat','Isan Museum Maha Sarakham','Dun Lamphan','Kosamphi','Wat Phuttha Mongkhon','Wat Suwannawat','Kae Dam','Nong Khuean Chang','Ku Maha That'],
 'mukdahan':['Phu Manorom','Phu Pha Thoep','Ho Kaeo Mukdahan','Indochina Market Mukdahan','Wat Si Mongkhon Tai','Second Thai Lao Friendship Bridge','Kaeng Kabao','Song Khon Church','Ban Phu Mukdahan','Tat Ton Mukdahan'],
 'yasothon':['Phaya Khan Khak','Ban Sing Tha','Wat Mahathat Yasothon','Phra That Kong Khao Noi','Wat Si Thammaram','Phaya Thaen','Si Than pillow','Thung Nang Ok','Wat Phra Phutthabat Yasothon','Bung Moei'],
 'roi-et':['Wot Tower','Bueng Phalan Chai','Phra Maha Chedi Chai Mongkhon','Wat Buraphaphiram','Wat Klang Ming Mueang','Roi Et National Museum','Ku Ka Sing','Ku Phra Kona','Wai Luem','Chedi Maha Mongkhon Bua'],
 'loei':['Phu Kradueng','Phu Ruea','Phu Luang','Chiang Khan Walking Street','Kaeng Khut Khu','Phu Thok Chiang Khan','Phra That Si Song Rak','Wat Neramit Wipatsana','Wat Phon Chai','Suan Hin Pha Ngam'],
 'si-sa-ket':['Sa Kamphaeng Yai','Sa Kamphaeng Noi','Prang Ku Sisaket','Wat Pa Maha Chedi Kaew','Wat Phrai Phatthana','Wat Maha Phuttharam','Wat Phra That Suphannahong','Sisaket Aquarium','Samrong Kiat Waterfall','Pha Mo I Daeng'],
 'sakon-nakhon':['Phra That Choeng Chum','Wat Tham Pha Daen','Nong Han Sakon','Tha Rae','Saint Michael Cathedral Tha Rae','Wat Pa Sutthawat','Wat Pa Udom Somphon','Phra That Phu Phek','Phu Phan National Park','Don Koi'],
 'surin':['Prasat Sikhoraphum','Prasat Ban Phluang','Prasat Phum Pon','Surin National Museum','Tha Sawang','Ban Ta Klang','Wat Burapharam','Phanom Sawai','Elephant Study Centre','Khwao Sinarin'],
 'nong-khai':['Wat Pho Chai','Sala Keoku','Tha Sadet','Phra That Bang Phuan','Wat Pha Tak Suea','Phu Huai Isan','Phan Khot Saen Khrai','Wat Si Chomphu Ong Tue','Wat Hin Mak Peng','First Thai Lao Friendship Bridge'],
 'nong-bua-lam-phu':['Wat Tham Klong Phen','Shell Fossil Museum Nong Bua','Phu Phan Noi','Erawan Cave','Wat Tham Suwannakhuha','Tao To Waterfall','Naresuan Nong Bua Lamphu','Phu Kao Phu Phan Kham','Phu Pha Ya','Kut Hae'],
 'amnat-charoen':['Phra Mongkhon Ming Mueang','Wat Tham Saeng Phet','Wat Phra Lao Thep Nimit','Phuttha Utthayan Reservoir','Huai Si Tho','Phu Sing Phu Pha Phueng','Ban Kham Phra','Sang Tho','Wat Pho Sila','Don Chao Pu'],
 'udon-thani':['Ban Chiang National Museum','Phu Phra Bat','Red Lotus Sea','Kham Chanot','Nong Prachak','Udon Thani Museum','Thai Chinese Cultural Center Udon','Wat Phothisomphon','Wat Pa Ban Tat','Phra Phutthabat Bua Bok'],
 'ubon-ratchathani':['Pha Taem','Sam Phan Bok','Wat Sirindhorn Wararam','Wat Phra That Nong Bua','Wat Thung Si Mueang','Kaeng Tana','Sao Chaliang','Sirindhorn Dam','Cha Na Dai','Wat Maha Wanaram'],
};
if(process.argv.includes('--export-names')){writeFileSync('research/place-photos/english-names.json',JSON.stringify(names,null,2));process.exit(0);}
const data=JSON.parse(readFileSync('src/data/travel-content.json','utf8'));
const registry='src/data/isan-landmarks.json',photos=JSON.parse(readFileSync(registry,'utf8'));
const items=Object.entries(names).flatMap(([slug,places])=>places.map((term,index)=>({key:slug+':'+index,slug,index,term,name:data.find(a=>a.slug===slug)?.places[index][0]||term}))).filter(x=>!photos[x.key]&&!(x.slug==='ubon-ratchathani'&&![3,5,6].includes(x.index)));
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9ก-๙]/g,'');
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
const candidates={};
for(let start=0;start<items.length;start+=8){
 const group=items.slice(start,start+8),path=`research/place-photos/commons-phrases-${start}.json`;
 let j;if(existsSync(path))j=JSON.parse(readFileSync(path));else{const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',generator:'search',gsrsearch:group.map(x=>`"${x.term}"`).join(' OR '),gsrnamespace:'6',gsrlimit:'50',prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1200',format:'json'});const r=await fetch(u);if(!r.ok){console.log('STOP',r.status);break;}j=await r.json();writeFileSync(path,JSON.stringify(j,null,2));}
 for(const item of group){const pages=Object.values(j.query?.pages||{}).filter(p=>{const i=p.imageinfo?.[0],m=i?.extmetadata;return normalize(p.title).includes(normalize(item.term))&&i&&['image/jpeg','image/png'].includes(i.mime)&&i.width>=600&&/^CC BY(?:-SA)? [1-4]\.(?:0|5)$/.test(m.LicenseShortName?.value||'')&&!/map|flag|logo|portrait|specimen|inaturalist|dorsal|ventral/i.test(p.title)});pages.sort((a,b)=>{const score=p=>{const i=p.imageinfo[0];return (i.width>i.height?10:0)+(/Supanut Arunoprayote/.test(i.extmetadata.Artist?.value||'')?5:0)};return score(b)-score(a)});if(pages.length){const p=pages[0],i=p.imageinfo[0];candidates[item.key]={...item,file:p.title,info:i};console.log('candidate',item.key,item.name,p.title,clean(i.extmetadata.ImageDescription?.value).slice(0,170));}else console.log('missing',item.key,item.name);}
 writeFileSync('research/place-photos/commons-candidates.json',JSON.stringify(candidates,null,2));await new Promise(r=>setTimeout(r,2500));
}

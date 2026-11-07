import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
const articles=JSON.parse(readFileSync('src/data/travel-content.json','utf8'));
const aliases={
 'พระมหาธาตุแก่นนคร วัดหนองแวง':'วัดหนองแวง (จังหวัดขอนแก่น)', 'พิพิธภัณฑ์ไดโนเสาร์ภูเวียง':'พิพิธภัณฑ์ไดโนเสาร์ภูเวียง',
 'ผาหัวนาค อุทยานแห่งชาติภูแลนคา':'อุทยานแห่งชาติภูแลนคา','ทุ่งดอกกระเจียว อุทยานแห่งชาติป่าหินงาม':'อุทยานแห่งชาติป่าหินงาม',
 'เมืองฟ้าแดดสงยางและพระธาตุยาคู':'พระธาตุยาคู','วัดพุทธาวาส ภูสิงห์':'วัดพุทธาวาส (จังหวัดกาฬสินธุ์)',
 'หอนาฬิกาเวียดนามอนุสรณ์และย่านเมืองเก่า':'หอนาฬิกาเวียดนามอนุสรณ์','บ้านลุงโฮและอนุสรณ์สถานโฮจิมินห์ บ้านนาจอก':'บ้านนาจอก',
 'อุทยานแห่งชาติเขาใหญ่ ฝั่งปากช่อง':'อุทยานแห่งชาติเขาใหญ่','หินสามวาฬ ภูสิงห์':'หินสามวาฬ','ภูทอก วัดเจติยาคีรีวิหาร':'วัดเจติยาคีรีวิหาร',
 'ถ้ำนาคา อุทยานแห่งชาติภูลังกา':'ถ้ำนาคา','วัดอาฮงศิลาวาสและแก่งอาฮง':'วัดอาฮงศิลาวาส','วัดสว่างอารมณ์ วัดถ้ำศรีธน':'วัดสว่างอารมณ์ (จังหวัดบึงกาฬ)',
 'พระพุทธรูปยืนมงคล วัดพุทธมงคล':'วัดพุทธมงคล (จังหวัดมหาสารคาม)','พระพุทธรูปมิ่งเมือง วัดสุวรรณาวาส':'วัดสุวรรณาวาส (จังหวัดมหาสารคาม)',
 'กู่มหาธาตุ บ้านเขวา':'กู่มหาธาตุ (จังหวัดมหาสารคาม)','สะพานมิตรภาพไทย–ลาว แห่งที่ 2 จุดชมฝั่งมุกดาหาร':'สะพานมิตรภาพไทย–ลาว แห่งที่ 2',
 'เมืองเก่าบ้านสิงห์ท่า':'บ้านสิงห์ท่า','พระธาตุอานนท์ วัดมหาธาตุ':'วัดมหาธาตุ (จังหวัดยโสธร)',
 'วัดป่ามหาเจดีย์แก้ว วัดล้านขวด':'วัดป่ามหาเจดีย์แก้ว','ผามออีแดง อุทยานแห่งชาติเขาพระวิหาร':'ผามออีแดง',
 'วัดป่าสุทธาวาสและพิพิธภัณฑ์หลวงปู่มั่น':'วัดป่าสุทธาวาส','วัดป่าอุดมสมพรและพิพิธภัณฑ์อาจารย์ฝั้น':'วัดป่าอุดมสมพร',
 'พิพิธภัณฑ์ผีตาโขน วัดโพนชัย':'วัดโพนชัย','ภูทอก เชียงคาน':'ภูทอก (จังหวัดเลย)',
 'อุทยานแห่งชาติภูเก้า–ภูพานคำ ฝั่งหนองบัวลำภู':'อุทยานแห่งชาติภูเก้า–ภูพานคำ',
 'พุทธอุทยานและพระมงคลมิ่งเมือง':'พระมงคลมิ่งเมือง','ทะเลบัวแดง หนองหานกุมภวาปี':'ทะเลบัวแดง','คำชะโนด วัดศิริสุทโธ':'คำชะโนด',
 'จุดชมสะพานมิตรภาพไทย–ลาว แห่งที่ 1':'สะพานมิตรภาพไทย–ลาว แห่งที่ 1',
};
const items=articles.flatMap(a=>a.places.map((p,i)=>({key:a.slug+':'+i,slug:a.slug,index:i,name:p[0],title:aliases[p[0]]||p[0]})));
const out='src/data/isan-landmarks.json',photos=JSON.parse(readFileSync(out,'utf8'));
mkdirSync('research/place-photos',{recursive:true});mkdirSync('public/travel/places',{recursive:true});
const pause=()=>new Promise(r=>setTimeout(r,1800));
async function api(host,params){const u=new URL('https://'+host+'/w/api.php');u.search=new URLSearchParams({format:'json',...params});const r=await fetch(u);if(!r.ok)throw Error(host+' '+r.status);return r.json();}
const found=[];
for(let start=0;start<items.length;start+=40){
 const group=items.slice(start,start+40),path=`research/place-photos/wiki-${start}.json`;
 const j=existsSync(path)?JSON.parse(readFileSync(path)):await api('th.wikipedia.org',{action:'query',titles:group.map(x=>x.title).join('|'),redirects:'1',prop:'pageimages',piprop:'name',pilicense:'free'});
 writeFileSync(path,JSON.stringify(j,null,2));
 const redirects=new Map([...(j.query?.normalized||[]),...(j.query?.redirects||[])].map(x=>[x.from,x.to]));
 for(const item of group){let title=item.title;for(let k=0;k<5&&redirects.has(title);k++)title=redirects.get(title);const p=Object.values(j.query?.pages||{}).find(p=>p.title===title);if(p?.pageimage&&!/logo|map|flag|seal|ตรา|ธง|แผนที่/i.test(p.pageimage))found.push({...item,file:p.pageimage,wikipedia:title});}
 console.log('Wikipedia',start,found.length);await pause();
}
for(let start=0;start<found.length;start+=40){
 const group=found.slice(start,start+40),path=`research/place-photos/commons-${start}.json`;
 const j=existsSync(path)?JSON.parse(readFileSync(path)):await api('commons.wikimedia.org',{action:'query',titles:group.map(x=>'File:'+x.file).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1200'});writeFileSync(path,JSON.stringify(j,null,2));
 for(const item of group){
  if(photos[item.key]?.image)continue;
  const p=Object.values(j.query?.pages||{}).find(p=>p.title.replaceAll('_',' ')==='File:'+item.file.replaceAll('_',' ')),i=p?.imageinfo?.[0],m=i?.extmetadata,license=m?.LicenseShortName?.value||'';
  if(!i||!['image/jpeg','image/png'].includes(i.mime)||!/^CC BY(?:-SA)? [1-4]\.(?:0|5)$/.test(license)||!m.LicenseUrl?.value||i.width<600){console.log('skip',item.key,license);continue;}
  const r=await fetch(i.thumburl||i.url);if(!r.ok){console.log('download',item.key,r.status);continue;}const image=`/travel/places/${item.slug}-${item.index}.${i.mime==='image/png'?'png':'jpg'}`;writeFileSync('public'+image,Buffer.from(await r.arrayBuffer()));
  const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();let artist=clean(m.Artist?.value);if(artist.includes('Supanut Arunoprayote'))artist='Supanut Arunoprayote';
  photos[item.key]={image,artist,license,licenseUrl:m.LicenseUrl.value,source:i.descriptionurl,title:item.file,description:clean(m.ImageDescription?.value),placeName:item.name,province:item.slug,placeIndex:item.index,wikipedia:'https://th.wikipedia.org/wiki/'+encodeURIComponent(item.wikipedia)};
  writeFileSync(out,JSON.stringify(photos,null,2));console.log('photo',item.key,item.name,license);
 }
 await pause();
}
writeFileSync('research/place-photos/missing.json',JSON.stringify(items.filter(x=>!photos[x.key]),null,2));console.log('Total place photos:',Object.keys(photos).length,'Missing:',items.filter(x=>!photos[x.key]).length);

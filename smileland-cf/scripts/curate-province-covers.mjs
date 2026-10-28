import {readFileSync,writeFileSync} from 'node:fs';
const selections={
 'buri-ram':['Huai Chorakhemak Reservoir, Buriram Province.jpg','อ่างเก็บน้ำห้วยจรเข้มาก'],
 'maha-sarakham':['ถนนแจ้งสนิท จ.มหาสารคาม.jpg','บรรยากาศเมืองมหาสารคาม'],
 'surin':['ใจกลางเมืองสุรินทร์ - Surin Downtown.jpg','ใจกลางเมืองสุรินทร์'],
 'si-sa-ket':['Mun River - Sisaket.jpg','แม่น้ำมูล อำเภอราษีไศล'],
 'sakon-nakhon':['Nurul Islam Mosque Sakon Nakhon.jpg','มัสยิดนูรุลอิสลาม สกลนคร'],
 'loei':['Lang Pae (I).jpg','หลังแป อุทยานแห่งชาติภูกระดึง'],
};
const covers=JSON.parse(readFileSync('src/data/isan-covers.json','utf8'));
for(const slug of ['bueng-kan','buri-ram','maha-sarakham','loei'])covers[slug]=null;
writeFileSync('src/data/isan-covers.json',JSON.stringify(covers,null,2));
const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',titles:Object.values(selections).map(x=>'File:'+x[0]).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|mime|size',iiurlwidth:'1200',format:'json'});
const r=await fetch(u);if(!r.ok)throw Error('Commons '+r.status);const j=await r.json();writeFileSync('research/commons-covers/curated.json',JSON.stringify(j,null,2));
const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
for(const [slug,[file,placeName]] of Object.entries(selections)){
 const p=Object.values(j.query.pages).find(p=>p.title==='File:'+file);const i=p?.imageinfo?.[0],m=i?.extmetadata;if(!i||m.LicenseShortName?.value!=='CC BY 4.0')throw Error('License '+slug);
 const img=await fetch(i.thumburl||i.url);if(!img.ok)throw Error('Image '+slug);const image='/travel/covers/'+slug+'.jpg';writeFileSync('public'+image,Buffer.from(await img.arrayBuffer()));
 let artist=clean(m.Artist?.value);if(artist.includes('Supanut Arunoprayote'))artist='Supanut Arunoprayote';covers[slug]={image,artist,license:'CC BY 4.0',licenseUrl:m.LicenseUrl.value,source:i.descriptionurl,title:file,placeName,description:clean(m.ImageDescription?.value)};writeFileSync('src/data/isan-covers.json',JSON.stringify(covers,null,2));console.log(slug,placeName);
}

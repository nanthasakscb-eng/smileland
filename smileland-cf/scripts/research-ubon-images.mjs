import { writeFileSync, mkdirSync } from 'node:fs';
const queries = ['Pha Taem filetype:bitmap', 'Sam Phan Bok filetype:bitmap', 'Wat Sirindhorn Wararam filetype:bitmap', 'Wat Phra That Nong Bua filetype:bitmap', 'Wat Thung Si Muang filetype:bitmap', 'Kaeng Tana filetype:bitmap', 'Hat Chom Dao filetype:bitmap', 'Sao Chaliang filetype:bitmap', 'Kaeng Saphue filetype:bitmap', 'Sirindhorn Dam filetype:bitmap'];
const all = [];
for (const query of queries) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '6', gsrlimit: '4', prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1200', format: 'json' });
  const response = await fetch(u);
  if (!response.ok) { console.log(`${query}: ${response.status}`); continue; }
  const j = await response.json();
  const items = Object.values(j.query?.pages || {}).sort((a,b) => a.index-b.index).map(p => {
    const i=p.imageinfo[0], m=i.extmetadata;
    return {title:p.title, image:i.thumburl || i.url, source:i.descriptionurl, width:i.width, height:i.height, artist:m.Artist?.value, license:m.LicenseShortName?.value, licenseUrl:m.LicenseUrl?.value, description:m.ImageDescription?.value};
  });
  all.push({query,items});
  mkdirSync('research', {recursive:true});
  writeFileSync('research/ubon-images.json',JSON.stringify(all,null,2));
  await new Promise(resolve=>setTimeout(resolve,1500));
  console.log(JSON.stringify({query,items:items.map(({title,license,description})=>({title,license,description:description?.slice(0,180)}))}));
}
mkdirSync('research', {recursive:true});
writeFileSync('research/ubon-images.json',JSON.stringify(all,null,2));

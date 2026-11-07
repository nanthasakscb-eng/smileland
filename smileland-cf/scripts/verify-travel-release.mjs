import { readFileSync, existsSync } from 'node:fs';
const data=JSON.parse(readFileSync('src/data/travel-content.json','utf8'));
const slugs=[...data.map(a=>a.slug),'ubon-ratchathani'];
if(new Set(slugs).size!==20)throw Error('Expected 20 distinct provinces.');
let places=0;
const photos=JSON.parse(readFileSync('src/data/isan-landmarks.json','utf8'));
for(const [key,p] of Object.entries(photos)){
 if(!/^CC BY(?:-SA)? [1-4]\.(?:0|5)$/.test(p.license)||!p.artist||!p.source.startsWith('https://commons.wikimedia.org/wiki/')||!/^https?:\/\/creativecommons.org\/licenses\//.test(p.licenseUrl))throw Error('Invalid photo credit '+key);
}
for(const slug of slugs){
 const html=readFileSync(`travel-release/public/travel/${slug}/index.html`,'utf8');
 const count=[...html.matchAll(/<article[^>]+class="ut-place(?: |")/g)].length;
 if(count!==10)throw Error(`${slug}: ${count} places`);
 if((html.match(/google\.com\/maps\/search\//g)||[]).length!==10)throw Error(slug+' map links');
 if((html.match(/AD SPACE/g)||[]).length!==2||!html.includes('class="ut-own-banner"'))throw Error(slug+' banners');
 if(html.indexOf('class="pronet-menu"')<html.indexOf('</footer>'))throw Error(slug+' promo menu must follow footer');
 for(const match of html.matchAll(/(?:src|href)="(\/(?:assets\/|travel\/covers\/|travel\/places\/|travel\/ubon\/)[^"?#]*)(?:[?#][^"]*)?"/g)){
  if(!existsSync('travel-release/public'+match[1]))throw Error(slug+' missing asset '+match[1]);
 }
 places+=count;
}
const hub=readFileSync('travel-release/public/travel/index.html','utf8');
if((hub.match(/data-travel-province=/g)||[]).length!==20)throw Error('Hub missing provinces');
for(const slug of slugs)if(!hub.includes(`href="/travel/${slug}/"`))throw Error('Missing hub link '+slug);
console.log(`PASS: ${slugs.length} provinces, ${places} places, ${places} Maps links; banners, photo licenses, menu links, and local assets verified.`);

import { mkdirSync, writeFileSync, cpSync, readFileSync } from 'node:fs';
const root='travel-release';
const origin='https://smileland.sabuy-panich.workers.dev';
const articles=JSON.parse(readFileSync('src/data/travel-content.json','utf8'));
const paths=['/travel/',...articles.map(a=>`/travel/${a.slug}/`),'/travel/ubon-ratchathani/'];
if(articles.length!==19||articles.some(a=>a.places.length!==10))throw Error('Expected 19 new articles with 10 places each.');
mkdirSync(`${root}/public/assets/js`,{recursive:true});
for (const path of paths) {
const r=await fetch('http://127.0.0.1:8787'+path);
if(!r.ok)throw Error('Local article unavailable');
let html=await r.text();
html=html.replace(/href="\/(?!assets\/|travel\/)([^"]*)"/g,(_,path)=>`href="${origin}/${path}"`);
html=html.replace(/<meta name="robots" content="[^"]*"\s*\/?\s*>/,'<meta name="robots" content="index, follow" />');
html=html.replace('</head>',`<link rel="canonical" href="https://isan-travel.sabuy-panich.workers.dev${path}" /></head>`);
// The travel release has no account/session; those links belong to the main site.
html=html.replace(/<a href="https:\/\/smileland\.sabuy-panich\.workers\.dev\/(?:login|register|account)"[^>]*>[^<]*<\/a>/g,'');
html=html.replace(/<script src="\/assets\/js\/app\.js[^\"]*"[^>]*><\/script>/,'<script src="/assets/js/travel-menu.js" defer></script>');
mkdirSync(`${root}/public${path}`,{recursive:true});
writeFileSync(`${root}/public${path}index.html`,html);
if(path==='/travel/') writeFileSync(`${root}/public/index.html`,html);
}
writeFileSync(`${root}/public/assets/js/travel-menu.js`,`const b=document.querySelector('[data-menu]');b?.addEventListener('click',()=>{const n=document.querySelector('#nav');const open=n.classList.toggle('open');b.setAttribute('aria-expanded',String(open));});`);
cpSync('public/assets/js/travel-provinces.js',`${root}/public/assets/js/travel-provinces.js`);
cpSync('public/favicon.svg',`${root}/public/favicon.svg`);
for(const path of ['assets/css','assets/fonts','assets/img','travel/ubon','travel/covers','travel/places']) cpSync(`public/${path}`,`${root}/public/${path}`,{recursive:true});
writeFileSync(`${root}/public/robots.txt`,'User-agent: *\nAllow: /\nSitemap: https://isan-travel.sabuy-panich.workers.dev/sitemap.xml\n');
writeFileSync(`${root}/public/sitemap.xml`,'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>`<url><loc>https://isan-travel.sabuy-panich.workers.dev${p}</loc></url>`).join('')+'</urlset>');
writeFileSync(`${root}/wrangler.json`,JSON.stringify({name:'isan-travel',account_id:'d811abb0c86440639a552a8b0eabae40',compatibility_date:'2026-10-01',workers_dev:true,assets:{directory:'./public',html_handling:'auto-trailing-slash',not_found_handling:'404-page'}},null,2));
console.log('Static travel release ready; 20 provinces, 200 places; 2 rental slots and 1 own-brand banner per article.');

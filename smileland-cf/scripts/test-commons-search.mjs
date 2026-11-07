for(const q of ['Jim Thompson Farm','"Jim Thompson Farm"','intitle:"Jim Thompson Farm"']){
const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',list:'search',srsearch:q,srnamespace:'6',format:'json'});const r=await fetch(u);console.log(r.status,JSON.stringify(await r.json()).slice(0,1200));}

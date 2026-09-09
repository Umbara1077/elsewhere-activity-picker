import {milesBetween} from './picker.mjs';
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#0?39;/g,"'").replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>{const c=Number(n);return c<=0x10ffff?String.fromCodePoint(c):'';}).trim();
export function normalizePublicEvents(body,location,radius,now=new Date()){
 const seen=new Set();return (body.events||[]).flatMap(e=>{
  const v=e.venue||{},lat=Number(v.geo_lat),lon=Number(v.geo_lng);
  const date=new Date(String(e.utc_start_date||'').replace(' ','T')+'Z'),end=new Date(String(e.utc_end_date||'').replace(' ','T')+'Z');
  if(e.status!=='publish'||e.all_day||e.is_virtual||e.hide_from_listings||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!Number.isFinite(+date)||!Number.isFinite(+end)||end<date||end<now)return [];
  const distance=milesBetween(location.lat,location.lon,lat,lon);if(distance>radius)return [];
  let url;try{url=new URL(e.url);if(url.protocol!=='https:'||url.hostname!=='visitsouthjersey.com')return [];}catch{return [];}
  const title=clean(e.title),key=title+'|'+v.id+'|'+date.toISOString();if(!title||seen.has(key))return [];seen.add(key);
  const family=(e.categories||[]).some(c=>/family|children|kids/i.test(c.name));
  return [{id:'vsj-'+e.id,title,category:'events',description:'An upcoming '+((e.categories||[])[0]?.name?clean(e.categories[0].name).toLowerCase()+' ':'')+'event at '+clean(v.venue)+'. See the organizer listing for tickets and participation details.',moods:family?['fun','family']:['fun'],source:'Visit South Jersey · live calendar',url:url.href,address:clean([v.venue,v.address,v.city].filter(Boolean).join(' · ')),lat,lon,distance,date:date.toISOString(),endDate:end.toISOString()}];
 });
}
export async function livePublicEvents(location,radius,fetcher=fetch){
 if(milesBetween(location.lat,location.lon,39.665,-74.971)>120)return [];
 const url='https://visitsouthjersey.com/wp-json/tribe/events/v1/events?per_page=50&start_date='+new Date().toISOString().slice(0,10);
 const r=await fetcher(url,{signal:AbortSignal.timeout(3500)});if(!r.ok)throw Error('Public calendar unavailable');return normalizePublicEvents(await r.json(),location,radius);
}

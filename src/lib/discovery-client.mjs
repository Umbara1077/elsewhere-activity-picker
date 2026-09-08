import { validActivity } from './places-state.mjs';
import { milesBetween, filterActivities } from './picker.mjs';

const requests = new Map();
async function browserDiscovery(zip, radius, fetcher) {
 const geo=await fetcher(`https://api.zippopotam.us/us/${zip}`);
 if(!geo.ok) throw new Error('We could not locate that ZIP code.');
 const place=await geo.json(); const p=place.places?.[0];
 const location={zip,city:p?.['place name']||zip,state:p?.['state abbreviation']||'',lat:Number(p?.latitude),lon:Number(p?.longitude)};
 if(!Number.isFinite(location.lat)||!Number.isFinite(location.lon)) throw new Error('That ZIP code did not return a usable location.');
 const around=Math.min(Number(radius)||25,25)*1609.34;
 const q=`[out:json][timeout:20];nwr(around:${around},${location.lat},${location.lon})[name][amenity~"restaurant|cafe|fast_food|bar|cinema|theatre|arts_centre|museum|park|library"];out center tags;`;
 const osm=await fetcher(`https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=${encodeURIComponent(q)}`);
 if(!osm.ok) throw new Error('Nearby discovery is temporarily unavailable.');
 const body=await osm.json(); const activities=(body.elements||[]).map((e,i)=>{const t=e.tags||{},lat=Number(e.lat??e.center?.lat),lon=Number(e.lon??e.center?.lon),amenity=t.amenity||''; const category=amenity==='park'?'outdoors':(['museum','library','theatre','cinema','arts_centre'].includes(amenity)?'culture':'food'); return {id:`osm-${e.type}-${e.id}`,title:t.name,description:`A local ${amenity.replace('_',' ')} near ${location.city}.`,category,moods:['anything','fun','chill','romantic','family','adventurous'],source:'OpenStreetMap',lat,lon,distance:milesBetween(location.lat,location.lon,lat,lon),image:category==='food'?`${import.meta.env.BASE_URL}images/dining.jpg`:`${import.meta.env.BASE_URL}images/coast.jpg`,indoor:category==='food'||category==='culture',dining:category==='food'?['sitdown','takeout']:undefined};}).filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon));
 return {location,activities,message:`Found ${activities.length} places from OpenStreetMap.`,fetchedAt:new Date().toISOString()};
}
export function discoverLocal(zip, radius, fetcher = fetch) {
 if (!/^\d{5}$/.test(zip)) return Promise.reject(new Error('Enter a valid five-digit US ZIP code.'));
 const key=`${zip}:${radius}`;
 const existing=requests.get(key);
 if (existing && existing.expires>Date.now()) return existing.promise;
 const promise=(async()=>{
  let response;
  try { response=await fetcher(`/api/discover?zip=${zip}&radius=${radius}`,{signal:AbortSignal.timeout(45000)}); } catch { return browserDiscovery(zip,radius,fetcher); }
  if(!response.ok) return browserDiscovery(zip,radius,fetcher);
  const body=await response.json();
  if(!body.location || body.location.zip!==zip || !Number.isFinite(body.location.lat) || !Number.isFinite(body.location.lon))throw new Error('The local search returned an incomplete location. Please retry.');
  const activities=(Array.isArray(body.activities)?body.activities:[]).filter(a=>validActivity(a)&&!a.inspiration&&a.source!=='Live web search'&&Number.isFinite(a.lat)&&Number.isFinite(a.lon));
  if(activities.length<2||body.sourceStatus?.some(s=>s.source==='venues'&&!s.available)){const pending=requests.get(key);if(pending)pending.expires=Date.now()+15000;}
  return {location:body.location,activities,message:typeof body.message==='string'?body.message:'',fetchedAt:body.fetchedAt};
 })();
 requests.set(key,{promise,expires:Date.now()+300000});
 promise.catch(()=>requests.delete(key));
 return promise;
}
export function mergeLocalActivities(personal, saved, live, location) {
 return [...new Map([...saved,...live,...personal].filter(a=>validActivity(a)&&!a.inspiration&&a.source!=='Live web search').map(a=>[a.id,a])).values()]
  .filter(a=>a.personal||(location&&Number.isFinite(a.lat)&&Number.isFinite(a.lon)))
  .map(a=>location&&Number.isFinite(a.lat)&&Number.isFinite(a.lon)?{...a,distance:milesBetween(location.lat,location.lon,a.lat,a.lon)}:a)
  .sort((a,b)=>(a.distance??0)-(b.distance??0));
}
export function chooseLocal(items, filters, visited, history=[], random=Math.random, now=new Date()) {
 const eligible=filterActivities(items.filter(a=>!a.inspiration&&a.source!=='Live web search'),filters,visited,now);
 const fresh=eligible.filter(a=>!history.includes(a.id));
 const nonPrevious=eligible.filter(a=>a.id!==history.at(-1));
 const pool=fresh.length?fresh:nonPrevious.length?nonPrevious:eligible;
 return pool.length?pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]:null;
}


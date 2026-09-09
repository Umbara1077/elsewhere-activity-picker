import { normalizeVenue } from '../../functions/venue.mjs';
import { validActivity } from './places-state.mjs';
import { milesBetween, filterActivities } from './picker.mjs';

const requests = new Map();
export async function browserDiscovery(zip, radius, fetcher) {
 const geo=await fetcher('https://api.zippopotam.us/us/'+zip,{signal:AbortSignal.timeout(15000)});
 if(!geo.ok) throw new Error('We could not locate that ZIP code.');
 const place=await geo.json(), p=place.places?.[0];
 const location={zip,city:p?.['place name']||zip,state:p?.['state abbreviation']||'',lat:Number(p?.latitude),lon:Number(p?.longitude)};
 if(!Number.isFinite(location.lat)||!Number.isFinite(location.lon)) throw new Error('That ZIP code did not return a usable location.');
 const around=Math.min(Number(radius)||25,100)*1609.34;
 const selectors=['[amenity~"restaurant|cafe|fast_food|bar|pub|cinema|theatre|arts_centre"]','[leisure~"park|nature_reserve|bowling_alley|miniature_golf|escape_game"]','[tourism~"museum|gallery|viewpoint|zoo|aquarium"]','[natural=beach]'];
 const groups=await Promise.allSettled(selectors.map(async selector=>{
  const q='[out:json][timeout:25];nwr(around:'+around+','+location.lat+','+location.lon+')'+selector+'[name];out center tags;';
  const response=await fetcher('https://maps.mail.ru/osm/tools/overpass/api/interpreter?data='+encodeURIComponent(q),{signal:AbortSignal.timeout(35000)});
  if(!response.ok)throw Error('Venue source unavailable');
  const body=await response.json();if(body.remark)throw Error('Venue query incomplete');return body.elements||[];
 }));
 if(groups.every(g=>g.status==='rejected'))throw Error('Nearby sources are unavailable. Please retry shortly.');
 const activities=[...new Map(groups.flatMap(g=>g.status==='fulfilled'?g.value:[]).map(e=>normalizeVenue(e,location)).filter(Boolean).filter(a=>a.distance<=radius).map(a=>[a.id,a])).values()];
 return {location,activities,message:'Found '+activities.length+' nearby places. '+(groups.some(g=>g.status==='rejected')?'Some categories could not be loaded. ':'')+'Live event calendars are not connected on this site. Mood suggestions require supporting details; unknown attributes are excluded from strict filters.',fetchedAt:new Date().toISOString()};
}
export function discoverLocal(zip, radius, fetcher = fetch) {
 if (!/^\d{5}$/.test(zip)) return Promise.reject(new Error('Enter a valid five-digit US ZIP code.'));
 const key=`${zip}:${radius}`;
 const existing=requests.get(key);
 if (existing && existing.expires>Date.now()) return existing.promise;
 const promise=(async()=>{
  if(typeof window!=='undefined' && window.location.hostname.endsWith('github.io')) return browserDiscovery(zip,radius,fetcher);
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
 return [...new Map([...saved.filter(a=>a.personal||!a.id.startsWith('osm-')),...live,...personal].filter(a=>validActivity(a)&&!a.inspiration&&a.source!=='Live web search').map(a=>[a.id,a])).values()]
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


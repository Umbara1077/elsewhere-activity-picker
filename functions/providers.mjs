import { createHash } from 'node:crypto';
import ical from 'node-ical';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';

const AGENT='Elsewhere/1.0 (+https://decisions-628c5.web.app)';
export const number=(value,fallback=undefined)=>value==null||String(value).trim()===''?fallback:Number.isFinite(Number(value))?Number(value):fallback;
export const text=(value,max=600)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function safeUrl(value,base) {try{const url=new URL(value,base);return url.protocol==='https:'||url.protocol==='http:'?url.href:undefined;}catch{return undefined;}}
export function miles(a,b) {const r=Math.PI/180,x=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
const coords=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
const id=(value)=>createHash('sha256').update(value).digest('hex').slice(0,24);
const cache=new Map();
export async function cached(key,work,ttl=900000) {
 const existing=cache.get(key);if(existing&&existing.expires>Date.now())return existing.promise;
 if(cache.size>=150)cache.delete(cache.keys().next().value);
 const promise=Promise.resolve().then(work);cache.set(key,{promise,expires:Date.now()+ttl});
 try{return await promise;}catch(error){cache.delete(key);throw error;}
}
export async function fetchText(url,options={}) {
 const response=await fetch(url,{...options,signal:AbortSignal.timeout(options.timeout||12000),headers:{'user-agent':AGENT,...options.headers}});
 if(!response.ok)throw new Error(`Source unavailable (${response.status})`);
 const reader=response.body.getReader();let size=0;const buffers=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_500_000)throw new Error('Source exceeds size limit');buffers.push(Buffer.from(value));}}finally{await reader.cancel();}
 return Buffer.concat(buffers).toString('utf8');
}
const json=async(url,options)=>JSON.parse(await fetchText(url,options));
export async function geocode(zip) {
 return cached(`zip:${zip}`,async()=>{const data=await json(`https://api.zippopotam.us/us/${zip}`);const p=data.places?.[0];if(!p)throw Error('ZIP not found');return {zip,city:p['place name'],state:p['state abbreviation'],lat:number(p.latitude),lon:number(p.longitude)};},86400000);
}
export function osmActivity(element,origin) {
 const tags=element.tags||{},lat=number(element.lat??element.center?.lat),lon=number(element.lon??element.center?.lon);
 if(!tags.name||!coords(lat,lon))return null;
 const category=/^(restaurant|cafe|fast_food|bar|pub)$/.test(tags.amenity)?'food':/^(museum|gallery)$/.test(tags.tourism)||/^(cinema|theatre)$/.test(tags.amenity)?'culture':tags.natural==='beach'?'daytrip':'outdoors';
 const dining=category==='food'?[...(['yes','only'].includes(tags.takeaway)?['takeout']:[]),...(tags.indoor_seating==='yes'||tags.outdoor_seating==='yes'?['sitdown']:[])]:undefined;
 return {id:`osm-${element.type}-${element.id}`,title:text(tags.name,120),category,description:text(tags.description||`${tags.cuisine?tags.cuisine.replaceAll(';',', ')+' cuisine. ':''}A nearby ${tags.amenity||tags.tourism||tags.leisure||tags.natural||'place'} listed in OpenStreetMap. Check the venue for hours and details.`),moods:category==='food'?['romantic','fun','chill']:['family','chill','adventurous'],distance:miles(origin,{lat,lon}),source:'OpenStreetMap',url:safeUrl(tags.website||tags['contact:website'])||`https://www.openstreetmap.org/${element.type}/${element.id}`,address:text([tags['addr:housenumber'],tags['addr:street'],tags['addr:city']].filter(Boolean).join(' ')),lat,lon,hours:text(tags.opening_hours,300)||undefined,phone:text(tags.phone||tags['contact:phone'],50)||undefined,cuisine:text(tags.cuisine?.replaceAll(';',', '),120)||undefined,dining: dining?.length?dining:undefined,indoor:tags.indoor==='yes'||tags.indoor_seating==='yes'?true:tags.indoor==='no'?false:undefined,accessible:tags.wheelchair==='yes'?true:tags.wheelchair==='no'?false:undefined};
}
let osmBusy=false;
export async function osmPlaces(origin,radius) {
 return cached(`osm:${origin.zip}:${radius}`,async()=>{
  if(osmBusy)throw Error('Venue source is busy');osmBusy=true;
  try{
   // Start with the closest ten miles: broad all-category region queries can overwhelm public servers.
   const meter=Math.min(radius*1609.34,16093);
   const selectors=['[amenity~"restaurant|cafe|fast_food"]','[amenity~"bar|pub|cinema|theatre"]','[leisure~"park|nature_reserve"]','[tourism~"museum|gallery|viewpoint"]','[natural=beach]'];
   const endpoint=process.env.OVERPASS_URL||'https://maps.mail.ru/osm/tools/overpass/api/interpreter';
   const responses=await Promise.allSettled(selectors.map(async selector=>{
    const searchMeters=selector==='[natural=beach]'?Math.min(radius*1609.34,160934):selector===selectors[0]?Math.min(radius*1609.34,8000):meter;
    const query=`[out:json][timeout:12];nwr(around:${searchMeters},${origin.lat},${origin.lon})${selector};out center tags 60;`;
    const body=await json(endpoint,{method:'POST',body:new URLSearchParams({data:query}),timeout:16000});
    if(body.remark&&!body.elements?.length)throw Error('Venue source query timed out');
    return body.elements||[];
   }));
   const elements=responses.flatMap(r=>r.status==='fulfilled'?r.value:[]);
   if(!elements.length&&responses.some(r=>r.status==='rejected'))throw Error('Nearby venue sources are unavailable');
   return [...new Map(elements.map(e=>osmActivity(e,origin)).filter(a=>a&&a.distance<=radius).map(a=>[a.id,a])).values()].sort((a,b)=>a.distance-b.distance).slice(0,90);
  }finally{osmBusy=false;}
 },3600000);
}

const COUNTY='https://www.gloucestercountynj.gov';
export const COUNTY_FEED=`${COUNTY}/common/modules/iCalendar/iCalendar.aspx?catID=29&feed=calendar`;
const countyVenues=[{match:/Scotland Run Park/i,lat:39.6573889804894,lon:-75.0531431893937}];
export async function parseCountyFeed(ics,origin,radius,now=Date.now()) {
 const records=await ical.async.parseICS(ics);
 return Object.values(records).flatMap(event=>{
  if(event.type!=='VEVENT'||event.status==='CANCELLED'||!Number.isFinite(+event.start)||+(event.end||event.start)<now)return [];
  const venue=countyVenues.find(v=>v.match.test(String(event.location||'')));if(!venue)return [];
  const distance=miles(origin,venue);if(distance>radius)return [];
  const uid=String(event.uid);if(!/^\d+$/.test(uid))return [];
  return [{id:`county-${uid}-${id(event.start.toISOString())}`,title:text(event.summary,120),category:'events',description:'An upcoming event listed by Gloucester County Parks and Recreation. See the official listing for participation details.',moods:['fun','family'],duration:'See event details',source:'Gloucester County Parks',url:`${COUNTY}/calendar.aspx?EID=${uid}`,address:text(event.location),date:event.start.toISOString(),endDate:event.end?.toISOString(),lat:venue.lat,lon:venue.lon,distance}];
 });
}
async function countyEvents(origin,radius) {
 if(miles(origin,countyVenues[0])>radius+40)return [];
 const ics=await cached('county-feed',()=>fetchText(COUNTY_FEED));
 const events=await parseCountyFeed(ics,origin,radius);
 return Promise.all(events.slice(0,12).map(async event=>{
  try{const html=await cached(`detail:${event.url}`,()=>fetchText(event.url));const $=load(html);const raw=text($('[itemprop="price"]').text());const price=/\bfree\b/i.test(raw)?0:number(raw.replace(/^\$/,''));return {...event,...(price!==undefined?{price}:{}),description:text($('[itemprop="description"]').text())||event.description};}catch{return event;}
 }));
}

export function extractJsonLd(html,source,origin,radius,now=Date.now()) {
 const $=load(html);const result=[];
 function walk(node){if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object')return;
  const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
  if(types.some(t=>typeof t==='string'&&/Event$/.test(t))){
   const lat=number(node.location?.geo?.latitude),lon=number(node.location?.geo?.longitude),start=new Date(node.startDate),end=new Date(node.endDate||node.startDate);
   if(!coords(lat,lon)||!Number.isFinite(+start)||!Number.isFinite(+end)||end<start||+end<now||/Cancelled|Postponed/.test(node.eventStatus||''))return;
   const distance=miles(origin,{lat,lon});if(distance>radius)return;
   const offers=Array.isArray(node.offers)?node.offers[0]:node.offers;
   result.push({id:`public-${id(`${source}|${node['@id']||node.url||node.name}|${node.startDate}`)}`,title:text(node.name,120),description:text(node.description||'A public event from a local organizer.'),category:'events',moods:['fun','family','adventurous'],source:new URL(source).hostname,url:safeUrl(node.url,source)||source,address:text([node.location?.name,node.location?.address?.streetAddress,node.location?.address?.addressLocality].filter(Boolean).join(' · ')),date:start.toISOString(),endDate:end.toISOString(),lat,lon,distance,price:number(offers?.price),image:safeUrl(Array.isArray(node.image)?node.image[0]:node.image,source)});
  }
  if(node['@graph'])walk(node['@graph']);if(node.itemListElement)walk(node.itemListElement);if(node.item)walk(node.item);
 }
 $('script[type="application/ld+json"]').each((_,el)=>{try{walk(JSON.parse($(el).text()));}catch{/* A bad script cannot suppress other events. */}});
 return result;
}
async function publicEvents(origin,radius) {
 const sources=(process.env.PUBLIC_EVENT_SOURCES||'').split(',').map(s=>s.trim()).filter(s=>/^https:\/\//.test(s)).slice(0,4);
 const result=await Promise.allSettled(sources.map(async source=>{
  const u=new URL(source);if(u.username||u.password||u.port||u.hostname==='localhost'||/^[\d.:]+$/.test(u.hostname))return [];
  const html=await cached(`public:${source}`,async()=>{
   const robotsUrl=new URL('/robots.txt',source).href;
   let rules;try{rules=await fetchText(robotsUrl);}catch{return '';}
   if(robotsParser(robotsUrl,rules).isAllowed(source,'Elsewhere')===false)return '';
   return fetchText(source);
  });return extractJsonLd(html,source,origin,radius);
 }));return result.flatMap(r=>r.status==='fulfilled'?r.value:[]);
}
async function ticketmaster(origin,radius,key) {
 if(!key)return [];
 const url=new URL('https://app.ticketmaster.com/discovery/v2/events.json');url.search=new URLSearchParams({apikey:key,postalCode:origin.zip,radius:String(radius),unit:'miles',size:'30',sort:'date,asc'});
 const data=await json(url.href);
 return (data._embedded?.events||[]).flatMap(event=>{
  const venue=event._embedded?.venues?.[0],lat=number(venue?.location?.latitude),lon=number(venue?.location?.longitude);
  if(!coords(lat,lon)||event.dates?.status?.code==='cancelled')return [];
  const date=event.dates?.start?.dateTime||event.dates?.start?.localDate;if(!date||!Number.isFinite(+new Date(date)))return [];
  return [{id:`tm-${event.id}`,title:text(event.name,120),description:text(event.info||event.pleaseNote||'A local event. Check the organizer for tickets and full details.'),category:'events',moods:['fun','romantic','adventurous'],source:'Ticketmaster',url:safeUrl(event.url),address:text([venue?.name,venue?.city?.name,venue?.state?.stateCode].filter(Boolean).join(' · ')),date,lat,lon,distance:miles(origin,{lat,lon}),price:number(event.priceRanges?.[0]?.min),image:safeUrl(event.images?.find(i=>i.ratio==='16_9')?.url||event.images?.[0]?.url)}];
 });
}
async function googlePlaces(origin,radius,key) {
 if(!key)return [];
 const fields='places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location,places.primaryType,places.dineIn,places.takeout,places.accessibilityOptions';
 const body=await json('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'content-type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':fields},body:JSON.stringify({textQuery:`restaurants and cafes near ${origin.zip}`,locationBias:{circle:{center:{latitude:origin.lat,longitude:origin.lon},radius:Math.min(radius*1609.34,50000)}},pageSize:20})});
 return (body.places||[]).flatMap(place=>{const lat=number(place.location?.latitude),lon=number(place.location?.longitude);if(!coords(lat,lon))return [];const dining=[...(place.dineIn===true?['sitdown']:[]),...(place.takeout===true?['takeout']:[])];return [{id:`google-${place.id}`,title:text(place.displayName?.text,120),category:'food',description:'A nearby restaurant or café from Google Places. Open the listing for menu, hours, and current details.',moods:['fun','romantic','chill'],source:'Google Places',url:safeUrl(place.googleMapsUri),address:text(place.formattedAddress),lat,lon,distance:miles(origin,{lat,lon}),dining:dining.length?dining:undefined,accessible:place.accessibilityOptions?.wheelchairAccessibleEntrance}];});
}
export function searchLinks(origin) {
 const term=t=>encodeURIComponent(`${t} near ${origin.city}, ${origin.state} ${origin.zip}`);
 return [{title:'Restaurants & takeout',url:`https://www.google.com/maps/search/?api=1&query=${term('restaurants takeout')}`},{title:'More local events',url:`https://www.google.com/search?q=${term('upcoming local events')}`},{title:'Public Facebook events',url:`https://www.google.com/search?q=${term('site:facebook.com/events')}`},{title:'Parks & beaches',url:`https://www.google.com/maps/search/?api=1&query=${term('parks beaches')}`}];
}
export async function getDiscoveries(origin,radius,keys={}) {
 const jobs=[['venues',()=>osmPlaces(origin,radius)],['county-events',()=>countyEvents(origin,radius)],['public-calendars',()=>publicEvents(origin,radius)],['ticketmaster',()=>ticketmaster(origin,radius,keys.ticketmaster)],['google-places',()=>googlePlaces(origin,radius,keys.google)]];
 const responses=await Promise.allSettled(jobs.map(([,run])=>run()));
 const activities=responses.flatMap(r=>r.status==='fulfilled'?r.value:[]).filter(a=>a.distance<=radius);
 const unique=[...new Map(activities.map(a=>[a.id,a])).values()].sort((a,b)=>(a.category==='events'?-1:0)-(b.category==='events'?-1:0)||a.distance-b.distance).slice(0,70);
 return {activities:unique,searchLinks:searchLinks(origin),sourceStatus:responses.map((r,i)=>({source:jobs[i][0],available:r.status==='fulfilled',count:r.status==='fulfilled'?r.value.length:0})),message:unique.length?`${unique.length} places and events found near ${origin.city}. Mood matches are suggestions; verify times and details with the source.`:`No verified listings returned for ${origin.city} right now. Try the source searches below, or explore an outing idea.`,fetchedAt:new Date().toISOString()};
}

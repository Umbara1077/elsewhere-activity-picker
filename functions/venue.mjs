const distance=(a,b)=>{const r=Math.PI/180,x=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lon-a.lon)*r/2)**2;return 3958.8*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));};
const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').trim().slice(0,600);
const url=v=>{try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:undefined;}catch{return undefined;}};
export function normalizeVenue(e,origin){
 const t=e.tags||{},lat=Number(e.lat??e.center?.lat),lon=Number(e.lon??e.center?.lon);
 if(!t.name||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return null;
 const kind=t.amenity||t.leisure||t.tourism||t.natural||'';
 const food=['restaurant','cafe','fast_food','bar','pub'].includes(kind);
 const culture=['cinema','theatre','arts_centre','museum','gallery','bowling_alley','miniature_golf','escape_game','zoo','aquarium'].includes(kind);
 const category=food?'food':t.natural==='beach'?'daytrip':culture?'culture':'outdoors';
 const quick=['cafe','fast_food'].includes(kind)||/dunkin|mcdonald|burger king|starbucks|taco bell|wendy|subway|chick.fil.a/i.test(t.name);
 const dining=food?[...(['yes','only'].includes(t.takeaway)?['takeout']:[]),...(!quick&&t.takeaway!=='only'&&(t.indoor_seating==='yes'||t.outdoor_seating==='yes'||t.service==='table_service')?['sitdown']:[])]:[];
 const evidence=clean(t.description);
 const romantic=!quick&&(food?kind==='restaurant'&&dining.includes('sitdown')&&/romantic|intimate|candlelit|fine dining/i.test(evidence):['gallery','viewpoint'].includes(kind)||t.natural==='beach');
 const moods=food?['chill']:culture?['fun']:['chill','adventurous'];
 if(romantic)moods.push('romantic');
 if(['park','zoo','aquarium','miniature_golf','bowling_alley'].includes(kind))moods.push('family','fun');
 const matchReason=romantic?(food?'The listing describes a romantic or fine-dining setting and confirms seating.':'A scenic or art-focused outing; atmosphere is a suggestion.'):'Matched using the venue type and published attributes.';
 return {id:`osm-${e.type}-${e.id}`,title:clean(t.name),description:evidence||`${clean(kind).replaceAll('_',' ')}${t.cuisine?' · '+clean(t.cuisine).replaceAll(';',', '):''}. ${matchReason}`,category,moods,matchReason,classificationVersion:2,source:'OpenStreetMap',lat,lon,distance:distance(origin,{lat,lon}),url:url(t.website||t['contact:website'])||`https://www.openstreetmap.org/${e.type}/${e.id}`,address:clean([t['addr:housenumber'],t['addr:street'],t['addr:city']].filter(Boolean).join(' ')),dining:dining.length?dining:undefined,indoor:t.indoor==='yes'||t.indoor_seating==='yes'?true:t.indoor==='no'||['park','nature_reserve','beach','viewpoint'].includes(kind)?false:undefined,accessible:t.wheelchair==='yes'?true:t.wheelchair==='no'?false:undefined,hours:clean(t.opening_hours)||undefined,phone:clean(t.phone||t['contact:phone'])||undefined,cuisine:clean(t.cuisine)||undefined};
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { osmActivity, parseCountyFeed, extractJsonLd, searchLinks } from '../functions/providers.mjs';
const origin={zip:'08094',city:'Williamstown',state:'NJ',lat:39.665,lon:-74.971};
test('restaurant features are never invented from a category',()=>{
 const element={type:'node',id:1,lat:39.66,lon:-74.97,tags:{name:'Restaurant',amenity:'restaurant'}};
 const unknown=osmActivity(element,origin);assert.equal(unknown.dining,undefined);assert.equal(unknown.accessible,undefined);assert.equal(unknown.indoor,undefined);
 const known=osmActivity({...element,tags:{...element.tags,takeaway:'yes',indoor_seating:'yes',wheelchair:'yes'}},origin);assert.deepEqual(known.dining,['takeout','sitdown']);assert.equal(known.accessible,true);
});
test('search shortcuts have no invented venue distances or activity IDs',()=>{for(const link of searchLinks(origin)){assert.equal(link.id,undefined);assert.equal(link.distance,undefined);assert.ok(link.url.startsWith('https://'));}});
test('public events require valid coordinates, current dates and unique IDs',()=>{
 const event={'@type':['Event','MusicEvent'],name:'Music',startDate:'2026-09-12T15:00:00-04:00',endDate:'2026-09-12T18:00:00-04:00',location:{geo:{latitude:39.66,longitude:-74.97}}};
 const html=`<script type="application/ld+json">bad json</script><script type="application/ld+json">${JSON.stringify([event,{...event,name:'Other'},{...event,name:'No location',location:null},{...event,name:'Far away',location:{geo:{latitude:34,longitude:-118}}}])}</script>`;
 const events=extractJsonLd(html,'https://town.example/events',origin,25,Date.parse('2026-09-07'));
 assert.equal(events.length,2);assert.notEqual(events[0].id,events[1].id);assert.equal(events[0].date,'2026-09-12T19:00:00.000Z');
});
test('official calendar retains Eastern timezone and respects radius',async()=>{
 const fixture=await readFile(new URL('./fixtures/county.ics',import.meta.url),'utf8');
 const events=await parseCountyFeed(fixture,origin,25,Date.parse('2026-09-07'));
 assert.equal(events.length,1);assert.equal(events[0].date,'2026-09-12T12:30:00.000Z');assert.ok(events[0].url.includes('EID=2169'));assert.ok(events[0].distance<5);
 assert.equal((await parseCountyFeed(fixture,{...origin,lat:34,lon:-118},25,Date.parse('2026-09-07'))).length,0);
 assert.equal((await parseCountyFeed(fixture,origin,25,Date.parse('2026-09-13'))).length,0);
});

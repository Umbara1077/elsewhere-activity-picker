import {test} from 'node:test';import assert from 'node:assert/strict';import {normalizePublicEvents} from '../src/lib/live-events.mjs';
const origin={lat:39.665,lon:-74.971},now=new Date('2026-09-09T12:00:00Z');
const event={id:1,status:'publish',title:'Music &#8211; outside',url:'https://visitsouthjersey.com/event/music/',utc_start_date:'2026-09-12 18:00:00',utc_end_date:'2026-09-12 20:00:00',venue:{id:3,venue:'The venue',geo_lat:39.67,geo_lng:-74.97},categories:[]};
test('public event feed respects geography, time, source and duplicates without inventing suitability',()=>{
 const body={events:[event,event,{...event,id:2,venue:{}},{...event,id:3,status:'draft'},{...event,id:4,all_day:true},{...event,id:5,url:'javascript:alert(1)'},{...event,id:6,utc_end_date:'2026-01-01 20:00:00'},{...event,id:7,venue:{geo_lat:34,geo_lng:-118}}]};
 const result=normalizePublicEvents(body,origin,25,now);assert.equal(result.length,1);assert.equal(result[0].title,'Music – outside');assert.equal(result[0].date,'2026-09-12T18:00:00.000Z');assert.deepEqual(result[0].moods,['fun']);assert.equal(result[0].price,undefined);
});

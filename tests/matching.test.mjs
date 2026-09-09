import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVenue} from '../functions/venue.mjs';
import {chooseLocal,browserDiscovery} from '../src/lib/discovery-client.mjs';
const origin={lat:39.665,lon:-74.971};
const make=(id,tags)=>normalizeVenue({id,type:'node',lat:39.66,lon:-74.97,tags},origin);
const filters={category:'food',mood:'romantic',radius:25,budget:200,dining:'sitdown',date:'any',indoor:'any'};
test('romantic sit-down never chooses Dunkin, fast food, or unknown atmosphere',()=>{
 const places=[make(1,{name:'Dunkin Donuts',amenity:'cafe',indoor_seating:'yes',takeaway:'yes'}),make(2,{name:'Burger King',amenity:'restaurant',indoor_seating:'yes',description:'fine dining'}),make(3,{name:'Unknown Restaurant',amenity:'restaurant',indoor_seating:'yes'}),make(4,{name:'Candlelight Dinner',amenity:'restaurant',indoor_seating:'yes',description:'Intimate fine dining'})];
 for(let i=0;i<100;i++)assert.equal(chooseLocal(places,filters,[]).id,'osm-node-4');
 assert.equal(chooseLocal(places.slice(0,3),filters,[]),null);
});
test('dining preference excludes non-food; outdoor, beach and entertainment types remain distinct',()=>{
 const park=make(1,{name:'Park',leisure:'park'}),beach=make(2,{name:'Beach',natural:'beach'}),bowling=make(3,{name:'Bowl',leisure:'bowling_alley'});
 assert.equal(park.category,'outdoors');assert.equal(park.indoor,false);assert.equal(beach.category,'daytrip');assert.equal(bowling.category,'culture');
 assert.equal(chooseLocal([park,beach,bowling],{...filters,category:'all',mood:'anything'},[]),null);
});
test('browser production provider uses identical classification and correct OSM selectors',async()=>{
 const queries=[];const fetcher=async url=>{if(url.includes('zippopotam'))return {ok:true,json:async()=>({places:[{latitude:'40.75',longitude:'-73.99','place name':'Williamstown'}]})};queries.push(decodeURIComponent(url));return {ok:true,json:async()=>({elements:[{id:1,type:'node',lat:40.75,lon:-73.99,tags:{name:'Dunkin',amenity:'cafe',takeaway:'yes'}}]})};};
 const result=await browserDiscovery('08094',25,fetcher);assert.equal(result.activities.length,1);assert.equal(result.activities[0].moods.includes('romantic'),false);assert.deepEqual(result.activities[0].dining,['takeout']);assert.ok(queries.some(q=>q.includes('[leisure~')));assert.ok(queries.some(q=>q.includes('[natural=beach]')));
});

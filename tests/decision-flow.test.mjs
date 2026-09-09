import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverLocal, mergeLocalActivities, chooseLocal } from '../src/lib/discovery-client.mjs';
const origin={zip:'10001',city:'Williamstown',state:'NJ',lat:39.665,lon:-74.971};
const filters={category:'all',mood:'anything',radius:25,budget:200,dining:'any',date:'any',newOnly:false,indoor:'any',accessible:false,query:''};
const venue={id:'venue-1',title:'A named local restaurant',description:'A real listing',source:'OpenStreetMap',category:'food',moods:['fun'],lat:39.69,lon:-74.99};
test('cold-start picking waits for real discovery; simultaneous requests share a fetch',async()=>{
 let calls=0;let release;const gate=new Promise(resolve=>{release=resolve;});
 const fetcher=async()=>{calls++;await gate;return {ok:true,json:async()=>({location:origin,activities:[venue,{...venue,id:'idea',inspiration:true},{...venue,id:'search',source:'Live web search'}]})};};
 const first=discoverLocal('10001',25,fetcher),second=discoverLocal('10001',25,fetcher);assert.equal(first,second);assert.equal(calls,1);release();
 const result=await first;assert.deepEqual(result.activities,[venue]);const decision=chooseLocal(mergeLocalActivities([],[],result.activities,result.location),filters,[],[],()=>0);assert.equal(decision.id,venue.id);
});
test('roll again cycles actual results before repeating and never chooses ideas',()=>{
 const items=[venue,{...venue,id:'venue-2'},{...venue,id:'idea',inspiration:true},{...venue,id:'search',source:'Live web search'}];
 const first=chooseLocal(items,filters,[],[],()=>0);const next=chooseLocal(items,filters,[],[first.id],()=>0);assert.equal(first.id,'venue-1');assert.equal(next.id,'venue-2');assert.equal(chooseLocal(items.slice(2),filters,[]),null);
});
test('changed ZIP recalculates saved distances; new-only and strict preferences apply to real decisions',()=>{
 const far={...origin,lat:34,lon:-118};const merged=mergeLocalActivities([], [venue],[],far);assert.equal(chooseLocal(merged,filters,[]),null);
 assert.equal(chooseLocal([venue],{...filters,newOnly:true},[venue.id]),null);
 assert.equal(chooseLocal([venue],{...filters,dining:'takeout'},[]),null);
 const own={...venue,id:'own',personal:true,dining:['takeout']};assert.equal(chooseLocal([own],{...filters,dining:'takeout'},[]).id,'own');
});

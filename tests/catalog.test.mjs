import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverLocal,catalogResult,chooseLocal} from '../src/lib/discovery-client.mjs';
const filters={category:'food',mood:'romantic',radius:5,budget:200,dining:'sitdown',date:'any',indoor:'any'};
test('local dinner choices remain available without any network and cycle before repeating',async()=>{
 const r=await discoverLocal('08094',5,()=>{throw Error('No network');});const first=chooseLocal(r.activities,filters,[],[],()=>0);const second=chooseLocal(r.activities,filters,[],[first.id],()=>0);assert.deepEqual(new Set([first.title,second.title]),new Set(['Library IV','Monalisia']));assert.ok(r.activities.every(a=>a.distance<=5));
});
test('catalog respects remote locations and removes expired events',()=>{
 assert.equal(catalogResult({lat:34,lon:-118},25).activities.length,0);
 assert.equal(catalogResult({lat:39.665,lon:-74.971},25,new Date('2030-01-01')).activities.filter(a=>a.category==='events').length,0);
});

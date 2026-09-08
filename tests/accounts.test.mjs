import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placesKey, readCache, hydratePlaces, cleanPlaces } from '../src/lib/places-state.mjs';
test('guest and separate account caches never share places',()=>{
 const records=new Map();const storage={getItem:k=>records.get(k)};
 records.set(placesKey('alice'),JSON.stringify({data:{saved:['alice-place']},dirty:true}));
 assert.deepEqual(readCache(storage,'alice').data.saved,['alice-place']);assert.deepEqual(readCache(storage,'bob').data.saved,[]);assert.deepEqual(readCache(storage,null).data.saved,[]);
});
test('edits made before hydration survive and clean state loads from cloud',()=>{
 const local={saved:['local-edit']},remote={saved:['cloud']};assert.deepEqual(hydratePlaces(remote,local,true).saved,['local-edit']);assert.deepEqual(hydratePlaces(remote,local,false).saved,['cloud']);
});
test('invalid local and cloud data cannot enter the activity picker',()=>{const result=cleanPlaces({saved:[null,42,'valid','valid'],personal:[{},null,{id:'broken'}]});assert.deepEqual(result.saved,['valid']);assert.deepEqual(result.personal,[]);});

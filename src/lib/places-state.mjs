const categories = new Set(['all','food','outdoors','events','culture','daytrip']);
const moods = new Set(['anything','romantic','fun','chill','adventurous','family']);
export const emptyPlaces = () => ({saved:[],visited:[],personal:[],savedRecords:[]});
export function validActivity(a) { return a && typeof a.id==='string' && typeof a.title==='string' && typeof a.description==='string' && typeof a.source==='string' && categories.has(a.category) && Array.isArray(a.moods) && a.moods.every(m=>moods.has(m)); }
export function cleanPlaces(value) {
 const ids = a => Array.isArray(a) ? [...new Set(a.filter(x=>typeof x==='string'&&x.length<=200))].slice(0,500) : [];
 const records = a => Array.isArray(a) ? a.filter(validActivity).slice(0,200) : [];
 return {saved:ids(value?.saved),visited:ids(value?.visited),personal:records(value?.personal),savedRecords:records(value?.savedRecords)};
}
export const placesKey = uid => `elsewhere:places:${uid || 'guest'}`;
export function readCache(storage, uid) { try { const cache=JSON.parse(storage.getItem(placesKey(uid))||'null');return {data:cleanPlaces(cache?.data),dirty:Boolean(cache?.dirty)}; } catch {return {data:emptyPlaces(),dirty:false};} }
export function hydratePlaces(remote, local, dirty) { return dirty ? cleanPlaces(local) : cleanPlaces(remote); }

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterActivities, pickActivity, activityDate, milesBetween } from '../src/lib/picker.mjs';
const defaults={category:'all',mood:'anything',radius:25,budget:200,dining:'any',date:'any',newOnly:false,indoor:'any',accessible:false,query:''};
const base={id:'1',title:'A place',description:'Good time',category:'food',moods:['romantic'],source:'test'};
test('new-only removes visited places and no-repeat pick avoids previous result',()=>{
 const items=[base,{...base,id:'2'}];assert.deepEqual(filterActivities(items,{...defaults,newOnly:true},['1']),[items[1]]);assert.equal(pickActivity(items,'1',()=>0).id,'2');assert.equal(pickActivity([]),null);
});
test('strict budget, dining, access and setting exclude unknown facts',()=>{
 for(const change of [{budget:50},{dining:'takeout'},{accessible:true},{indoor:'indoor'}])assert.equal(filterActivities([base],{...defaults,...change}).length,0);
 const known={...base,price:0,dining:['takeout'],accessible:true,indoor:true};assert.equal(filterActivities([known],{...defaults,budget:0,dining:'takeout',accessible:true,indoor:'indoor'}).length,1);
});
test('date-only values retain the local calendar day',()=>{assert.equal(activityDate('2026-09-12').getDate(),12);assert.ok(Number.isNaN(+activityDate('2026-02-30')));});
test('ongoing events overlap today and past events disappear',()=>{
 const now=new Date(2026,8,12,15);const ongoing={...base,category:'events',date:'2026-09-11',endDate:'2026-09-13'};
 assert.equal(filterActivities([ongoing],{...defaults,date:'today'},[],now).length,1);
 assert.equal(filterActivities([{...ongoing,endDate:'2026-09-11'}],defaults,[],now).length,0);
 assert.equal(filterActivities([{...ongoing,date:'nonsense'}],defaults,[],now).length,0);
});
test('weekend handles Sunday and includes overlapping multi-day events',()=>{
 const now=new Date(2026,8,13,9);const a={...base,category:'events',date:'2026-09-11',endDate:'2026-09-14'};
 assert.equal(filterActivities([a],{...defaults,date:'weekend'},[],now).length,1);
});
test('distance recalculation separates a local venue from a remote location',()=>{assert.ok(milesBetween(39.665,-74.971,39.65738898,-75.053143)<5);assert.ok(milesBetween(34.05,-118.24,39.65738898,-75.053143)>2000);});

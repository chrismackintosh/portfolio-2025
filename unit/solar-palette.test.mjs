import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context={};vm.runInNewContext(readFileSync(new URL('../src/scripts/solar-palette.js',import.meta.url),'utf8'),context);
const resolve=context.CMSolarPalette.resolve;
const minute=60000,sunrise=Date.UTC(2026,10,16,14),sunset=sunrise+10*60*minute;
const state=(offset,extra={})=>({sky:'Sunny midday',dark:offset<0||offset>=600,condition:'clear',solar:{now:sunrise+offset*minute,sunrise,sunset},...extra});
const anchors=[[-60,'#0b111f'],[-20,'#727e9d'],[10,'#d8e0e8'],[90,'#d0deea'],[510,'#d0deea'],[590,'#d8d5e2'],[625,'#606b88'],[690,'#0b111f']];
for(const [offset,color]of anchors)test(`solar anchor ${offset} minutes preserves ${color}`,()=>assert.ok(resolve(state(offset)).gradient.includes(color)));
for(const [offset]of anchors)test(`continuous solar boundary at ${offset}`,()=>{
 const a=resolve(state(offset-.00001)),b=resolve(state(offset+.00001));assert.equal(a.ground,b.ground);assert.deepEqual(a.text,b.text);
});
test('unknown daylight keeps exact selected Sunset',()=>{
 const r=resolve(state(300,{condition:'unknown'}));assert.equal(r.ground,'#e2d8d8');assert.equal(r.gradient,'linear-gradient(165deg,#d8d5e2 0%,#e4d6d7 50%,#ead6c5 100%)');assert.equal(r.text.join(','),'#474054,#8a6a78');
});
test('manual dark is exact Night even at sunrise and with rain',()=>{
 const r=resolve(state(10,{dark:true,appearance:'dark',condition:'precipitation'}));assert.equal(r.gradient,'linear-gradient(165deg,#0b111f 0%,#0e1727 58%,#141c2c 100%)');assert.equal(r.ground,'#0e1727');
});
test('manual light after dark retains selected explicit light sky',()=>{
 const r=resolve(state(-100,{dark:false,appearance:'light',sky:'Sunset',condition:'unknown'}));assert.ok(r.gradient.includes('#d8d5e2'));assert.equal(r.text.join(','),'#474054,#8a6a78');
});
test('automatic dawn is colored around a dark card; text remains light',()=>{
 const r=resolve(state(-20));assert.ok(r.gradient.includes('#dfb8a1'));assert.equal(r.text.join(','),'#d6dfec,#848f9b');
});
test('cloud and rain mute but do not erase sunrise',()=>{
 const clear=resolve(state(10)),cloud=resolve(state(10,{condition:'cloudy'})),rain=resolve(state(10,{condition:'precipitation'}));assert.notEqual(clear.gradient,cloud.gradient);assert.notEqual(cloud.gradient,rain.gradient);assert.ok(!cloud.gradient.includes('#d6dfe5'));assert.ok(!rain.gradient.includes('#cbd3da'));
});
test('weather never brightens deep night',()=>{
 for(const condition of ['clear','cloudy','precipitation','unknown'])assert.equal(resolve(state(-100,{condition})).gradient,'linear-gradient(165deg,#0b111f 0%,#0e1727 58%,#141c2c 100%)');
});
test('no solar data remains backwards compatible',()=>assert.ok(resolve({sky:'Sunset',dark:false}).gradient.includes('#d8d5e2')));

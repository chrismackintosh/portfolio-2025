import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const weather=readFileSync(new URL('../src/scripts/nws-weather.js',import.meta.url),'utf8');
const theme=readFileSync(new URL('../src/scripts/theme-controls.js',import.meta.url),'utf8');
const key='cm-color-appearance';
function run({time='2026-11-13T19:00:00Z',saved,blocked=false,reduced=false}={}) {
 let now=Date.parse(time),id=0;const storage=new Map(saved===undefined?[]:[[key,saved]]),timers=new Map(),events=new Map(),classes=new Set(),attrs={};
 class Clock extends Date {constructor(...a){super(...(a.length?a:[now]));}static now(){return now;}}
 const on=(k,fn)=>events.set(k,[...(events.get(k)||[]),fn]);
 const root={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},offsetWidth:100};
 const button={setAttribute:(k,v)=>attrs[k]=v};
 const context={Date:Clock,Intl,JSON,Number,Array,Math,Set,AbortController,document:{hidden:false,documentElement:root,querySelectorAll:()=>[button],addEventListener:on},matchMedia:()=>({matches:reduced}),addEventListener:on,
 localStorage:{getItem:k=>{if(blocked)throw Error();return storage.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error();storage.set(k,v);},removeItem:k=>{if(blocked)throw Error();storage.delete(k);}},
 setInterval:()=>1,setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),fetch:()=>new Promise(()=>{})};
 vm.runInNewContext(weather,context);vm.runInNewContext(theme,context);
 const emit=(k,e={})=>(events.get(k)||[]).forEach(fn=>fn(e));
 return {context,storage,classes,attrs,emit,get now(){return now},setNow:n=>now=n,tick(){for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn()}},click(){emit('click',{target:{closest:()=>button}})},get state(){let s;context.CMTheme.subscribe(v=>s=v);return s}};
}
for(const saved of ['light','dark','bad','{}','null',JSON.stringify({version:1,mode:'dark',expiresAt:0})])test(`retires legacy or invalid ${saved}`,()=>{const r=run({saved});assert.equal(r.state.dark,false);assert.equal(r.storage.has(key),false)});
test('sunset expiration updates open page and clears persisted preference',()=>{const r=run();r.click();assert.equal(r.state.dark,true);const p=JSON.parse(r.storage.get(key));assert.equal(p.mode,'dark');assert.equal(p.expiresAt,r.context.CMWeather.nextBoundary());r.setNow(p.expiresAt);r.tick();assert.equal(r.storage.has(key),false);assert.equal(r.state.dark,true);});
test('night light selection expires at sunrise with solar sky freshly computed',()=>{const r=run({time:'2026-11-14T03:00:00Z'});r.click();assert.equal(r.state.dark,false);const p=JSON.parse(r.storage.get(key));assert.equal(p.mode,'light');r.setNow(p.expiresAt);r.tick();assert.equal(r.storage.has(key),false);assert.equal(r.state.dark,false);assert.equal(r.state.sky,'Sunrise')});
for(const event of ['visibilitychange','pageshow'])test(`expired choice after sleep clears on ${event}`,()=>{const r=run();r.click();const p=JSON.parse(r.storage.get(key));r.setNow(p.expiresAt+18*3600000);r.emit(event,{persisted:true});assert.equal(r.storage.has(key),false);assert.equal(r.state.dark,false)});
test('storage changes and clear synchronize without navigation',()=>{const r=run();r.storage.set(key,JSON.stringify({version:1,mode:'dark',expiresAt:r.now+3600000}));r.emit('storage',{key});assert.equal(r.state.dark,true);r.storage.clear();r.emit('storage',{key:null});assert.equal(r.state.dark,false)});
test('blocked storage supports a temporary choice and expires in memory',()=>{const r=run({blocked:true});r.click();assert.equal(r.state.dark,true);r.setNow(r.context.CMWeather.nextBoundary()+18*3600000);r.emit('visibilitychange');assert.equal(r.state.dark,false)});
test('reduced motion preserves pressed state without switch animation',()=>{const r=run({reduced:true});r.click();assert.equal(r.attrs['aria-pressed'],'true');assert.equal(r.classes.has('cm-theme-switching'),false)});
for(const time of ['2026-03-08T06:30:00Z','2026-03-08T07:30:00Z','2026-03-09T02:00:00Z','2026-11-01T06:30:00Z','2026-11-02T02:00:00Z','2026-12-31T23:59:00Z'])test(`next boundary remains solar aligned across ${time}`,()=>{const r=run({time});const end=r.context.CMWeather.nextBoundary();assert.ok(end>r.now&&end-r.now<24*3600000);assert.notEqual(r.context.CMWeather.current(end-1).dark,r.context.CMWeather.current(end).dark)});

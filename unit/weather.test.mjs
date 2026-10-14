import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/scripts/nws-weather.js',import.meta.url),'utf8');
const baseTime = Date.parse('2026-06-15T18:00:00Z');
const key = 'cm-nws-kden-v1';
function fixture(description='Clear',options={}) {
 return {properties:{station:'https://api.weather.gov/stations/KDEN',timestamp:new Date(baseTime-20*60000).toISOString(),textDescription:description,cloudLayers:[],presentWeather:[],...options}};
}
async function run({data=fixture(),cache,fail=false,hidden=false,brokenStorage=false,time=baseTime}={}) {
 let now=time;let calls=0;let request;let tick;
 const storage=new Map(cache===undefined?[]:[[key,cache]]);const states=[];
 class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const document={hidden,addEventListener(){}};
 const context={Date:Clock,Intl,JSON,Number,Array,AbortController,document,
  localStorage:{getItem:k=>{if(brokenStorage)throw new Error('blocked');return storage.get(k)??null;},setItem:(k,v)=>{if(brokenStorage)throw new Error('blocked');storage.set(k,v);}},
  setInterval:fn=>{tick=fn;return 1;},setTimeout,clearTimeout,
  fetch:async(url,options)=>{calls++;request={url,options};if(fail)throw new Error('offline');return {ok:true,json:async()=>data};}
 };
 vm.runInNewContext(source,context);context.CMWeather.start(s=>states.push(s));
 const flush=()=>new Promise(resolve=>setImmediate(resolve));await flush();
 return {states,storage,document,get calls(){return calls;},get request(){return request;},async advance(ms){now+=ms;tick();await flush();}};
}
for(const [description,options,sky] of [
 ['Clear',{},'Sunny midday'],['Overcast',{},'Cloudy'],['Light Rain',{},'Gray / rain'],
 ['',{cloudLayers:[{amount:'BKN'}]},'Cloudy'],['',{presentWeather:[{weather:'snow'}]},'Gray / rain']
]) test(`maps valid observation: ${description||JSON.stringify(options)}`,async()=>{
 const r=await run({data:fixture(description,options)});assert.equal(r.states.at(-1).sky,sky);assert.equal(r.states.at(-1).source,'NWS observation');
 assert.equal(r.calls,1);assert.equal(r.request.options.credentials,'omit');assert.equal(r.request.options.referrerPolicy,'no-referrer');
 assert.equal(r.request.url,'https://api.weather.gov/stations/KDEN/observations/latest');
 assert.equal(r.request.options.headers['User-Agent'],undefined);
});
for(const [name,data] of [
 ['stale',fixture('Rain',{timestamp:new Date(baseTime-121*60000).toISOString()})],
 ['future',fixture('Rain',{timestamp:new Date(baseTime+6*60000).toISOString()})],
 ['wrong station',fixture('Rain',{station:'https://api.weather.gov/stations/KJFK'})],
 ['unknown',fixture('Unknown')],['missing',{}],['invalid date',fixture('Rain',{timestamp:'bad'})]
])test(`falls back for ${name} data`,async()=>{const r=await run({data});assert.equal(r.states.at(-1).source,'Local solar estimate');assert.equal(r.states.at(-1).sky,'Sunny midday');});
test('fresh cache is reused across loads without a request',async()=>{
 const r=await run({cache:JSON.stringify({savedAt:baseTime-60000,data:{observedAt:baseTime-20*60000,condition:'cloudy'}})});
 assert.equal(r.calls,0);assert.equal(r.states.at(-1).sky,'Cloudy');await r.advance(15*60000);assert.equal(r.calls,1);
});
test('failed requests are throttled and solar fallback remains usable',async()=>{
 const r=await run({fail:true});assert.equal(r.states.at(-1).source,'Local solar estimate');await r.advance(60000);assert.equal(r.calls,1);await r.advance(15*60000);assert.equal(r.calls,2);
});
test('expired cached observation becomes solar fallback even on failure',async()=>{
 const r=await run({fail:true,cache:JSON.stringify({savedAt:baseTime,data:{observedAt:baseTime-119*60000,condition:'precipitation'}})});
 assert.equal(r.states.at(-1).sky,'Gray / rain');await r.advance(2*60000);assert.equal(r.states.at(-1).source,'Local solar estimate');
});
test('storage corruption and blocked storage do not break weather',async()=>{
 for(const options of [{cache:'bad-json'},{brokenStorage:true}]){const r=await run(options);assert.equal(r.states.at(-1).source,'NWS observation');}
});
test('hidden tabs do not request observations',async()=>{
 const r=await run({hidden:true});assert.equal(r.calls,0);r.document.hidden=false;await r.advance(60000);assert.equal(r.calls,1);
});

for (const [period, time] of [
 ['sunrise', Date.parse('2026-10-14T13:15:00Z')],
 ['sunset', Date.parse('2026-10-15T00:20:00Z')]
]) for (const [description, sky] of [['Fog/Mist','Cloudy'],['Light Rain','Gray / rain']]) {
 test(`${description} takes priority over the ${period} palette`, async()=>{
  const r=await run({time,data:fixture(description,{timestamp:new Date(time-20*60000).toISOString(),cloudLayers:[{amount:'OVC'}]})});
  assert.equal(r.states.at(-1).sky,sky);
  assert.equal(r.states.at(-1).source,'NWS observation');
 });
}
test('clear sunrise retains its solar palette',async()=>{
 const time=Date.parse('2026-10-14T13:15:00Z');
 const r=await run({time,data:fixture('Clear',{timestamp:new Date(time-60000).toISOString()})});
 assert.equal(r.states.at(-1).sky,'Sunrise');
});

for(const weather of ['rain','drizzle','snow','sleet','hail','thunderstorms','ice_pellets','freezing_rain','rain_showers']) {
 test(`structured NWS precipitation: ${weather}`,async()=>{
  const r=await run({data:fixture('',{presentWeather:[{weather}]})});
  assert.equal(r.states.at(-1).sky,'Gray / rain');
 });
}
for(const amount of ['BKN','OVC','VV']) test(`cloud layer ${amount} maps to cloudy`,async()=>{
 const r=await run({data:fixture('',{cloudLayers:[{amount}]})});assert.equal(r.states.at(-1).sky,'Cloudy');
});
for(const amount of ['CLR','SKC','FEW','SCT']) test(`cloud layer ${amount} maps to fair`,async()=>{
 const r=await run({data:fixture('',{cloudLayers:[{amount}]})});assert.equal(r.states.at(-1).sky,'Sunny midday');
});
for(const [time,sky,dark] of [
 ['2026-10-14T13:15:00Z','Sunrise',false],
 ['2026-10-14T18:00:00Z','Sunny midday',false],
 ['2026-10-15T00:20:00Z','Sunset',false],
 ['2026-10-15T01:15:00Z','Dusk',true],
 ['2026-10-15T04:00:00Z','Night',true]
])test(`solar fallback at ${time}: ${sky}`,async()=>{
 const r=await run({time:Date.parse(time),fail:true});assert.equal(r.states.at(-1).sky,sky);assert.equal(r.states.at(-1).dark,dark);
});

/* Solar light and observed weather are independent decorative layers.
   Pure palette calculation: no requests, timers, location access or storage. */
(() => {
  'use strict';
  const minute = 60000;
  // Ground, three sky stops, middle-stop position, intro ink, secondary ink.
  // Existing approved daytime palettes and Claude's Night palette are retained.
  const palettes = {
    Night: ['#0e1727','#0b111f','#0e1727','#141c2c',58,'#d6dfec','#848f9b'],
    Dawn: ['#b4a4b1','#727e9d','#b4a4b1','#dfb8a1',55,'#31414e','#846c74'],
    Sunrise: ['#e4deda','#d8e0e8','#e5dedf','#ebdccb',55,'#31414e','#846c74'],
    'Sunny midday': ['#dce5eb','#d0deea','#dce6eb','#e8e9e3',58,'#283c4e','#5a7785'],
    Cloudy: ['#dfe3e4','#d6dfe5','#e4e7e6','#e4e7e6',100,'#354550','#677578'],
    'Gray / rain': ['#d6dadd','#cbd3da','#d7dcdf','#dededb',55,'#2f3e47','#66747e'],
    Sunset: ['#e2d8d8','#d8d5e2','#e4d6d7','#ead6c5',50,'#474054','#8a6a78'],
    Dusk: ['#8e8197','#606b88','#8e8197','#ba9195',60,'#3a3f53','#756f8a']
  };
  const mix = (a,b,t) => '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
  function resolve(state) {
    const {now,sunrise,sunset} = state.solar || {};
    const valid = [now,sunrise,sunset].every(Number.isFinite) && sunset > sunrise;
    const daylight = valid && now >= sunrise && now < sunset;
    let values = (palettes[state.sky] || palettes.Sunset).slice();
    if (state.appearance === 'dark') values = palettes.Night.slice();
    // Manual light after dark keeps its existing explicit light treatment.
    else if (state.appearance === 'light' && !daylight) values = (palettes[state.sky] || palettes.Sunset).slice();
    else if (valid && state.condition === 'unknown' && daylight) values = palettes.Sunset.slice();
    else if (valid) {
      const frames = [[sunrise-60*minute,'Night'],[sunrise-20*minute,'Dawn'],[sunrise+10*minute,'Sunrise'],[sunrise+90*minute,'Sunny midday'],[sunset-90*minute,'Sunny midday'],[sunset-10*minute,'Sunset'],[sunset+25*minute,'Dusk'],[sunset+90*minute,'Night']];
      values = palettes.Night.slice();
      for (let i=1;i<frames.length;i++) {
        if (now < frames[i-1][0] || now >= frames[i][0]) continue;
        const t=(now-frames[i-1][0])/(frames[i][0]-frames[i-1][0]);
        values=palettes[frames[i-1][1]].map((a,j)=>j===4 ? a*(1-t)+palettes[frames[i][1]][j]*t : mix(a,palettes[frames[i][1]][j],t));
        break;
      }
      const veil = state.condition === 'cloudy' ? .35 : state.condition === 'precipitation' ? .55 : 0;
      if (veil) {
        const target=state.condition === 'precipitation' ? palettes['Gray / rain'] : palettes.Cloudy;
        // No weather brightening in deep night; fade its influence at twilight edges.
        const solarLight=Math.max(0,Math.min(1,(now-(sunrise-60*minute))/(40*minute),((sunset+90*minute)-now)/(65*minute)));
        values=values.map((v,i)=>i<4 ? mix(v,target[i],veil*solarLight) : v);
      }
    } else if (state.dark) values=palettes.Night.slice();
    const text = state.dark ? palettes.Night.slice(5) : values.slice(5);
    return {ground:values[0],gradient:`linear-gradient(165deg,${values[1]} 0%,${values[2]} ${Number(values[4].toFixed(3))}%,${values[3]} 100%)`,text};
  }
  globalThis.CMSolarPalette = {resolve};
})();

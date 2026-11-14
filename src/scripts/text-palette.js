/* One weather palette for the title and all light-mode secondary text. */
(() => {
  // Weather-tinted intro pairs; Night retains its existing accessible treatment.
  const palettes = {
    'Sunrise':['#31414e','#846c74'],
    'Sunny midday':['#283c4e','#5a7785'],
    'Cloudy':['#354550','#677578'],
    'Gray / rain':['#2f3e47','#66747e'],
    'Sunset':['#474054','#8a6a78'],
    'Dusk':['#3a3f53','#756f8a'],
    'Night':['#d6dfec','#848f9b']
  };
  const colors = state => state.dark ? palettes.Night : (palettes[state.sky] || palettes['Sunny midday']);
  globalThis.CMTextPalette = {colors};
  globalThis.CMTheme?.subscribe(state => {
    document.documentElement.style.setProperty('--cm-weather-secondary', colors(state)[1]);
  });
})();

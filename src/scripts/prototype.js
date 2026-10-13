(() => {
  const html = document.documentElement;
  const opening = document.querySelector('.cm-opening');
  const content = document.querySelector('.cm-sheet-content');
  const masthead = document.querySelector('.cm-masthead');
  const introName = document.querySelector('.cm-intro h1');
  const introBlocks = [...document.querySelectorAll('.cm-intro-title,.cm-intro-prose > p,.cm-intro-stack,.cm-intro-contact')];
  const timeline = document.querySelector('.cm-timeline');
  const stops = [...document.querySelectorAll('.cm-stop')];
  const railLinks = [...document.querySelectorAll('.cm-rail a')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const palettes = {
    'Sunrise': ['#e4deda','linear-gradient(165deg,#d8e0e8 0%,#e5dedf 55%,#ebdccb 100%)'],
    'Sunny midday': ['#dce5eb','linear-gradient(165deg,#d0deea 0%,#dce6eb 58%,#e8e9e3 100%)'],
    'Cloudy': ['#dfe3e4','linear-gradient(165deg,#d6dfe5 0%,#e4e7e6 100%)'],
    'Gray / rain': ['#d6dadd','linear-gradient(165deg,#cbd3da 0%,#d7dcdf 55%,#dededb 100%)'],
    'Sunset': ['#e2d8d8','linear-gradient(165deg,#d8d5e2 0%,#e4d6d7 50%,#ead6c5 100%)'],
    'Dusk': ['#d0d3df','linear-gradient(165deg,#c5cedd 0%,#d4d6e1 60%,#ded7de 100%)'],
    'Night': ['#151d2b','linear-gradient(165deg,#101725 0%,#192436 58%,#2b3547 100%)']
  };
  const textPalettes = {
    'Sunrise': ['#465d70','#765b64','#806348','#354c5e','#6c6d75'],
    'Sunny midday': ['#39566f','#4a6a79','#666a59','#304e65','#64717a'],
    'Cloudy': ['#4c6272','#627174','#646a67','#435862','#647174'],
    'Gray / rain': ['#435966','#5a6974','#666e71','#3d5260','#64717a'],
    'Sunset': ['#665b78','#815e6d','#8b634b','#5c4552','#796770'],
    'Dusk': ['#535a77','#6b6481','#766676','#484a62','#6d6b7c'],
    'Night': ['#b7c7df','#bac8d6','#d3bec9','#d6dfec','#aab8ca']
  };
  // Verified at >=4.5:1 across every sRGB gradient segment on both paper surfaces.
  function applyTextTreatment(){
    html.dataset.textTreatment='gradient';
  }
  let appearance = {sky:'Sunny midday',dark:false,source:'Local daylight'};
  let height = innerHeight, travel = 450, readingInset = 90, queued = false;
  const clamp = v => Math.max(0,Math.min(1,v));
  function update() {
    queued = false;
    const y = -opening.getBoundingClientRect().top;
    const progress = motion.matches ? 1 : clamp((y - Math.max(0,height-innerHeight))/travel);
    html.style.setProperty('--cm-progress', progress);
    // Hand off the identity only once the card name has left the viewport.
    const nameBottom = introName.getBoundingClientRect().bottom;
    const mastheadOpacity = motion.matches ? (nameBottom <= 0 ? 1 : 0) : clamp(-nameBottom / 56);
    html.style.setProperty('--cm-masthead-opacity',mastheadOpacity);
    masthead.setAttribute('aria-hidden',mastheadOpacity === 0 ? 'true' : 'false');
    masthead.inert = mastheadOpacity === 0;
    const viewport = innerHeight;
    // Keep readable text at full contrast until the entire block leaves the viewport.
    // The old fade started even at scrollY=0 on short mobile screens.
    introBlocks.forEach(block => {
      block.style.setProperty('--cm-intro-opacity', motion.matches || block.getBoundingClientRect().bottom > 0 ? 1 : 0);
    });
    const timelineRect = timeline.getBoundingClientRect();
    timeline.classList.toggle('cm-rail-engaged', timelineRect.top < viewport * .8 && timelineRect.bottom > readingInset);
    const readingLine=Math.min(viewport*.5,readingInset+24);
    let nearest = 0;
    stops.forEach((stop,i) => {
      const r = stop.getBoundingClientRect();
      if(r.top<=readingLine)nearest=i;
      stop.style.setProperty('--cm-reveal', motion.matches ? 1 : clamp((viewport-r.top)/(viewport*.62)));
      if(i===1) stop.style.setProperty('--cm-fork-progress',motion.matches?1:clamp((viewport-r.top)/(viewport*.7)));
    });
    railLinks.forEach((link,i)=>{
      link.classList.toggle('cm-concurrent',nearest>=4&&i>=4);
      if(i===nearest)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');
    });
    const start = stops[0].getBoundingClientRect().top + scrollY;
    const end = stops[5].getBoundingClientRect().top + scrollY;
    timeline.style.setProperty('--cm-timeline-progress',clamp((scrollY+readingLine-start)/Math.max(1,end-start)));
  }
  function layout() {
    html.style.setProperty('--cm-header-height',Math.ceil(masthead.getBoundingClientRect().height)+'px');
    readingInset=parseFloat(getComputedStyle(stops[0]).scrollMarginTop)||90;
    const inset = innerWidth<600 ? 20 : innerWidth<900 ? 40 : 80;
    html.style.setProperty('--cm-inset',inset+'px');
    html.style.setProperty('--cm-progress',motion.matches ? 1 : 0);
    // Measure natural content without the current stage's minimum height.
    content.style.minHeight='0';
    height=Math.max(innerHeight,Math.ceil(content.scrollHeight)+inset*2);
    content.style.minHeight='';
    travel=Math.round(Math.min(innerHeight,900)*.42);
    html.style.setProperty('--cm-height',height+'px');
    html.style.setProperty('--cm-sticky-top',Math.min(0,innerHeight-height)+'px');
    html.style.setProperty('--cm-travel',travel+'px');
    html.classList.toggle('cm-motion-ready',!motion.matches);
    update();
  }
  // Approved typography, independent of retired controls and preview URLs.
  const approvedWeights={name:550,body:400,timeline:400,company:550,detail:600};
  Object.entries(approvedWeights).forEach(([role,weight])=>
    html.style.setProperty('--cm-google-'+role+'-weight',weight));
  async function applyTypeface() {
    html.dataset.typeface='manrope';
    try {
      const loaded=await Promise.all([400,550,600].map(weight=>document.fonts.load(weight+' 18px "CM Manrope"')));
      if(loaded.some(faces=>!faces.length||faces.some(face=>face.status!=='loaded')))throw Error('Font unavailable');
      await document.fonts.ready;
    } catch {
      html.dataset.typeface='system';
    }
    layout();
  }
  function applyAppearance(state) {
    appearance=state;
    html.classList.toggle('cm-night',state.dark);
    const selected=palettes[state.sky]||palettes['Sunny midday'];
    // Keep the sky dark too when an automatic dawn/dusk palette crosses night.
    const colors=state.dark?palettes.Night:selected;
    const textColors=state.dark?textPalettes.Night:(textPalettes[state.sky]||textPalettes['Sunny midday']);
    ['start','middle','end'].forEach((part,i)=>html.style.setProperty('--cm-title-'+part,textColors[i]));
    html.style.setProperty('--cm-copy-ink',textColors[3]);
    html.style.setProperty('--cm-copy-soft',textColors[4]);
    html.style.setProperty('--cm-ground',colors[0]);
    html.style.setProperty('--cm-weather-gradient',colors[1]);
    html.style.setProperty('--cm-gradient',colors[1]);
  }
  // Play once when the sentence enters view, never while someone is revealing it.
  const redactionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const button=entry.target;
      if(!motion.matches && button.dataset.revealed!=='true' && !button.matches(':hover,:focus-within')){
        button.classList.add('is-redacting');
      }
      redactionObserver.unobserve(button);
    });
  },{threshold:.65}) : null;
  document.querySelectorAll('.cm-redaction').forEach(button=>{
    redactionObserver?.observe(button);
    button.addEventListener('animationend',event=>{
      if(event.animationName==='cm-redact-sweep')button.classList.remove('is-redacting');
    });
    button.addEventListener('click',()=>{
      button.dataset.revealed='true';
      button.removeAttribute('aria-describedby');
    });
    button.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        if(!event.repeat)button.click();
      }
    });
  });
  applyTextTreatment();
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(!target)return;e.preventDefault();target.focus({preventScroll:true});target.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});history.replaceState(null,'',a.getAttribute('href'));}));
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
  addEventListener('resize',layout,{passive:true});
  motion.addEventListener('change',layout);
  layout();
  const initialTypeface=applyTypeface();
  applyAppearance(appearance);
  if(globalThis.CMTheme)globalThis.CMTheme.subscribe(applyAppearance);
  addEventListener('load',async()=>{await initialTypeface;layout();if(!globalThis.CMWorkNavigation?.restoreHomePosition() && location.hash){const target=document.getElementById(location.hash.slice(1));if(target)target.scrollIntoView({behavior:'instant'});}globalThis.CMWorkNavigation?.completeArrival();});
})();

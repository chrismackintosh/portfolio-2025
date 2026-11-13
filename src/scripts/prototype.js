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
  const compact = matchMedia('(max-width: 600px)');
  const palettes = {
    'Sunrise': ['#e4deda','linear-gradient(165deg,#d8e0e8 0%,#e5dedf 55%,#ebdccb 100%)'],
    'Sunny midday': ['#dce5eb','linear-gradient(165deg,#d0deea 0%,#dce6eb 58%,#e8e9e3 100%)'],
    'Cloudy': ['#dfe3e4','linear-gradient(165deg,#d6dfe5 0%,#e4e7e6 100%)'],
    'Gray / rain': ['#d6dadd','linear-gradient(165deg,#cbd3da 0%,#d7dcdf 55%,#dededb 100%)'],
    'Sunset': ['#e2d8d8','linear-gradient(165deg,#d8d5e2 0%,#e4d6d7 50%,#ead6c5 100%)'],
    'Dusk': ['#d0d3df','linear-gradient(165deg,#c5cedd 0%,#d4d6e1 60%,#ded7de 100%)'],
    'Night': ['#151d2b','linear-gradient(165deg,#101725 0%,#192436 58%,#2b3547 100%)']
  };
  // Weather-tinted intro pairs; Night retains its existing accessible treatment.
  const introPalettes = {
    'Sunrise':['#31414e','#846c74'],
    'Sunny midday':['#283c4e','#5a7785'],
    'Cloudy':['#354550','#677578'],
    'Gray / rain':['#2f3e47','#66747e'],
    'Sunset':['#474054','#8a6a78'],
    'Dusk':['#3a3f53','#756f8a'],
    'Night':['#d6dfec','#848f9b']
  };
  function applyTextTreatment(){
    html.dataset.textTreatment='solid';
  }
  const mobileWheatOptions = () => compact.matches
    ? {motion:navigator.connection?.saveData ? 'none' : 'hover',speed:.35,fps:8,cell:7,maxDpr:1,burst:1600,interactive:false,refreshMotion:false}
    : {motion:'always',speed:.55,fps:12,cell:5,maxDpr:2,burst:2200,interactive:true,refreshMotion:true};
  const wheat = globalThis.CMWheat?.mount(document.querySelector('.cm-wheat'), mobileWheatOptions());
  compact.addEventListener('change',()=>{wheat?.set({...mobileWheatOptions(),...(breezePaused ? {motion:'none'} : {})});});
  const breezeButton = document.querySelector('.cm-wheat-pause');
  let breezePaused = false;
  breezeButton?.addEventListener('click', () => {
    breezePaused = !breezePaused;
    wheat?.set({motion:breezePaused ? 'none' : 'always'});
    const label = breezePaused ? 'Resume breeze' : 'Pause breeze';
    breezeButton.setAttribute('aria-label',label);
    breezeButton.setAttribute('title',label);
    breezeButton.dataset.paused = String(breezePaused);
  });
  addEventListener('pagehide', event => { if (!event.persisted) wheat?.destroy(); });
  let appearance = {sky:'Sunny midday',dark:false,source:'Local daylight'};
  let height = innerHeight, travel = 450, readingInset = 90, queued = false;
  const clamp = v => Math.max(0,Math.min(1,v));
  function update() {
    queued = false;
    const y = -opening.getBoundingClientRect().top;
    const progress = motion.matches || compact.matches ? 1 : clamp((y - Math.max(0,height-innerHeight))/travel);
    html.style.setProperty('--cm-progress', progress);
    // Hand off the identity only once the card name has left the viewport.
    const nameBottom = introName.getBoundingClientRect().bottom;
    const mastheadOpacity = motion.matches ? (nameBottom <= 0 ? 1 : 0) : clamp(-nameBottom / 56);
    html.style.setProperty('--cm-masthead-opacity',mastheadOpacity);
    masthead.setAttribute('aria-hidden',mastheadOpacity === 0 ? 'true' : 'false');
    masthead.inert = mastheadOpacity === 0;
    const viewport = innerHeight;
    // Fade the selected intro content only after the card has filled the viewport.
    // Phones retain ordinary reading flow; reduced motion skips this effect.
    const fillEnd = Math.max(0,height-innerHeight) + travel;
    const fadeDistance = Math.min(300,innerHeight * .3);
    const focused = content.contains(document.activeElement);
    const opacity = motion.matches || compact.matches || focused ? 1 : 1-clamp((y-fillEnd)/fadeDistance);
    content.style.opacity = String(opacity);
    content.inert = opacity === 0;
    introBlocks.forEach(block => block.style.setProperty('--cm-intro-opacity',1));
    const timelineRect = timeline.getBoundingClientRect();
    timeline.classList.toggle('cm-rail-engaged', timelineRect.top < viewport * .8 && timelineRect.bottom > readingInset);
    if (!timeline.classList.contains('cm-journey-enabled')) {
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
  }
  function layout() {
    // Overlap fractional header pixels so the sticky mobile rail cannot leave a slit.
    html.style.setProperty('--cm-header-height',Math.floor(masthead.getBoundingClientRect().height)+'px');
    readingInset=parseFloat(getComputedStyle(stops[0]).scrollMarginTop)||90;
    if (compact.matches) {
      // The phone intro stays in normal flow, independent of browser-toolbar resizing.
      html.style.setProperty('--cm-inset','0px');
      html.style.setProperty('--cm-progress','1');
      html.classList.remove('cm-motion-ready');
      update();
      return;
    }
    // Give short, open landscape views the approved tablet surround.
    const shortLandscape = innerWidth <= 1100 && innerWidth > innerHeight && innerHeight <= 800;
    const inset = innerWidth<600 ? 20 : innerWidth<900 || shortLandscape ? 80 : 184;
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
    const textColors=state.dark?['#d6dfec','#848f9b']:['#26313b','#767676'];
    const introColors=state.dark ? introPalettes.Night : (introPalettes[state.sky] || introPalettes['Sunny midday']);
    html.style.setProperty('--cm-intro-name',introColors[0]);
    html.style.setProperty('--cm-intro-role',introColors[1]);
    html.style.setProperty('--cm-copy-ink',textColors[0]);
    html.style.setProperty('--cm-copy-soft',textColors[1]);
    html.style.setProperty('--cm-ground',colors[0]);
    html.style.setProperty('--cm-weather-gradient',colors[1]);
    html.style.setProperty('--cm-gradient',colors[1]);
    wheat?.refresh();
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
  // Only the intro caret gets a deliberate, slower transition. Other anchors
  // retain native scrolling. Any new gesture gives control straight back.
  let cancelIntroScroll = () => {};
  function scrollFromIntro(target) {
    cancelIntroScroll();
    target.focus({preventScroll:true});
    if (motion.matches) { target.scrollIntoView({behavior:'instant',block:'start'}); return; }
    const finishCue = globalThis.CMHorizontalTimeline?.beginIntroScroll();
    const from = scrollY;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const to = Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,
      from + target.getBoundingClientRect().top - margin));
    const duration = 1500, started = performance.now();
    let frame = 0;
    const inputs = ['wheel','touchstart','pointerdown','keydown','resize','pagehide'];
    const cancel = (completed = false) => {
      cancelAnimationFrame(frame);
      inputs.forEach(type=>removeEventListener(type,cancel,true));
      motion.removeEventListener('change',reduce);
      cancelIntroScroll = () => {};
      finishCue?.(completed === true);
    };
    const reduce = () => { cancel(); if(motion.matches)target.scrollIntoView({behavior:'instant',block:'start'}); };
    inputs.forEach(type=>addEventListener(type,cancel,{capture:true,passive:true}));
    motion.addEventListener('change',reduce);
    cancelIntroScroll = cancel;
    const tick = now => {
      const progress = clamp((now-started)/duration);
      const eased = progress < .5 ? 4*progress**3 : 1-(-2*progress+2)**3/2;
      scrollTo({top:from+(to-from)*eased,behavior:'instant'});
      if(progress<1)frame=requestAnimationFrame(tick);else cancel(true);
    };
    frame=requestAnimationFrame(tick);
  }
  applyTextTreatment();
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(!target)return;e.preventDefault();cancelIntroScroll();if(a.matches('.cm-intro-next')){scrollFromIntro(target);history.replaceState(null,'',a.getAttribute('href'));return;}if(globalThis.CMHorizontalTimeline?.goTo(target)){history.replaceState(null,'',a.getAttribute('href'));return;}target.focus({preventScroll:true});target.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'start'});history.replaceState(null,'',a.getAttribute('href'));}));
  addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(update);}},{passive:true});
  content.addEventListener('focusin',()=>requestAnimationFrame(update));
  content.addEventListener('focusout',()=>requestAnimationFrame(update));
  addEventListener('resize',layout,{passive:true});
  motion.addEventListener('change',layout);
  layout();
  const initialTypeface=applyTypeface();
  applyAppearance(appearance);
  if(globalThis.CMTheme)globalThis.CMTheme.subscribe(applyAppearance);
  addEventListener('load',async()=>{await initialTypeface;layout();if(!globalThis.CMWorkNavigation?.restoreHomePosition() && location.hash){const target=document.getElementById(location.hash.slice(1));if(target&&!globalThis.CMHorizontalTimeline?.goTo(target,'instant'))target.scrollIntoView({behavior:'instant'});}globalThis.CMWorkNavigation?.completeArrival();});
})();

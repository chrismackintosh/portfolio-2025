/* Reversible enhancement: original content and anchors remain the source of truth. */
(() => {
 const timeline=document.querySelector('.cm-timeline');
 if(!timeline)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const heading=timeline.querySelector('.cm-timeline-heading');
 const grid=timeline.querySelector('.cm-timeline-grid');
 const rail=timeline.querySelector('.cm-rail');
 const stops=timeline.querySelector('.cm-stops');
 const articles=[...stops.querySelectorAll('.cm-stop')];
 // Keep chronology independent of the visible chapter labels.
 const years=articles.map(article=>Number(article.dataset.startYear));
 const stage=document.createElement('div');stage.className='cm-journey-stage cm-timeline-grid';
 const head=document.createElement('div');head.className='cm-journey-head';
 const viewport=document.createElement('div');viewport.className='cm-journey-window';
 const counter=document.createElement('div');counter.className='cm-journey-counter';counter.setAttribute('aria-hidden','true');
 const year=document.createElement('div');year.className='cm-journey-year';
 const strips=Array.from({length:4},()=>{
  const digit=document.createElement('span');digit.className='cm-journey-digit';
  const strip=document.createElement('span');strip.className='cm-journey-digit-strip';
  for(let i=0;i<30;i++){const number=document.createElement('span');number.textContent=String(i%10);strip.append(number);}
  digit.append(strip);year.append(digit);return strip;
 });
 counter.append(year);
 head.append(heading,counter,rail);viewport.append(stops);stage.append(head,viewport);grid.replaceWith(stage);
 let enabled=false,step=0,active=0,frame=0,layoutFrame=0;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 // Roll continuously through each year; the journey already supplies the easing.
 // Higher wheels turn only at a carry. Repeated digits keep 9 → 0 continuous.
 function setYear(value){
  const whole=Math.floor(value+1e-6),fraction=clamp(value-whole,0,1);
  const roll=fraction;
  strips.forEach((strip,i)=>{
   const place=10**(3-i),digit=Math.floor(whole/place)%10;
   const carry=whole%place===place-1?roll:0;
   strip.style.transform=`translate3d(0,-${10+digit+carry}em,0)`;
  });
 }
 function update(){
  frame=0;if(!enabled)return;
  const position=clamp(viewport.scrollLeft/Math.max(1,step),0,articles.length-1);
  const index=Math.floor(position),next=Math.min(index+1,years.length-1);
  setYear(years[index]+(years[next]-years[index])*(position-index));
  active=Math.round(position);
 }
 function queue(){if(!frame)frame=requestAnimationFrame(update);}
 function layout(){
  layoutFrame=0;
  const wasEnabled=enabled;
  const position=step?viewport.scrollLeft/step:0;
  enabled=!motion.matches;
  timeline.classList.toggle('cm-journey-enabled',enabled);
  if(!enabled){
   viewport.removeAttribute('tabindex');viewport.removeAttribute('role');viewport.removeAttribute('aria-label');
   viewport.scrollLeft=0;active=0;return;
  }
  viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','Career timeline. Scroll horizontally or use left and right arrow keys to move between chapters.');
  step=articles[1].getBoundingClientRect().left-articles[0].getBoundingClientRect().left;
  viewport.scrollLeft=wasEnabled?position*step:0;
  update();
 }
 const queueLayout=()=>{if(!layoutFrame)layoutFrame=requestAnimationFrame(layout);};
 function goTo(target,behavior='smooth',reveal=true){
  if(!enabled)return false;
  const index=articles.findIndex(article=>article===target||article.contains(target));
  if(index<0)return false;
  if(nudgeAnimation)cancelNudge();
  layout();
  viewport.scrollTo({left:index*step,behavior});
  if(reveal)timeline.scrollIntoView({block:'start',behavior});
  return true;
 }
 // Briefly hold vertical gestures for one cue, then always release native scrolling.
 let nudgeReady=false,nudgePlayed=false,nudgeTimer=0,nudgeAnimation=null,releaseTimer=0;
 let touchX=0,touchY=0,heldScrollY=null;
 function holdPosition(){
  if(heldScrollY===null)return;
  // Follow the heading through late font/scrollbar reflow above the timeline.
  const header=document.querySelector('.cm-masthead')?.getBoundingClientRect().bottom||0;
  heldScrollY=Math.max(0,Math.round(scrollY+heading.getBoundingClientRect().top-header-16));
  if(Math.abs(scrollY-heldScrollY)>1)scrollTo({top:heldScrollY,behavior:'instant'});
 }
 function releaseScroll(){
  clearTimeout(releaseTimer);releaseTimer=0;
  heldScrollY=null;document.documentElement.classList.remove('cm-timeline-hold');
  removeEventListener('wheel',holdWheel,true);
  removeEventListener('touchmove',holdTouch,true);
  removeEventListener('keydown',cancelNudge,true);
 }
 function cancelNudge(){
  clearTimeout(nudgeTimer);nudgeTimer=0;nudgePlayed=true;
  nudgeAnimation?.cancel();nudgeAnimation=null;
  releaseScroll();removeEventListener('scroll',scheduleNudge);
 }
 function holdWheel(event){
  if(event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)){cancelNudge();return;}
  if(event.cancelable)event.preventDefault();
 }
 function holdTouch(event){
  const touch=event.touches[0];
  if(event.touches.length!==1||!touch){cancelNudge();return;}
  if(Math.abs(touch.clientX-touchX)>Math.abs(touch.clientY-touchY)){cancelNudge();return;}
  if(event.cancelable)event.preventDefault();
 }
 function nudgeInView(){
  const rect=viewport.getBoundingClientRect();
  const header=document.querySelector('.cm-masthead')?.getBoundingClientRect().bottom||0;
  const available=innerHeight-header;
  const visible=Math.min(rect.bottom,innerHeight)-Math.max(rect.top,header);
  // Long phone cards cannot fit in one screen; wait until their reading area fills it.
  return rect.top>=header-1&&rect.top<innerHeight*.5&&visible>=Math.min(rect.height,available*.6);
 }
 function scheduleNudge(){
  if(nudgeAnimation){holdPosition();return;}
  if(!nudgeReady||nudgeTimer||nudgePlayed||document.hidden||motion.matches||!enabled||viewport.scrollLeft>1||!nudgeInView())return;
  nudgeTimer=setTimeout(()=>{
   nudgeTimer=0;
   if(nudgePlayed||document.hidden||motion.matches||viewport.scrollLeft>1||!nudgeInView())return;
   nudgePlayed=true;
   // Pin the section heading below the masthead while the real track advances.
   const header=document.querySelector('.cm-masthead')?.getBoundingClientRect().bottom||0;
   heldScrollY=Math.max(0,Math.round(scrollY+heading.getBoundingClientRect().top-header-16));
   document.documentElement.classList.add('cm-timeline-hold');
   holdPosition();
   addEventListener('wheel',holdWheel,{passive:false,capture:true});
   addEventListener('touchmove',holdTouch,{passive:false,capture:true});
   addEventListener('keydown',cancelNudge,true);
   // Scroll the real track so both the cards and odometer arrive at 2023 together.
   const endYear=2023;
   const index=years.findIndex((year,i)=>year<=endYear&&years[i+1]>endYear);
   if(index<0){cancelNudge();return;}
   const target=step*(index+(endYear-years[index])/(years[index+1]-years[index]));
   const from=viewport.scrollLeft,started=performance.now();
   const animation={frame:0,cancel(){cancelAnimationFrame(this.frame);}};
   nudgeAnimation=animation;
   // Independent failsafe releases input even if animation frames are interrupted.
   releaseTimer=setTimeout(cancelNudge,1900);
   function advance(now){
    if(nudgeAnimation!==animation)return;
    holdPosition();
    const progress=clamp((now-started)/1600,0,1);
    // Build speed through most of the journey, then land without a hard stop.
    const eased=progress<.8?1.25*progress*progress:1-5*(1-progress)**2;
    viewport.scrollLeft=from+(target-from)*eased;
    update();
    if(progress<1)animation.frame=requestAnimationFrame(advance);
    else{nudgeAnimation=null;releaseScroll();removeEventListener('scroll',scheduleNudge);}
   }
   animation.frame=requestAnimationFrame(advance);
  },40);
 }
 addEventListener('touchstart',event=>{
  const touch=event.touches[0];if(touch){touchX=touch.clientX;touchY=touch.clientY;}
 },{passive:true});
 viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch')cancelNudge();},{passive:true});
 viewport.addEventListener('wheel',event=>{if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))cancelNudge();},{passive:true});
 viewport.addEventListener('keydown',cancelNudge,{passive:true});
 viewport.addEventListener('scroll',()=>{if(!nudgeAnimation&&viewport.scrollLeft>1)cancelNudge();},{passive:true});
 addEventListener('scroll',scheduleNudge,{passive:true});
 addEventListener('resize',()=>{if(nudgeAnimation)cancelNudge();else scheduleNudge();},{passive:true});
 motion.addEventListener('change',()=>{if(motion.matches)cancelNudge();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelNudge();});
 addEventListener('pagehide',cancelNudge);
 // Initial font layout and hash restoration must settle before the cue can start.
 const loaded=document.readyState==='complete'?Promise.resolve():new Promise(resolve=>addEventListener('load',resolve,{once:true}));
 Promise.all([loaded,document.fonts.ready]).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
  const target=document.getElementById(location.hash.slice(1));
  if(target)goTo(target,'instant');
  nudgeReady=true;scheduleNudge();
 })));
 globalThis.CMHorizontalTimeline={goTo};
 viewport.addEventListener('scroll',queue,{passive:true});
 viewport.addEventListener('focusin',event=>goTo(event.target,'instant',false));
 viewport.addEventListener('keydown',event=>{
  if(event.target!==viewport||!enabled)return;
  const offset=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  if(!offset)return;
  event.preventDefault();goTo(articles[clamp(active+offset,0,articles.length-1)],'smooth',false);
 });
 addEventListener('resize',queueLayout,{passive:true});motion.addEventListener('change',queueLayout);
 const resize=new ResizeObserver(queueLayout);resize.observe(document.querySelector('.cm-opening'));resize.observe(head);
 document.fonts.ready.then(queueLayout);addEventListener('load',()=>{
  layout();const target=document.getElementById(location.hash.slice(1));if(target)goTo(target,'instant');
 });
 layout();
})();

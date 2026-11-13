import{test,expect}from'@playwright/test';
for(const height of [720,900,1000])test(`height ${height} caret progression remains smooth before the chapter cue`,async({page},info)=>{
 await page.setViewportSize({width:1440,height});await page.goto('/');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
 await page.evaluate(()=>{const rows:any[]=[];(window as any).__frames=rows;const t=performance.now();document.querySelector('.cm-intro-next')!.addEventListener('click',()=>{(window as any).__clicked=performance.now()-t},{once:true});const sample=()=>{rows.push({t:performance.now()-t,y:scrollY,hold:document.documentElement.classList.contains('cm-timeline-hold')});if(performance.now()-t<3500)requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 await page.getByRole('link',{name:'Explore the work',exact:true}).click();await page.waitForTimeout(3600);
 const rows=await page.evaluate(()=>(window as any).__frames) as {t:number,y:number,hold:boolean}[];
 const steps=rows.slice(1).map((r,i)=>({t:r.t,delta:r.y-rows[i].y,hold:r.hold}));
 console.log(info.project.name,height,await page.evaluate(()=>(window as any).__clicked),JSON.stringify({max:Math.max(...steps.map(r=>r.delta)),min:Math.min(...steps.map(r=>r.delta)),hold:rows.find(r=>r.hold),jumps:steps.filter(r=>r.delta>100||r.delta< -2)}));
 expect(Math.min(...steps.map(r=>r.delta))).toBeGreaterThanOrEqual(-2);const firstHold=rows.find(r=>r.hold);expect(firstHold).toBeDefined();expect(firstHold!.t-await page.evaluate(()=>(window as any).__clicked)).toBeGreaterThanOrEqual(1490);
});

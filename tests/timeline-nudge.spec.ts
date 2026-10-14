import {test,expect,type Page} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',r=>r.abort());});
const track=(page:Page)=>page.locator('.cm-journey-window');
async function started(page:Page){await expect.poll(()=>track(page).evaluate(e=>e.scrollLeft),{intervals:[10]}).toBeGreaterThan(1);}
async function target(page:Page){return page.locator('.cm-stop').evaluateAll(es=>(es[1].getBoundingClientRect().left-es[0].getBoundingClientRect().left)*10/14);}
async function released(page:Page){
 await expect.poll(()=>track(page).evaluate(e=>e.dispatchEvent(new WheelEvent('wheel',{deltaY:1,bubbles:true,cancelable:true}))),{timeout:1500,intervals:[20]}).toBe(true);
}
async function visibleYear(page:Page){return page.locator('.cm-journey-digit').evaluateAll(ds=>ds.map(d=>{
 const top=d.getBoundingClientRect().top;
 return [...d.querySelectorAll('.cm-journey-digit-strip>span')].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-top)-Math.abs(b.getBoundingClientRect().top-top))[0].textContent;
}).join(''));}
for(const viewport of [{width:1440,height:900},{width:375,height:800}]){
 test(`scrolls to visible 2014 once and stays there at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/#stop-1');
  await started(page);
  const y=await page.evaluate(()=>scrollY),end=await target(page);
  await expect.poll(()=>visibleYear(page)).toBe('2014');await released(page);
  expect(await track(page).evaluate(e=>e.scrollLeft)).toBeCloseTo(end,0);
  expect(await page.evaluate(()=>scrollY)).toBe(y);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.locator('.cm-timeline').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  await page.waitForTimeout(1000);
  expect(await track(page).evaluate(e=>e.scrollLeft)).toBeCloseTo(end,0);
 });
}
test('pointer interaction stops automatic movement immediately',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 await track(page).dispatchEvent('pointerdown');const x=await track(page).evaluate(e=>e.scrollLeft);
 await page.waitForTimeout(1000);expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(x);await released(page);
});
test('reduced motion never auto-scrolls or holds vertical input',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#stop-1');
 await page.waitForTimeout(1000);
 expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(0);await released(page);
 await expect(page.locator('.cm-timeline')).not.toHaveClass(/cm-journey-enabled/);
});
test('vertical wheel pauses until 2014, then natural scrolling resumes',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 const y=await page.evaluate(()=>scrollY);
 await page.mouse.move(600,400);await page.mouse.wheel(0,180);await page.waitForTimeout(80);
 expect(await page.evaluate(()=>scrollY)).toBe(y);
 await released(page);expect(await visibleYear(page)).toBe('2014');
 await page.mouse.wheel(0,180);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y+100);
});
test('horizontal wheel cancels the automatic move and scrolls content immediately',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 await page.mouse.move(600,400);await page.mouse.wheel(150,0);await released(page);
 await expect.poll(()=>track(page).evaluate(e=>e.scrollLeft)).toBeGreaterThan(50);
 await page.waitForTimeout(200);const x=await track(page).evaluate(e=>e.scrollLeft);
 await page.waitForTimeout(1000);expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(x);
});
test('Escape immediately releases the pause and stops automatic movement',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/#stop-1');await started(page);
 await page.keyboard.press('Escape');const x=await track(page).evaluate(e=>e.scrollLeft);await released(page);
 const y=await page.evaluate(()=>scrollY);await page.mouse.move(600,400);await page.mouse.wheel(0,180);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y+100);
 await page.waitForTimeout(1000);expect(await track(page).evaluate(e=>e.scrollLeft)).toBe(x);
});
test('normal downward scrolling triggers the move on arrival',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{const t=document.querySelector('.cm-timeline')!;scrollTo({top:t.getBoundingClientRect().top+scrollY-400,behavior:'instant'});});
 await page.mouse.move(600,600);await page.mouse.wheel(0,260);await started(page);
 await expect.poll(()=>visibleYear(page)).toBe('2014');await released(page);
});

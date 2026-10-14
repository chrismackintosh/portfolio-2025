import {test,expect, type Page} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('https://api.weather.gov/**',r=>r.abort());});
// Read the actual visible glyphs, rather than a duplicate state attribute.
async function visibleYear(page:Page){
 return page.locator('.cm-journey-digit').evaluateAll(digits=>digits.map(digit=>{
  const top=digit.getBoundingClientRect().top;
  return [...digit.querySelectorAll('.cm-journey-digit-strip>span')].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-top)-Math.abs(b.getBoundingClientRect().top-top))[0].textContent;
 }).join(''));
}
async function scrollToPosition(page:Page,position:number){
 await page.locator('.cm-journey-window').evaluate((viewport,position)=>{
  const articles=viewport.querySelectorAll('.cm-stop');
  const step=articles[1].getBoundingClientRect().left-articles[0].getBoundingClientRect().left;
  viewport.scrollTo({left:step*position,behavior:'instant'});
 },position);
}
test('year sits above the story and visits every year forward and backward',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.cm-timeline')).not.toHaveClass(/cm-journey-pinned/);
 await expect(page.locator('.cm-rail')).toBeHidden();await expect(page.locator('.cm-journey-hint')).toHaveCount(0);
 const year=await page.locator('.cm-journey-year').boundingBox(),window=await page.locator('.cm-journey-window').boundingBox();
 expect(year!.y+year!.height).toBeLessThan(window!.y);
 const years=[2004,2018,2018,2021,2023,2026];
 for(const target of [...Array.from({length:23},(_,i)=>2004+i),...Array.from({length:22},(_,i)=>2025-i)]){
  const index=years.findIndex((y,i)=>y<=target&&years[i+1]>target);
  const position=target===2026?5:index+(target-years[index]+.02)/(years[index+1]-years[index]);
  await scrollToPosition(page,position);
  await expect.poll(()=>visibleYear(page)).toBe(String(target));
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1440);
});
test('desktop edge-to-edge cards peek, bleed off the left, and allow normal vertical scrolling',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 // Manual-scroll checks begin with interaction, dismissing the separate entry cue.
 await page.locator('.cm-journey-window').dispatchEvent('pointerdown');
 await page.locator('.cm-timeline').scrollIntoViewIfNeeded();
 const geometry=await page.evaluate(()=>{
  const v=document.querySelector('.cm-journey-window')!,cards=document.querySelectorAll('.cm-stop');
  return {left:v.getBoundingClientRect().left,right:v.getBoundingClientRect().right,mask:getComputedStyle(v).maskImage,first:cards[0].getBoundingClientRect().left,next:cards[1].getBoundingClientRect().left};
 });
 expect(geometry.left).toBe(0);expect(geometry.right).toBe(1440);expect(geometry.mask).toBe('none');
 expect(geometry.first).toBeGreaterThan(0);expect(geometry.next).toBeLessThan(1440);
 await scrollToPosition(page,.5);
 await expect.poll(()=>page.locator('.cm-stop').first().evaluate(e=>e.getBoundingClientRect().left)).toBeLessThan(0);
 const before=await page.evaluate(()=>({y:scrollY,x:document.querySelector('.cm-journey-window')!.scrollLeft}));
 await page.mouse.move(600,400);await page.mouse.wheel(0,160);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before.y+100);
 expect(await page.locator('.cm-journey-window').evaluate(e=>e.scrollLeft)).toBeCloseTo(before.x,0);
 await scrollToPosition(page,5);await expect.poll(()=>visibleYear(page)).toBe('2026');
 await page.locator('.cm-journey-window').focus();await page.keyboard.press('ArrowLeft');
 await expect.poll(()=>visibleYear(page)).toBe('2023');
});
test('phone uses native horizontal scrolling with no mini timeline or page pinning',async({page})=>{
 await page.setViewportSize({width:375,height:800});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.cm-timeline')).not.toHaveClass(/cm-journey-pinned/);
 await expect(page.locator('.cm-rail')).toBeHidden();
 // Manual-scroll checks begin with interaction, dismissing the separate entry cue.
 await page.locator('.cm-journey-window').dispatchEvent('pointerdown');
 await page.locator('.cm-timeline').scrollIntoViewIfNeeded();
 const next=await page.locator('.cm-stop').nth(1).boundingBox();expect(next!.x).toBeLessThan(375);expect(next!.x).toBeGreaterThan(280);
 await scrollToPosition(page,3);
 await expect.poll(()=>visibleYear(page)).toBe('2021');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(375);
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('.cm-timeline')).not.toHaveClass(/cm-journey-pinned/);
});
test('reduced motion preserves the vertical story and native anchors',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.cm-timeline')).not.toHaveClass(/cm-journey-enabled/);
 const tops=await page.locator('.cm-stop').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));
 for(let i=1;i<tops.length;i++)expect(tops[i]).toBeGreaterThan(tops[i-1]);
 await page.locator('.cm-rail a').nth(3).click();await expect(page.locator('#stop-4')).toBeFocused();
});
test('direct chapter link lands on the requested panel',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/#stop-4');await page.evaluate(()=>document.fonts.ready);
 await expect.poll(()=>visibleYear(page)).toBe('2021');
 await expect.poll(()=>page.evaluate(()=>Math.abs(document.querySelector('#stop-4')!.getBoundingClientRect().left-document.querySelector('.cm-journey-year')!.getBoundingClientRect().left))).toBeLessThan(2);
});

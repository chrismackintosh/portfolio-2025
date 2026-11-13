import {test,expect} from '@playwright/test';
for (const width of [1440,390]) test(`tools ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.goto('/#stop-6');await page.waitForTimeout(1400);
 await expect(page.locator('#stop-6 .cm-stop-copy>p')).toHaveCSS('font-weight','400');await expect(page.locator('.cm-ri-intent')).toHaveCSS('font-weight','600');
 const tools=page.locator('.cm-ri-stack');await expect(tools.locator('h4')).toHaveCSS('font-size','13px');await expect(tools.locator('li')).toHaveCount(2);
 await expect(tools.locator('li').first()).toHaveCSS('border-top-width','1px');
 expect(await tools.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await tools.scrollIntoViewIfNeeded();await page.waitForTimeout(600);
 await page.screenshot({path:`../${info.project.name}-tools-${width}.png`});
});

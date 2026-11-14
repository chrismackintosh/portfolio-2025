import {test,expect} from '@playwright/test';
for(const width of [320,390,600,601,1440])test(`project header strategy and action at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('https://api.weather.gov/**',r=>r.abort());await page.goto('/');
 const link=page.locator('.cm-project-entry'),pill=link.locator('.cm-project-action');
 await expect(link).toHaveAccessibleName('myColorado Product strategy, design and digital identity'+(width>600?' Explore myColorado':''));
 await expect(link.locator('.cm-project-name')).toHaveText('Product strategy, design and digital identity');
 if(width<=600)await expect(pill).toBeHidden();else await expect(pill).toBeVisible();
 await link.focus();await expect(link).toBeFocused();
 expect(await link.evaluate(e=>getComputedStyle(e,'::after').outlineStyle)).toBe('solid');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 await link.press('Enter');await expect(page).toHaveURL(/\/mycolorado\/$/);
});

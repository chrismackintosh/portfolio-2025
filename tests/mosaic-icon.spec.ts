import {test,expect} from '@playwright/test';
for(const width of [390,1440])for(const dark of [false,true])test(`mosaic play pause icon ${width} dark=${dark}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(dark=>localStorage.setItem('cm-color-appearance',JSON.stringify({version:1,mode:dark?'dark':'light',expiresAt:Date.now()+3600000})),dark);
 await page.route('https://api.weather.gov/**',r=>r.abort());await page.goto('/');
 const control=page.locator('.cm-mosaic-pause');await control.scrollIntoViewIfNeeded();
 await expect(control).toHaveAccessibleName('Pause animations for myColorado');await expect(control).toHaveCSS('width','44px');await expect(control).toHaveCSS('height','44px');await expect(control).toHaveCSS('border-width','0px');await expect(control).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await expect(control.locator('.cm-breeze-pause-icon')).toBeVisible();await expect(control.locator('.cm-breeze-play-icon')).toBeHidden();
 await control.focus();await expect(control).toHaveCSS('outline-style','solid');await control.press('Space');
 await expect(control).toHaveAccessibleName('Play animations for myColorado');await expect(control.locator('.cm-breeze-play-icon')).toBeVisible();await expect(control.locator('.cm-breeze-pause-icon')).toBeHidden();
 await expect(control).toHaveCSS('color',dark?'rgb(230, 233, 237)':'rgb(38, 49, 59)');
 const url=page.url();await control.click();expect(page.url()).toBe(url);await expect(control).toHaveAttribute('data-paused','false');
});

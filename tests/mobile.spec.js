import {test,expect} from '@playwright/test';
test.use({hasTouch:true,isMobile:true});
for(const width of [320,390,430,768])test('mobile '+width+' touch picker, filters and dialogs',async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Date-night dinner',exact:true}).tap();
 await expect(page.locator('.activity-card').first()).toBeVisible({timeout:12000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 for(const label of ['US ZIP code','Search radius','Event date']){const el=page.getByLabel(label);await expect(el).toBeVisible();expect(await el.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);}
 await page.getByRole('button',{name:width<=560?'Pick our plan':'Surprise me',exact:true}).tap();
 const d=page.getByRole('dialog');await expect(d.locator('.dialog-title')).toHaveText(/Monalisia|Library IV|The Franklinville Inn/,{timeout:12000});await d.getByRole('button',{name:'Roll again'}).tap();await expect(d.locator('.result-body')).toBeVisible({timeout:12000});
 await d.getByRole('button',{name:'Close',exact:true}).tap();
 await page.getByRole('button',{name:'Rainy-day fun',exact:true}).tap();await expect(page.locator('.activity-card').first()).toBeVisible();await expect(page.locator('body')).toContainText('Edelman Planetarium');
 await page.getByRole('button',{name:'Shore escape',exact:true}).tap();await expect(page.locator('body')).toContainText('Ocean City Boardwalk stroll');await expect(page.getByLabel('Search radius')).toHaveValue('50');
 await page.getByRole('button',{name:'This weekend',exact:true}).tap();await expect(page.getByLabel('Event date')).toHaveValue('weekend');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 if(width===390){await page.getByRole('button',{name:'Date-night dinner',exact:true}).tap();await page.locator('.picker-panel').scrollIntoViewIfNeeded();await page.screenshot({path:'scripts/mobile-after.png'});}
});

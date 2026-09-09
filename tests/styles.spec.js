import {test,expect} from '@playwright/test';
for(const width of [390,1440])test('visual styles at '+width+' persist and keep picking usable',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:950});await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Date-night dinner',exact:true}).click();
 const colors=[];
 for(const [name,id] of [['Midnight garden','midnight'],['Blue hour','bluehour'],['Golden hour','golden']]){
  const button=page.getByRole('button',{name,exact:true});await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('html')).toHaveAttribute('data-visual-style',id);
  colors.push(await page.getByRole('button',{name:'Surprise me',exact:true}).evaluate(e=>getComputedStyle(e).backgroundColor));
  await expect(page.getByRole('button',{name:'Romantic',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.locator('.style-studio').scrollIntoViewIfNeeded();await page.screenshot({path:'scripts/style-'+id+'-'+width+'.png'});
 }
 expect(new Set(colors).size).toBe(3);await page.reload();await expect(page.getByRole('button',{name:'Golden hour',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Date-night dinner',exact:true}).click();await page.getByRole('button',{name:'Surprise me',exact:true}).click();await expect(page.getByRole('dialog').locator('.dialog-title')).toHaveText(/Monalisia|Library IV|The Franklinville Inn/,{timeout:12000});
 await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:/Motion:/}).click();await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');expect(errors).toEqual([]);
});

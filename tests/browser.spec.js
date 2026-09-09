import {test,expect} from '@playwright/test';
test('real UI: romantic dinner, reroll, takeout, outdoors, events and narrow radius',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
 await page.getByRole('group',{name:'Activity category'}).getByRole('button',{name:'Food & drink',exact:true}).click();
 await page.getByRole('button',{name:'Romantic',exact:true}).click();await page.getByRole('button',{name:'Sit down',exact:true}).click();
 await expect(page.locator('.activity-card').first()).toBeVisible({timeout:10000});
 await page.getByRole('button',{name:'Surprise me',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.locator('.dialog-title')).toHaveText(/Monalisia|Library IV|The Franklinville Inn/,{timeout:12000});
 const first=await dialog.locator('.dialog-title').innerText();await expect(dialog).not.toContainText('Dunkin');
 await dialog.getByRole('button',{name:'Roll again'}).click();await expect(dialog.locator('.dialog-title')).toHaveText(/Monalisia|Library IV|The Franklinville Inn/,{timeout:12000});await expect(dialog.locator('.dialog-title')).not.toHaveText(first);
 console.log('ROMANTIC PICKS:',first,await dialog.locator('.dialog-title').innerText());
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Take out',exact:true}).click();await page.getByRole('button',{name:'Surprise me',exact:true}).click();await expect(dialog.locator('.dialog-title')).toHaveText(/Monalisia|Library IV|The Franklinville Inn/,{timeout:12000});await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Anything goes',exact:true}).click();await page.getByRole('group',{name:'Activity category'}).getByRole('button',{name:'The great outdoors',exact:true}).click();
 await page.getByRole('button',{name:'Surprise me',exact:true}).click();await expect(dialog.locator('.result-body')).toBeVisible({timeout:12000});console.log('OUTDOORS PICK:',await dialog.locator('.dialog-title').innerText());await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('group',{name:'Activity category'}).getByRole('button',{name:'Local happenings',exact:true}).click();await expect(page.locator('body')).toContainText("The 40th Annual Kid's Fishing Contest");
 await page.getByRole('button',{name:'Surprise me',exact:true}).click();await expect(dialog.locator('.event-time')).toBeVisible({timeout:12000});await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('group',{name:'Activity category'}).getByRole('button',{name:'Food & drink',exact:true}).click();await page.getByRole('button',{name:'Romantic',exact:true}).click();await page.getByRole('button',{name:'Sit down',exact:true}).click();await page.getByLabel('Search radius').selectOption('5');await expect(page.locator('body')).toContainText('Monalisia');
 await page.screenshot({path:'scripts/verified-browser.png',fullPage:true});expect(errors).toEqual([]);
});

test('08094 still picks with external discovery services unavailable',async({page})=>{
 await page.route(/api\.zippopotam\.us|maps\.mail\.ru|visitsouthjersey\.com|\/api\/discover/,route=>route.abort());
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:5173/');
 await page.getByRole('group',{name:'Activity category'}).getByRole('button',{name:'Food & drink',exact:true}).click();await page.getByRole('button',{name:'Romantic',exact:true}).click();await page.getByRole('button',{name:'Sit down',exact:true}).click();
 await page.getByRole('button',{name:'Surprise me',exact:true}).click();await expect(page.getByRole('dialog').locator('.dialog-title')).toHaveText(/Monalisia|Library IV|The Franklinville Inn/,{timeout:12000});expect(page.context().pages()).toHaveLength(1);
});

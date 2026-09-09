import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
page.on('pageerror',e=>console.log('PAGE ERROR',e.message));page.on('requestfailed',r=>console.log('FAILED',r.url().slice(0,150),r.failure()?.errorText));
await page.goto('https://umbara1077.github.io/elsewhere-activity-picker/');await page.waitForTimeout(45000);console.log((await page.locator('body').innerText()).slice(-14000));await page.screenshot({path:'scripts/before.png',fullPage:true});await browser.close();

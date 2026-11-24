async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});await page.goto('http://localhost:4173');await page.waitForTimeout(1200);
  if(await page.evaluate(()=>typeof window.__starlight!=='undefined')) throw new Error('Development fixture leaked');
  if(await page.locator('.title-actions [data-action^="new"]').count()!==1) throw new Error('Expected a single campaign entry');
  await page.screenshot({path:'output/playwright/title-final.png'});
  await page.getByRole('button',{name:'啟程 BEGIN YOUR JOURNEY'}).click();await page.getByRole('button',{name:'略過對話'}).click();
  const opening=await page.evaluate(()=>JSON.parse(localStorage.getItem('starlight:auto')));
  if(opening.version!==2||!opening.flags.includes('P00')) throw new Error('The official opening saved no progress');
  await page.waitForTimeout(400); await page.keyboard.press('c');await page.waitForTimeout(400);
  await page.screenshot({path:'output/playwright/party-final.png'});
  await page.keyboard.press('Escape');await page.waitForTimeout(400);await page.screenshot({path:'output/playwright/game-final.png'});
  if(errors.length)throw new Error(errors.join(';'));
  return {production:'passed',developmentFixture:'absent',errors};
}

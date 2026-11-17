async (page) => {
  const checks=[];
  await page.goto('http://localhost:5173');
  await page.evaluate(() => {
    const g=window.__starlight; g.fixture('waterway',{ready:true}); const s=g.getState();
    s.party.forEach(h=>h.hp=1); s.settings.reducedMotion=true; s.position={x:0,z:7};
    localStorage.setItem('starlight:manual',JSON.stringify(s)); localStorage.setItem('starlight:auto','{broken');
  });
  await page.reload(); await page.evaluate(()=>localStorage.setItem('starlight:auto','{broken')); await page.getByRole('button',{name:'繼續旅程',exact:true}).click();
  if (await page.locator('.save-slot').first().getByRole('button',{name:'讀取記錄'}).isEnabled()) throw new Error('Corrupt slot was enabled');
  await page.locator('.save-slot').last().getByRole('button',{name:'讀取記錄'}).click(); checks.push('Corrupt auto slot preserves readable manual slot');
  await page.evaluate(()=>window.__starlight.encounter('water-elite'));
  async function lose() {
    for(let i=0;i<10;i++) {
      if((await page.evaluate(()=>window.__starlight.getBattle().status))==='defeat') return;
      await page.getByRole('button',{name:'防禦 減傷・恢復 4 MP'}).click();
      await page.waitForFunction(()=>!document.querySelector('.battle-thinking'));
    }
    throw new Error('Defeat did not occur');
  }
  await lose(); await page.getByRole('button',{name:'重新挑戰',exact:true}).click();
  if((await page.evaluate(()=>window.__starlight.getBattle().status))!=='active') throw new Error('Retry did not restore battle');
  checks.push('Defeat retry restores original encounter');
  await lose(); await page.getByRole('button',{name:'回到最近星燈',exact:true}).click();
  const s=await page.evaluate(()=>window.__starlight.getState());
  if(s.zone!=='waterway'||s.party.some(h=>h.hp!==h.maxHp)||s.mechanisms['valve-1']!==1) throw new Error('Checkpoint did not preserve progress or heal');
  checks.push('Checkpoint preserves mechanisms and restores party');
  await page.evaluate(()=>window.__starlight.interact('waterway-names'));
  await page.getByRole('button',{name:'略過對話'}).click();
  await page.keyboard.press('j');
  if(!(await page.locator('.lore-notes summary').getByText('水面下的名字').isVisible())) throw new Error('Lore not recorded');
  checks.push('Environmental lore collected into journal');
  // A fresh browser context keeps blocked-storage checks separate from saved progress.
  const context=await page.context().browser().newContext(); const blocked=await context.newPage();
  await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});
  await blocked.goto('http://localhost:5173'); await blocked.getByRole('button',{name:'啟程 BEGIN YOUR JOURNEY'}).click(); await blocked.getByRole('button',{name:'略過對話'}).click();
  if(!(await blocked.locator('#toast').innerText()).includes('無法儲存')) throw new Error('Blocked storage not surfaced');
  checks.push('Blocked localStorage does not prevent new game and shows warning'); await context.close();
  return {checks};
}

async page => {
  const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  const check=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
  const fits=async selectors=>page.evaluate(selectors=>{
    const game=document.querySelector('#game').getBoundingClientRect();
    const inside=r=>r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
    return inside(game)&&selectors.every(selector=>{const el=document.querySelector(selector);if(!el)return false;const r=el.getBoundingClientRect();return inside(r)&&r.left>=game.left-1&&r.right<=game.right+1&&r.top>=game.top-1&&r.bottom<=game.bottom+1;});
  },selectors);
  for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[1024,768],[844,390],[1280,720],[1920,904]]){
    await page.setViewportSize({width,height});await page.goto('http://localhost:5173');await page.waitForTimeout(350);
    check(await fits(['.title-header','.title-content','.title-actions','.title-footer']),`Title fits ${width}×${height}`);
    check(await page.locator('[data-action="fullscreen"]').count()===0,`Fullscreen removed ${width}×${height}`);
    await page.getByRole('button',{name:'啟程 BEGIN YOUR JOURNEY'}).click();await page.waitForTimeout(350);
    check(await fits(['.dialogue-panel','.dialogue-footer','.dialogue-next']),`Dialogue fits ${width}×${height}`);
    await page.keyboard.press('Escape');
    check(await fits(['.hud-top','.hud-nav','.location','.party-strip']),`Exploration HUD fits ${width}×${height}`);
    await page.keyboard.press('c');
    for(const name of ['旅人隊伍','旅途行囊','旅途設定','操作指南','旅途日誌','星燈記錄']){
      await page.locator('.menu-sidebar').getByRole('button',{name,exact:true}).click();
      check(await fits(['.menu-panel','.menu-heading','.menu-footer'])&&await page.locator('.menu-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${name} fits ${width}×${height}`);
    }
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{window.__starlight.fixture('forest',{ready:true,strong:true});});
    await page.evaluate(()=>window.__starlight.encounter('f3'));await page.waitForFunction(()=>!document.querySelector('.battle-thinking'));
    check(await fits(['.battle-header','.enemy-info','.battle-bottom']),`Battle fits ${width}×${height}`);
    await page.locator('[data-action="battle:skills"]').click();
    check(await page.locator('.battle-commands').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`Skills do not overflow ${width}×${height}`);
    await page.screenshot({path:`output/playwright/rwd-${width}x${height}.png`});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__starlight.fixture('village'));
  const before=await page.evaluate(()=>window.__starlight.getState().position);
  const right=page.getByRole('button',{name:'向右移動',exact:true});const rect=await right.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  const after=await page.evaluate(()=>window.__starlight.getState().position);check(Math.hypot(after.x-before.x,after.z-before.z)>0.5,'Touch direction control moves character');
  await page.waitForTimeout(350);const stopped=await page.evaluate(()=>window.__starlight.getState().position);check(Math.hypot(after.x-stopped.x,after.z-stopped.z)<0.3,'Releasing touch control stops movement');
  await page.evaluate(()=>window.__starlight.moveTo(-3,3.5));await page.getByRole('button',{name:'互動',exact:true}).click();
  check(await page.locator('.dialogue-panel').isVisible(),'Touch interaction opens NPC dialogue');
  await page.keyboard.press('Escape');check(await page.evaluate(()=>window.__starlight.getMode()==='explore'),'Esc skips dialogue without fullscreen handling');
  check(errors.length===0,'No browser errors');return {checks,errors};
}

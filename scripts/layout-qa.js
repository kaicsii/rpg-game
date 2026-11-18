async page => {
  const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  const check=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
  const fits=async selectors=>page.evaluate(selectors=>{
    const game=document.querySelector('#game').getBoundingClientRect();
    const inside=r=>r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
    return inside(game)&&selectors.every(selector=>{const el=document.querySelector(selector);if(!el)return false;const r=el.getBoundingClientRect();return inside(r)&&r.left>=game.left-1&&r.right<=game.right+1&&r.top>=game.top-1&&r.bottom<=game.bottom+1;});
  },selectors);
  const centered=()=>page.evaluate(()=>{
    const game=document.querySelector('#game').getBoundingClientRect();
    const canvas=document.querySelector('#world').getBoundingClientRect();
    const overlay=document.querySelector('#ui-frame').getBoundingClientRect();
    const near=(first,second)=>Math.abs(first-second)<1;
    return near(game.width,Math.min(innerWidth,innerHeight*16/9))&&near(game.height,game.width*9/16)
      &&near(game.left,innerWidth-game.right)&&near(game.top,innerHeight-game.bottom)
      &&[canvas,overlay].every(layer=>['left','top','width','height'].every(edge=>near(layer[edge],game[edge])));
  });
  const hudAnchors=()=>page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const location=rect('.location'),quest=rect('.quest-widget'),party=rect('.party-strip');
    const nav=rect('.hud-nav'),map=rect('.minimap'),guide=rect('.key-guide');
    const near=(first,second)=>Math.abs(first-second)<1;
    return near(location.left,quest.left)&&near(location.left,party.left)&&near(location.top,nav.top)
      &&near(nav.right,map.right)&&near(nav.right,guide.right)&&near(guide.bottom,party.bottom)
      &&location.bottom<quest.top&&quest.bottom<party.top&&party.right<guide.left;
  });
  for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[900,550],[1024,768],[844,390],[1280,720],[1920,904],[2560,720]]){
    await page.setViewportSize({width,height});await page.goto('http://localhost:5173');await page.waitForTimeout(350);
    check(await centered(),`Canvas and overlay match the centered 16:9 frame ${width}×${height}`);
    check(await fits(['.title-header','.title-content','.title-actions','.title-footer']),`Title fits ${width}×${height}`);
    check(await page.locator('[data-action="fullscreen"]').count()===0,`Fullscreen removed ${width}×${height}`);
    await page.getByRole('button',{name:'啟程 BEGIN YOUR JOURNEY'}).click();await page.waitForTimeout(350);
    check(await fits(['.dialogue-panel','.dialogue-footer','.dialogue-next']),`Dialogue fits ${width}×${height}`);
    await page.keyboard.press('Escape');
    check(await fits(['.hud-top','.hud-nav','.location','.quest-widget','.party-strip','.minimap','.key-guide'])&&await hudAnchors(),`Exploration HUD fits and aligns at the edges ${width}×${height}`);
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
  await page.setViewportSize({width:844,height:390});
  check(await centered()&&await hudAnchors()&&await page.evaluate(()=>window.__starlight.getMode()==='explore'),'Live rotation resizes both layers without resetting the game');
  await page.getByRole('button',{name:'展開 M',exact:true}).click();
  check(await page.locator('.large-map').isVisible(),'Map button stays clickable after rotation');
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/letterbox-explore-portrait.png'});
  const before=await page.evaluate(()=>window.__starlight.getState().position);
  const right=page.getByRole('button',{name:'向右移動',exact:true});const rect=await right.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  const after=await page.evaluate(()=>window.__starlight.getState().position);check(Math.hypot(after.x-before.x,after.z-before.z)>0.5,'Touch direction control moves character');
  await page.waitForTimeout(350);const stopped=await page.evaluate(()=>window.__starlight.getState().position);check(Math.hypot(after.x-stopped.x,after.z-stopped.z)<0.3,'Releasing touch control stops movement');
  await page.evaluate(()=>window.__starlight.moveTo(-3,3.5));await page.getByRole('button',{name:'互動',exact:true}).click();
  check(await page.locator('.dialogue-panel').isVisible(),'Touch interaction opens NPC dialogue');
  await page.keyboard.press('Escape');check(await page.evaluate(()=>window.__starlight.getMode()==='explore'),'Esc skips dialogue without fullscreen handling');
  const cdp=await page.context().newCDPSession(page);
  const density=async (deviceScaleFactor,ratio)=>{
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor,mobile:false});
    await page.waitForFunction(({deviceScaleFactor,ratio})=>{
      const canvas=document.querySelector('#world');
      return window.devicePixelRatio===deviceScaleFactor&&Math.abs(canvas.width-canvas.clientWidth*ratio)<=1&&Math.abs(canvas.height-canvas.clientHeight*ratio)<=1;
    },{deviceScaleFactor,ratio});
    return centered();
  };
  try {
    check(await density(2,2),'High quality uses a 2× drawing buffer on a 2× display');
    check(await density(1,1),'Drawing buffer updates after a DPR-only change');
    await page.getByRole('button',{name:'設定與存檔',exact:true}).click();
    await page.getByRole('button',{name:'輕盈',exact:true}).click();
    check(await density(1,.75),'Low quality reduces the drawing buffer without changing CSS size');
    check(await density(2,1),'Low quality keeps a reduced buffer after a DPR change');
    await page.getByRole('button',{name:'細緻',exact:true}).click();
    check(await density(2,2),'Switching back restores high-density rendering');
    await page.keyboard.press('Escape');
    await page.evaluate(()=>window.__starlight.fixture('village'));
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const touchRect=await right.boundingBox();
    const touchBefore=await page.evaluate(()=>window.__starlight.getState().position);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchRect.x+touchRect.width/2,y:touchRect.y+touchRect.height/2}]});
    await page.waitForTimeout(450);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const touchAfter=await page.evaluate(()=>window.__starlight.getState().position);
    check(Math.hypot(touchAfter.x-touchBefore.x,touchAfter.z-touchBefore.z)>0.5,'Touch coordinates hit the scaled direction control at DPR 2');
  } finally {
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await cdp.send('Emulation.clearDeviceMetricsOverride'); await cdp.detach();
  }
  check(errors.length===0,'No browser errors');return {checks,errors};
}

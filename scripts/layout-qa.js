async page => {
  const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  const check=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
  const fits=async selectors=>page.evaluate(selectors=>{
    const game=document.querySelector('#game').getBoundingClientRect();
    const inside=r=>r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
    return inside(game)&&selectors.every(selector=>{const el=document.querySelector(selector);if(!el)return false;const r=el.getBoundingClientRect();return inside(r)&&r.left>=game.left-1&&r.right<=game.right+1&&r.top>=game.top-1&&r.bottom<=game.bottom+1;});
  },selectors);
  const fillsViewport=()=>page.evaluate(()=>{
    const game=document.querySelector('#game').getBoundingClientRect();
    const canvas=document.querySelector('#world').getBoundingClientRect();
    const overlay=document.querySelector('#ui-frame').getBoundingClientRect();
    const near=(first,second)=>Math.abs(first-second)<1;
    return near(game.width,innerWidth)&&near(game.height,innerHeight)&&near(game.left,0)&&near(game.top,0)
      &&[canvas,overlay].every(layer=>['left','top','width','height'].every(edge=>near(layer[edge],game[edge])));
  });
  const hudAnchors=()=>page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const location=rect('.location'),quest=rect('.quest-widget'),party=rect('.party-strip');
    const nav=rect('.hud-nav'),map=rect('.minimap'),guide=rect('.key-guide');
    const near=(first,second)=>Math.abs(first-second)<1;
    return near(location.left,quest.left)&&near(location.left,party.left)&&near(nav.right,map.right)
      &&location.bottom<quest.top&&quest.bottom<party.top&&party.right<map.left
      &&(!guide.width||(near(nav.right,guide.right)&&near(guide.bottom,party.bottom)&&party.right<guide.left));
  });
  for(const [width,height] of [[320,568],[390,844],[430,932],[768,1024],[900,550],[1024,768],[844,390],[1280,720],[1920,904],[2560,720]]){
    await page.setViewportSize({width,height});await page.goto('http://localhost:5173');await page.waitForTimeout(350);
    check(await fillsViewport(),`Canvas and overlay fill the viewport ${width}×${height}`);
    check(await fits(['.title-header','.title-content','.title-footer']),`Title fits ${width}×${height}`);
    check(await page.locator('[data-action="fullscreen"]').count()===0,`Fullscreen removed ${width}×${height}`);
    await page.getByRole('button',{name:'啟程 BEGIN YOUR JOURNEY'}).click();await page.waitForTimeout(350);
    check(await fits(['.dialogue-panel','.dialogue-footer','.dialogue-next']),`Dialogue fits ${width}×${height}`);
    await page.keyboard.press('Escape');
    check(await fits(['.hud-top','.hud-nav','.location','.quest-widget','.party-strip','.minimap','.key-guide'])&&await hudAnchors(),`Exploration HUD fits and aligns at the edges ${width}×${height}`);
    check((await page.locator('.hero-chip .hud-vitals .vital-row').count()) === 4, `Both heroes show HP and MP ${width}×${height}`);
    if (width <= 640) check(await page.evaluate(() => {
      const button = document.querySelector('.touch-interact').getBoundingClientRect();
      const map = document.querySelector('.minimap').getBoundingClientRect();
      return button.bottom <= map.top - 4;
    }), `Touch action clears the map ${width}×${height}`);
    await page.keyboard.press('c');
    for(const name of ['旅人隊伍','旅途行囊','旅途設定','操作指南','旅途日誌','星燈記錄']){
      await page.locator('.menu-sidebar').getByRole('button',{name,exact:true}).click();
      check(await fits(['.menu-panel','.menu-heading','.menu-footer'])&&await page.locator('.menu-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${name} fits ${width}×${height}`);
    }
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{window.__starlight.fixture('forest',{ready:true,strong:true});});
    await page.evaluate(()=>window.__starlight.encounter('f3'));await page.waitForFunction(()=>!document.querySelector('.battle-thinking'));
    check(await fits(['.battle-header','.enemy-info','.battle-bottom']),`Battle fits ${width}×${height}`);
    check(await page.evaluate(() => {
      const enemy = document.querySelector('.enemy-info').getBoundingClientRect();
      const footer = document.querySelector('.battle-bottom').getBoundingClientRect();
      const header = document.querySelector('.battle-header').getBoundingClientRect();
      return header.bottom <= enemy.top && enemy.bottom <= footer.top
        && document.querySelectorAll('.turn-token.current[aria-current="step"]').length === 1
        && document.querySelectorAll('.shield-pips .lit').length >= 2;
    }), `Turn order and enemy information have separate readable areas ${width}×${height}`);
    if (width === 1280 || width === 390) await page.screenshot({path:`output/playwright/hud-battle-${width}.png`});
    await page.locator('[data-action="battle:skills"]').click();
    check(await page.locator('.battle-commands').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`Skills do not overflow ${width}×${height}`);
    check(await page.locator('.skill-command:focus').count() === 1, `Opening skills moves focus to an available skill ${width}×${height}`);
    await page.screenshot({path:`output/playwright/rwd-${width}x${height}.png`});
  }
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(() => { window.__starlight.fixture('tower',{ready:true,strong:true});window.__starlight.encounter('t2'); });
  await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
  check(await page.evaluate(() => {
    const enemies = document.querySelectorAll('.enemy-card');
    return enemies.length === 3 && new Set([...enemies].map(enemy => enemy.getBoundingClientRect().top)).size === 1;
  }), 'Three enemy cards stay on one row on a 320px screen');
  await page.locator('[data-action="act:attack"]').click();
  check(await page.locator('.target-command').count() === 3 && (await page.locator('.target-command:focus').innerText()).includes('護盾'), 'Target choice shows all three enemies and focuses a tactical readout');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
  check(await page.locator('.command:focus').count() === 1, 'Keyboard focus returns to the next command after an action');
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.__starlight.fixture('village'));
  const initialState=await page.evaluate(()=>window.__starlight.getState());
  await page.setViewportSize({width:1280,height:720});
  const horizontalSpan=()=>page.evaluate(()=>window.__starlight.view().right-window.__starlight.view().left);
  await page.waitForFunction(()=>Math.abs(window.__starlight.view().right/window.__starlight.view().top-1280/720)<.01);
  const standardSpan=await horizontalSpan();
  await page.setViewportSize({width:2560,height:720});
  await page.waitForFunction(span=>window.__starlight.view().right-window.__starlight.view().left>span*1.8,standardSpan);
  check(await page.evaluate(()=>!window.__starlight.canWalk(-7,8.8)&&!window.__starlight.canWalk(14,0)&&window.__starlight.canWalk(0,6)),'Wide camera shows more of the world with correct boundaries and collisions');
  await page.setViewportSize({width:844,height:390});
  check(await fillsViewport()&&await hudAnchors()&&await page.evaluate(initial=>{const game=window.__starlight;const state=game.getState();return game.getMode()==='explore'&&state.zone===initial.zone&&state.position.x===initial.position.x&&state.position.z===initial.position.z;},initialState),'Live rotation resizes both layers without resetting the game');
  await page.evaluate(()=>{const game=document.querySelector('#game');for(const [edge,px] of [['left',26],['right',30],['top',20],['bottom',16]])game.style.setProperty('--safe-'+edge,px+'px');});
  check(await page.evaluate(()=>{
    const ui=document.querySelector('#ui-frame').getBoundingClientRect();
    return ui.left===26&&ui.top===20&&ui.right===innerWidth-30&&ui.bottom===innerHeight-16
      &&[...document.querySelectorAll('.location,.hud-nav,.quest-widget,.party-strip,.hud-tools')].every(el=>{
        const rect=el.getBoundingClientRect();
        return rect.left>=ui.left&&rect.right<=ui.right&&rect.top>=ui.top&&rect.bottom<=ui.bottom;
      });
  }),'HUD respects asymmetric safe insets');
  await page.evaluate(()=>document.querySelector('#game').removeAttribute('style'));
  await page.getByRole('button',{name:'展開 M',exact:true}).click();
  check(await page.locator('.large-map').isVisible(),'Map button stays clickable after rotation');
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/viewport-explore-portrait.png'});
  await page.setViewportSize({width:1280,height:720});
  await page.screenshot({path:'output/playwright/hud-explore-1280.png'});
  await page.setViewportSize({width:390,height:844});
  const before=await page.evaluate(()=>window.__starlight.getState().position);
  const right=page.getByRole('button',{name:'向右移動',exact:true});const rect=await right.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  const after=await page.evaluate(()=>window.__starlight.getState().position);check(Math.hypot(after.x-before.x,after.z-before.z)>0.5,'Touch direction control moves character');
  await page.waitForTimeout(350);const stopped=await page.evaluate(()=>window.__starlight.getState().position);check(Math.hypot(after.x-stopped.x,after.z-stopped.z)<0.3,'Releasing touch control stops movement');
  await page.evaluate(()=>window.__starlight.moveTo(-3,3.5));await page.getByRole('button',{name:'互動',exact:true}).click();
  check(await page.locator('.dialogue-panel').isVisible(),'Touch interaction opens NPC dialogue');
  await page.keyboard.press('Escape');check(await page.evaluate(()=>window.__starlight.getMode()==='explore'),'Esc skips dialogue without fullscreen handling');
  const screenPoint=(x,z,height)=>page.evaluate(([x,z,height])=>window.__starlight.screenPoint(x,z,height),[x,z,height]);
  await page.waitForTimeout(250);
  const elder=await screenPoint(-3,2,1);
  await page.mouse.click(elder.x,elder.y);
  check(await page.locator('.dialogue-heading').innerText().then(text=>text.includes('守燈婆婆')),'Click hits the correct NPC after the camera follows the player in portrait');
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:1280,height:720});
  await page.waitForTimeout(200);
  const house=await screenPoint(-7.2,0,2);
  await page.mouse.click(house.x,house.y);
  check(await page.locator('#toast').innerText()==='霧鐘村民宅','Click on a building hits its 3D geometry');
  const backdrop=await screenPoint(0,-3,0);
  check(await page.evaluate(({x,y})=>{const hit=window.__starlight.pick(x,y);return !hit.id&&!hit.building&&Math.hypot(hit.position.x,hit.position.z+3)<.001;},backdrop),'Screen-to-world ground projection round-trips');
  const buffer=await page.evaluate(()=>{
    const canvas=document.querySelector('#world');
    return {width:canvas.width,position:window.__starlight.getState().position};
  });
  await page.setViewportSize({width:1160,height:740});
  await page.setViewportSize({width:1120,height:740});
  await page.setViewportSize({width:1060,height:740});
  await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));
  check(await page.locator('#world').evaluate((canvas,previous)=>canvas.clientWidth===1060&&canvas.width===previous,buffer.width),'CSS changes before the debounced WebGL buffer');
  await page.waitForFunction(()=>document.querySelector('#world').width===Math.floor(1060*devicePixelRatio));
  check(await page.evaluate(previous=>JSON.stringify(window.__starlight.getState().position)===JSON.stringify(previous),buffer.position),'Buffer resize preserves player coordinates');
  const cdp=await page.context().newCDPSession(page);
  const density=async (deviceScaleFactor,ratio)=>{
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor,mobile:false});
    await page.waitForFunction(({deviceScaleFactor,ratio})=>{
      const canvas=document.querySelector('#world');
      return window.devicePixelRatio===deviceScaleFactor&&Math.abs(canvas.width-canvas.clientWidth*ratio)<=1&&Math.abs(canvas.height-canvas.clientHeight*ratio)<=1;
    },{deviceScaleFactor,ratio});
    return fillsViewport();
  };
  try {
    check(await density(2,2),'High quality uses a 2× drawing buffer on a 2× display');
    check(await density(1,1),'Drawing buffer updates after a DPR-only change');
    await page.getByRole('button',{name:'設定與存檔',exact:true}).click();
    await page.getByRole('button',{name:'輕盈',exact:true}).click();
    check(await density(1,1),'Low quality uses the native drawing buffer');
    check(await density(3,3),'Low quality tracks a DPR-only change above 2×');
    await page.getByRole('button',{name:'細緻',exact:true}).click();
    check(await density(2,2),'Switching back maintains native resolution');
    await page.keyboard.press('Escape');
    await page.evaluate(()=>window.__starlight.fixture('village'));
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true});
    const touchRect=await right.boundingBox();
    const touchBefore=await page.evaluate(()=>window.__starlight.getState().position);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchRect.x+touchRect.width/2,y:touchRect.y+touchRect.height/2}]});
    await page.waitForTimeout(450);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const touchAfter=await page.evaluate(()=>window.__starlight.getState().position);
    check(Math.hypot(touchAfter.x-touchBefore.x,touchAfter.z-touchBefore.z)>0.5,'Touch coordinates hit the direction control at DPR 2');
    await page.evaluate(()=>window.__starlight.moveTo(-3,3.5));
    await page.waitForTimeout(250);
    const target=await screenPoint(-3,2,1);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[target]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.locator('.dialogue-panel').waitFor({timeout:5000});
    check((await page.locator('.dialogue-heading').innerText()).includes('守燈婆婆'),'Native touch selects the NPC picked by the landscape camera');
    await page.keyboard.press('Escape');
    await page.evaluate(()=>window.__starlight.moveTo(0,6));
    await page.waitForTimeout(800);
    const companion=await screenPoint(.8,6.9,.98);
    await page.mouse.click(companion.x,companion.y);
    check(await page.evaluate(()=>window.__starlight.getState().leaderId==='loren'),'Clicking the companion sprite switches the leader after rotation');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:700,deviceScaleFactor:2,mobile:false});
    await page.keyboard.press('j');
    const panel=page.locator('.menu-scroll');
    const panelRect=await panel.boundingBox();
    const scrollX=panelRect.x+panelRect.width/2, scrollY=panelRect.y+panelRect.height-40;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:scrollX,y:scrollY}]});
    for(let step=1;step<=6;step++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:scrollX,y:scrollY-step*28}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>document.querySelector('.menu-scroll').scrollTop>0);
    check(await page.evaluate(()=>scrollX===0&&scrollY===0&&document.scrollingElement.scrollTop===0),'Touch scrolls the journal without moving the page');
  } finally {
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await cdp.send('Emulation.clearDeviceMetricsOverride'); await cdp.detach();
  }
  check(errors.length===0,'No browser errors');return {checks,errors};
}

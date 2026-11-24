async page => {
  const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const check=(ok,s)=>{if(!ok)throw new Error(s);checks.push(s);};
  const ready=()=>page.waitForFunction(()=>!document.querySelector('.battle-thinking'));
  const load=async mutate=>{
    await page.evaluate(mutate);await page.reload();await page.getByRole('button',{name:'繼續旅程',exact:true}).click();await page.locator('.save-slot').last().getByRole('button',{name:'讀取記錄'}).click();
  };
  await page.setViewportSize({width:1280,height:720});await page.goto('http://localhost:5173');await page.getByRole('button',{name:'啟程 BEGIN YOUR JOURNEY'}).click();await page.keyboard.press('Escape');
  const before=await page.evaluate(()=>window.__starlight.getState().position);await page.keyboard.press('Tab');
  check(await page.evaluate(()=>window.__starlight.getState().leaderId==='loren'),'Tab switches leader');
  check(await page.evaluate(before=>JSON.stringify(window.__starlight.getState().position)===JSON.stringify(before),before),'Switch preserves world position');
  await page.getByRole('button',{name:'設莉恩為帶隊角色'}).click();await page.keyboard.press('Tab');
  check(await page.evaluate(()=>window.__starlight.getState().leaderId==='lien'),'Focused card keeps native Tab navigation');
  await page.getByRole('button',{name:'設洛恩為帶隊角色'}).click();await page.keyboard.press('c');await page.keyboard.press('Tab');
  check(await page.evaluate(()=>window.__starlight.getState().leaderId==='loren'),'Menu Tab does not change leader');await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__starlight.interact('elder'));await page.keyboard.press('Tab');check(await page.evaluate(()=>window.__starlight.getState().leaderId==='loren'),'Dialogue blocks leader shortcut');await page.keyboard.press('Escape');
  for (const id of ['merchant', 'child', 'forest-exit']) {
    await page.evaluate(id => window.__starlight.interact(id), id);
    await page.keyboard.press('Escape');
  }
  await page.evaluate(()=>window.__starlight.interact('forest-exit'));
  for (const [slot, value] of [2, 3, 1].entries()) await page.locator(`[data-action="puzzle:${slot}:${value}"]`).click();
  await page.getByRole('button', { name: '試敲鐘' }).click();
  await page.keyboard.press('Escape');check(await page.evaluate(()=>window.__starlight.getState().leaderId==='loren'),'Leader persists across zone travel');
  await page.keyboard.press('m');check(await page.locator('.large-map .zone-map').isVisible(),'M opens north-facing map');check((await page.locator('.map-points').innerText()).includes('露珠軟泥'),'Map highlights main objective');await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__starlight.moveTo(-9,7.5));await page.waitForTimeout(200);check(await page.evaluate(()=>window.__starlight.getState().discoveredObjectIds.includes('herb-1')),'Approaching reveals collectible');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'保存進度',exact:true}).click();await page.keyboard.press('Escape');
  await load(()=>{});check(await page.evaluate(()=>window.__starlight.getState().leaderId==='loren'&&window.__starlight.getState().discoveredObjectIds.includes('herb-1')),'Save restores leader and discoveries');
  await load(()=>{const s=window.__starlight.getState();s.version=1;s.flags.push('medium-campaign');delete s.leaderId;delete s.discoveredObjectIds;delete s.settings.autoStopLowHp;localStorage.setItem('starlight:manual',JSON.stringify(s));});
  check(await page.evaluate(()=>window.__starlight.getState().leaderId==='lien'&&window.__starlight.getState().settings.autoStopLowHp),'Old save loads with defaults');
  await page.evaluate(()=>{window.__starlight.fixture('forest',{ready:true,strong:true});const s=window.__starlight.getState();s.party.forEach(h=>h.hp=Math.ceil(h.maxHp*.31));s.settings.reducedMotion=true;localStorage.setItem('starlight:manual',JSON.stringify(s));});
  await load(()=>{});await page.evaluate(()=>window.__starlight.encounter('forest-elite'));await page.keyboard.press('Escape');await ready();await page.keyboard.press('a');
  await page.waitForFunction(()=>document.querySelector('[data-action="auto-attack"]').getAttribute('aria-pressed')==='false'&&window.__starlight.getBattle().round>=2);
  const stopped=await page.evaluate(()=>window.__starlight.getBattle());check(stopped.heroes.some(h=>h.hp<=h.maxHp*.3),'Low health stops auto after enemy response');const logLength=stopped.log.length;await page.waitForTimeout(600);check(await page.evaluate(n=>window.__starlight.getBattle().log.length===n,logLength),'No additional queued attack after protection');
  await page.keyboard.press('a');check((await page.locator('[data-action="auto-attack"]').getAttribute('aria-pressed'))==='false','Protected low-health party cannot reenable');
  await page.locator('.auto-policy button').click();await page.keyboard.press('a');check((await page.locator('[data-action="auto-attack"]').getAttribute('aria-pressed'))==='true','Can disable protection and resume during battle');await page.keyboard.press('Escape');
  // Fixed battle fixture for round-three intent, existing statuses and the boss transition.
  await load(()=>{window.__starlight.fixture('tower',{ready:true,strong:true});const s=window.__starlight.getState();s.settings.reducedMotion=true;localStorage.setItem('starlight:manual',JSON.stringify(s));});
  await page.evaluate(()=>window.__starlight.encounter('eclipse'));await page.keyboard.press('Escape');await ready();
  while(await page.evaluate(()=>window.__starlight.getBattle().round<3)){await page.evaluate(()=>window.__starlight.action({kind:'guard'}));await ready();}
  check((await page.locator('.enemy-intent').innerText()).includes('本回合重擊'),'Round-three heavy intent visible');check(await page.locator('.turn-token.threat').count()>0,'Turn order flags imminent heavy action');check(await page.locator('.status-badges button').count()>0,'Guard status visible');
  await page.locator('.status-badges button').first().click();check((await page.locator('#toast').innerText()).includes('減少傷害'),'Status details accessible by click');
  for(let n=0;n<80;n++){const b=await page.evaluate(()=>window.__starlight.getBattle());if(b.enemies[0].phase===2)break;await page.evaluate(()=>{void window.__starlight.action({kind:'attack'});});await ready();if(await page.locator('.dialogue-panel').count()){await page.keyboard.press('Escape');await ready();}}
  check((await page.locator('.boss-phase').innerText()).includes('2 / 2'),'Boss phase-two indicator visible');
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1024,768],[1280,720],[1920,1080],[844,390]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>window.__starlight.fixture('forest',{ready:true,strong:true}));
    if(width<=900){await page.locator('.minimap-trigger').click();}else await page.keyboard.press('m');
    const fits=await page.locator('.menu-panel').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;});check(fits,`Map RWD ${width}×${height}`);await page.keyboard.press('Escape');
    await page.evaluate(()=>window.__starlight.encounter('forest-elite'));await page.keyboard.press('Escape');await ready();await page.screenshot({path:`output/playwright/adventure-${width}.png`});
  }
  check(errors.length===0,'No browser errors');return {checks,errors};
}

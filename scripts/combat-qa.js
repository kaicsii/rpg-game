async page => {
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  await page.goto('http://localhost:5173'); await page.setViewportSize({width:1280,height:720});
  await page.getByRole('button',{name:'啟程 BEGIN YOUR JOURNEY'}).click(); await page.getByRole('button',{name:'略過對話'}).click();
  await page.evaluate(async()=>{
    const resource = name => performance.getEntriesByType('resource').find(e => new URL(e.name).pathname === `/src/${name}.ts`).name;
    const {World}=await import(resource('world')); const {AudioDirector}=await import(resource('audio'));
    window.combatQA={visual:[],sound:[],motion:0,reducedMotion:0,fxFrames:0};
    const attack=World.prototype.attackEffect, render=World.prototype.render, combat=AudioDirector.prototype.combat;
    World.prototype.attackEffect=function(source,target,effect){window.combatQA.visual.push({source,target,effect,reduced:this.reduced}); return attack.call(this,source,target,effect);};
    World.prototype.render=function(...args){const result=render.apply(this,args); for(const s of this.sprites.values()){const a=s.userData.attack;if(a){const distance=s.position.distanceTo(a.origin);window.combatQA[this.reduced?'reducedMotion':'motion']=Math.max(window.combatQA[this.reduced?'reducedMotion':'motion'],distance);}} if(this.combatFx.length)window.combatQA.fxFrames++;return result;};
    AudioDirector.prototype.combat=function(effect,phase='impact'){window.combatQA.sound.push({effect,phase,context:this.context?.state,volume:this.volume});return combat.call(this,effect,phase);};
  });
  const ready=()=>page.waitForFunction(()=>!document.querySelector('.battle-thinking'));
  const act=async action=>{await page.evaluate(action=>window.__starlight.action(action),action);await ready();};
  await page.evaluate(()=>{window.__starlight.fixture('forest',{ready:true});window.__starlight.encounter('f1');});await ready();
  await page.locator('[data-action="battle:skills"]').click();await page.locator('[data-action="skill:ember"]').click();await page.locator('[data-action="target:enemy-0"]').click();
  await page.evaluate(()=>window.__starlight.action({kind:'attack'})); // A second action during playback must be ignored.
  await page.waitForTimeout(140);await page.screenshot({path:'output/playwright/combat-cast.png'});await ready();
  const fire=await page.evaluate(()=>window.__starlight.getBattle());if(fire.heroes[0].mp!==25||fire.enemies[0].hp!==21)throw new Error('Playback allowed duplicate action or wrong damage');
  await act({kind:'attack',target:'enemy-0'});
  let report=await page.evaluate(()=>window.combatQA);
  if(!report.visual.some(v=>v.source==='enemy-0'))throw new Error('Enemy attack was not animated');
  if(report.motion<0.5||report.fxFrames===0)throw new Error('Attack motion or visual effects missing');
  if(!report.sound.some(s=>s.effect==='fire'&&s.phase==='impact'&&s.context==='running'))throw new Error('Fire sound did not run');
  await page.evaluate(()=>{window.__starlight.fixture('forest',{ready:true,strong:true});window.__starlight.encounter('forest-elite');});await page.keyboard.press('Escape');await ready();
  await act({kind:'attack'});await act({kind:'guard'});
  await act({kind:'skill',id:'heal',target:'loren'});
  while(await page.evaluate(()=>window.__starlight.getBattle().resonance<100))await act({kind:'guard'});
  await act({kind:'resonance'});
  await page.evaluate(()=>{window.__starlight.fixture('waterway',{ready:true,strong:true});window.__starlight.encounter('w3');});await ready();
  if(await page.evaluate(()=>window.__starlight.getBattle().heroes.every(h=>h.hp===h.maxHp)))throw new Error('Opening fast-enemy attack failed');
  await act({kind:'skill',id:'meteor'}); // Every target gets its own timed impact.
  await page.evaluate(()=>window.__starlight.fixture('forest',{ready:true}));await page.keyboard.press('Escape');
  await page.getByRole('switch',{name:'減少動態效果'}).click();
  await page.locator('#volume').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__starlight.encounter('forest-elite'));await page.keyboard.press('Escape');await ready();
  await act({kind:'skill',id:'ember'});
  report=await page.evaluate(()=>window.combatQA);
  if(report.reducedMotion!==0||!report.visual.some(v=>v.reduced))throw new Error('Reduced-motion setting ignored');
  if(!report.sound.some(s=>s.volume===0))throw new Error('Sound does not honor volume');
  for(const effect of ['slash','fire','star','heal','resonance'])if(!report.sound.some(s=>s.effect===effect))throw new Error(`Missing ${effect} sound`);
  if(errors.length)throw new Error(errors.join(';'));
  return {checks:['fire projectile and impact','sword lunge and enemy recoil','enemy opening turn','star and healing effects','resonance','multi-target skill','input locked during playback','reduced motion','muted volume','no browser errors'],effects:report.visual.length,sounds:report.sound.length,movement:report.motion,errors};
}

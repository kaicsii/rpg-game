async (page) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({width:1280,height:720}); await page.goto('http://localhost:5173');
  await page.getByRole('button', {name:'啟程 BEGIN YOUR JOURNEY'}).click();
  await page.getByRole('button', {name:'略過對話'}).click();
  const initial = await page.evaluate(() => window.__starlight.getState().position);
  await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
  const moved = await page.evaluate(() => window.__starlight.getState().position);
  if (Math.hypot(initial.x-moved.x, initial.z-moved.z) < 0.5) throw new Error('Movement failed');
  await page.keyboard.press('Escape'); await page.getByRole('button', {name:'保存進度',exact:true}).click(); await page.keyboard.press('Escape');
  await page.reload(); await page.getByRole('button', {name:'繼續旅程',exact:true}).click(); await page.locator('.save-slot').last().getByRole('button', {name:'讀取記錄'}).click();
  const restored = await page.evaluate(() => window.__starlight.getState().position);
  if (Math.hypot(moved.x-restored.x, moved.z-restored.z)>0.1) throw new Error('Save roundtrip failed');
  await page.evaluate(() => {window.__starlight.fixture('forest',{ready:true});window.__starlight.encounter('f1');});
  await page.getByRole('button', {name:'技能 運用星火之力'}).click();
  await page.getByRole('button', {name:/^燈火 /}).click(); await page.getByRole('button',{name:/^露珠軟泥 HP/}).click();
  await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
  if ((await page.evaluate(() => window.__starlight.getBattle().enemies[0].hp))>=42) throw new Error('Battle action failed');
  await page.getByRole('button',{name:'撤離戰場'}).click(); await page.waitForFunction(() => !document.querySelector('.battle-thinking'));
  await page.getByRole('button',{name:'返回探索'}).click();
  if ((await page.evaluate(() => window.__starlight.getMode()))!=='explore') throw new Error('Battle return failed');
  await page.keyboard.press('Escape'); await page.getByRole('button',{name:'輕盈',exact:true}).click(); await page.keyboard.press('Escape');
  await page.setViewportSize({width:1920,height:1080});
  const performance = await page.evaluate(async () => {
    const gl = document.querySelector('canvas').getContext('webgl2'), ext=gl.getExtension('WEBGL_debug_renderer_info');
    const start=window.performance.now(); let frames=0;
    await new Promise(done=>{const tick=()=>{frames++;if(window.performance.now()-start<1500) requestAnimationFrame(tick);else done();};requestAnimationFrame(tick);});
    return {fps:Math.round(frames*1000/(window.performance.now()-start)),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'not exposed',ua:navigator.userAgent};
  });
  if (errors.length) throw new Error(errors.join(';'));
  return {checks:['new game','keyboard movement','manual save/reload','skill targeting and damage','escape and return','low quality','720p and 1080p'],errors,performance};
}

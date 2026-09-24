const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const base = process.env.BINSEN_TEST_URL || 'http://127.0.0.1:5192/';
const output = path.resolve(__dirname, '../artifacts/experience-20260907');
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(filename => fs.existsSync(filename));
const filter = process.argv.slice(2).join(' ');

function wav(seconds = 3) {
  const sampleRate = 8000;
  const result = Buffer.alloc(44 + seconds * sampleRate * 2);
  result.write('RIFF', 0); result.writeUInt32LE(result.length - 8, 4); result.write('WAVEfmt ', 8); result.writeUInt32LE(16, 16);
  result.writeUInt16LE(1, 20); result.writeUInt16LE(1, 22); result.writeUInt32LE(sampleRate, 24); result.writeUInt32LE(sampleRate * 2, 28);
  result.writeUInt16LE(2, 32); result.writeUInt16LE(16, 34); result.write('data', 36); result.writeUInt32LE(result.length - 44, 40);
  for (let index = 0; index < seconds * sampleRate; index += 1) result.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 440 / sampleRate) * 1000), 44 + index * 2);
  return result;
}
async function input(page, label, value) { await page.locator(`input[aria-label="${label}"], [aria-label="${label}"] input`).first().fill(String(value)); }
async function route(page, url) {
  await page.evaluate(value => { location.hash = `#${value}`; }, url);
  const selector = url.includes('/home-brand/') ? '.phone-shell' : 'uni-page:not([style*="display: none"]) .page-shell';
  await expect(page.locator(selector).last()).toBeVisible({ timeout: 20000 });
}
async function bind(page) {
  await page.goto(`${base}#/pages/onboarding/bind`);
  await page.locator('.search-card .primary-button').click();
  await page.locator('.vehicle-row').first().click();
  await expect(page.getByTestId('home-connection-action')).toContainText('已连接', { timeout: 15000 });
  await expect(page.getByTestId('app-modal')).not.toBeVisible();
}
async function confirm(page) { await page.getByTestId('modal-confirm').click(); }
async function clickReady(page, testId) { await expect(page.getByTestId(testId)).not.toHaveAttribute('disabled', 'true'); await page.getByTestId(testId).click(); }
async function loadFile(page, name = 'test.wav', data = wav()) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('audio-import').click();
  await (await chooser).setFiles({ name, mimeType: name.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream', buffer: data });
}
async function screenshot(page, name) {
  fs.mkdirSync(output, { recursive: true });
  if (!name.startsWith('failure')) {
    await page.getByTestId('app-toast').last().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.locator('.page-shell:visible').last().evaluate(element => { element.scrollTop = 0; });
  }
  await page.screenshot({ path: path.join(output, `${name}.png`) });
}

async function run(browser, name, task, options = {}) {
  if (filter && !name.includes(filter)) return;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try { await task(page, context); if (errors.length) throw new Error(errors.join('\n')); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.stack}`); process.exitCode = 1; await screenshot(page, `failure-${name.replace(/[^a-z0-9]/gi, '-')}`).catch(() => {}); }
  finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    await run(browser, 'new entries and unbound guards', async page => {
      await page.goto(`${base}#/pages/controls/index`);
      for (const key of ['sounds', 'team', 'lights']) await expect(page.getByTestId(`entry-${key}`)).toBeVisible();
      await page.getByTestId('entry-sounds').click();
      await expect(page.getByTestId('sound-startup')).toHaveAttribute('disabled', 'true');
      await expect(page.getByTestId('experience-connect')).toContainText('绑定车辆');
      await screenshot(page, 'sounds-unbound');
    });
    await run(browser, 'sound validation upload persistence retry activation delete', async page => {
      await bind(page); await route(page, '/pages/controls/sounds'); await page.getByTestId('sound-startup').click();
      await page.getByTestId('sound-preset').first().click();
      await expect(page.getByTestId('audio-trim')).toContainText('来自预埋音效');
      await expect(page.getByTestId('audio-trim')).toContainText('林道唤醒');
      await loadFile(page, 'bad.txt', Buffer.from('bad'));
      await expect(page.getByTestId('sound-error')).toContainText('仅支持');
      await loadFile(page, 'short.wav', wav(1));
      await expect(page.getByTestId('sound-error')).toContainText('大于 1 秒');
      await loadFile(page); await expect(page.getByTestId('audio-trim')).toBeVisible();
      await input(page, '裁剪结束秒数', 1); await expect(page.getByTestId('audio-upload')).toHaveAttribute('disabled', 'true');
      await input(page, '裁剪结束秒数', 2.5);
      await clickReady(page, 'audio-upload'); await confirm(page);
      await expect(page.getByTestId('sound-custom')).toContainText('2.50 秒', { timeout: 15000 });
      await clickReady(page, 'sound-use'); await expect(page.getByTestId('sound-active')).toContainText('自定义');
      await loadFile(page, 'replacement.wav');
      await page.locator('.experience-debug summary').click(); await page.getByTestId('experience-fail-next').click();
      await clickReady(page, 'audio-upload'); await confirm(page);
      await expect(page.getByTestId('sound-error')).toContainText('模拟传输失败');
      await expect(page.getByTestId('sound-custom')).toContainText('test.wav');
      await clickReady(page, 'audio-upload'); await confirm(page);
      await expect(page.getByTestId('sound-custom')).toContainText('replacement.wav', { timeout: 15000 });
      await screenshot(page, 'sound-detail');
      await route(page, '/pages/controls/sounds'); await page.getByTestId('sound-horn').click(); await expect(page.getByTestId('sound-custom')).toHaveCount(0);
      await route(page, '/pages/home-brand/index'); await page.reload(); await expect(page.getByTestId('home-connection-action')).toContainText('已连接', { timeout: 15000 });
      await route(page, '/pages/controls/sound-detail?kind=startup'); await expect(page.getByTestId('sound-custom')).toContainText('replacement.wav');
      await page.getByTestId('sound-custom').getByText('试听自定义', { exact: true }).click();
      await expect(page.getByTestId('sound-custom')).toContainText('停止试听');
      await page.getByTestId('sound-custom').getByText('停止试听', { exact: true }).click();
      await page.getByTestId('sound-delete').click(); await confirm(page); await expect(page.getByTestId('sound-custom')).toHaveCount(0);
      await expect(page.getByTestId('sound-active')).toContainText('系统默认');
    });
    await run(browser, 'sound settings switches and volume persist per vehicle', async page => {
      await bind(page); await route(page, '/pages/controls/sounds');
      await page.getByTestId('sound-throttle-toggle').click();
      await expect(page.getByTestId('sound-throttle-toggle')).toHaveAttribute('aria-checked', 'true');
      await page.waitForTimeout(500);
      const slider = page.locator('[data-testid="sound-volume"] input').first();
      if (await slider.count()) await slider.fill('35');
      await page.getByTestId('sound-speaker-toggle').click();
      await expect(page.getByTestId('sound-speaker-toggle')).toHaveAttribute('aria-checked', 'false');
      await expect(page.getByTestId('sound-throttle-toggle')).toHaveAttribute('disabled', 'true');
      await page.waitForTimeout(500);
      await page.reload();
      await expect(page.getByTestId('sound-speaker-toggle')).toHaveAttribute('aria-checked', 'false');
      await screenshot(page, 'sound-settings');
    });
    await run(browser, 'recording import produces real editable audio', async (page, context) => {
      await context.grantPermissions(['microphone']);
      await bind(page); await route(page, '/pages/controls/sound-detail?kind=horn');
      await page.getByTestId('audio-record').click(); await expect(page.getByTestId('audio-record')).toContainText('停止');
      await page.waitForTimeout(2500); await page.getByTestId('audio-record').click();
      await expect(page.getByTestId('audio-trim')).toBeVisible({ timeout: 15000 });
    });
    await run(browser, 'light configuration rules and preview', async page => {
      await bind(page); await route(page, '/pages/controls/lights');
      await page.locator('[aria-label="灯区 2"]').click();
      const colorInput = page.getByTestId('color-hex').locator('input').first();
      const startingColor = await colorInput.inputValue();
      await page.getByTestId('color-field').click({ position: { x: 190, y: 70 } });
      await expect(colorInput).not.toHaveValue(startingColor);
      const fieldColor = await colorInput.inputValue();
      await page.getByTestId('hue-slider').click({ position: { x: 80, y: 22 } });
      await expect(colorInput).not.toHaveValue(fieldColor);
      await page.locator('[aria-label="颜色 #3569C8"]').click(); await page.getByTestId('lights-save').click();
      await expect(page.locator('[data-testid="lights-save"]')).not.toHaveAttribute('disabled', 'true');
      await screenshot(page, 'lights');
      await page.getByTestId('rule-add').click(); await input(page, '规则名称', '转速节奏灯');
      for (const signal of ['frontBrake', 'rearBrake', 'throttle', 'highBeam', 'hazard', 'batteryTemperature', 'acceleration', 'sideStand']) await expect(page.locator(`[aria-label="触发信号"] option[value="${signal}"]`)).toHaveCount(1);
      await page.getByTestId('rule-save').click(); await expect(page.getByTestId('light-rule-item')).toContainText('转速节奏灯');
      await page.getByTestId('rule-preview').click(); await expect(page.getByTestId('rule-preview-result')).toContainText('命中');
      await page.getByTestId('light-rule-item').getByRole('switch').click();
      await expect(page.getByTestId('light-rule-item').getByRole('switch')).toHaveAttribute('aria-checked', 'false');
      await page.getByTestId('rule-preview').click(); await expect(page.getByTestId('rule-preview-result')).toContainText('没有命中');
      await page.getByTestId('light-rule-item').getByText('编辑规则').click(); await input(page, '规则优先级', 0); await page.getByTestId('rule-save').click();
      await expect(page.getByTestId('rule-error')).toContainText('优先级');
      await page.getByTestId('rule-delete').click(); await confirm(page); await expect(page.getByTestId('light-rule-item')).toHaveCount(0);
    });
    await run(browser, 'team search timeout reject accept sync isolation and management', async page => {
      await bind(page); await route(page, '/pages/controls/team');
      await page.getByTestId('team-search').click(); await expect(page.getByTestId('team-candidate')).toHaveCount(3, { timeout: 10000 });
      await page.getByTestId('team-stop').click(); await expect(page.getByTestId('team-stop')).not.toBeVisible();
      await page.getByTestId('team-candidate').filter({ hasText: '独行山路' }).getByText('邀请', { exact: true }).click(); await confirm(page);
      await expect(page.getByTestId('team-invite-status')).toContainText('已拒绝', { timeout: 8000 });
      await page.getByTestId('team-candidate').filter({ hasText: '林间骑士' }).getByText('邀请', { exact: true }).click(); await confirm(page);
      await expect(page.getByTestId('team-member')).toHaveCount(2, { timeout: 8000 });
      await clickReady(page, 'team-hazard'); await expect(page.getByTestId('team-notice')).toContainText('双闪指令');
      await clickReady(page, 'team-horn'); await expect(page.getByTestId('team-notice')).toContainText('鸣笛指令');
      await clickReady(page, 'team-audio'); await expect(page.getByTestId('team-notice')).toContainText('实时同步', { timeout: 8000 });
      await screenshot(page, 'team-captain');
      await page.getByTestId('team-lights').click(); await page.locator('[aria-label="颜色 #C84D43"]').click(); await page.getByTestId('lights-save').click();
      await expect(page.getByTestId('lights-save')).not.toHaveAttribute('disabled', 'true');
      await route(page, '/pages/controls/lights'); await expect(page.locator('[aria-label="颜色 #49A857"]')).toHaveAttribute('aria-pressed', 'true');
      await route(page, '/pages/controls/team'); await page.getByTestId('team-member').filter({ hasText: '林间骑士' }).getByText('移除').click(); await confirm(page);
      await expect(page.getByTestId('team-member')).toHaveCount(1);
      await page.getByTestId('team-exit').click(); await confirm(page); await expect(page.getByTestId('team-session')).not.toBeVisible();
      await page.locator('.experience-debug summary').click(); await page.getByTestId('team-empty-scenario').click();
      await page.getByTestId('team-search').click(); await expect(page.getByTestId('team-stop')).toBeVisible();
      await expect(page.getByTestId('team-stop')).not.toBeVisible({ timeout: 14000 }); await expect(page.getByTestId('team-candidate')).toHaveCount(0);
    });
    await run(browser, 'incoming invitation member permissions leave captain poweroff', async page => {
      await bind(page); await route(page, '/pages/controls/team');
      await page.locator('.experience-debug summary').click(); await page.getByTestId('team-incoming-demo').click();
      await screenshot(page, 'team-invitation');
      await page.getByTestId('invite-reject').click(); await expect(page.getByTestId('team-session')).not.toBeVisible();
      await page.getByTestId('team-incoming-demo').click(); await page.getByTestId('invite-accept').click();
      await expect(page.getByTestId('team-session')).toContainText('你已加入车队');
      await expect(page.getByTestId('team-lights')).toHaveCount(0); await expect(page.getByTestId('team-search')).toHaveCount(0);
      await page.getByTestId('team-exit').click(); await confirm(page); await expect(page.getByTestId('team-session')).not.toBeVisible();
      await page.getByTestId('team-incoming-demo').click(); await page.getByTestId('invite-accept').click();
      await page.getByTestId('team-poweroff-demo').click(); await expect(page.getByTestId('team-session')).not.toBeVisible();
      await expect(page.getByTestId('team-notice')).toContainText('队长车辆下电');
    });
    await run(browser, 'responsive no horizontal overflow across all new pages', async page => {
      await bind(page);
      for (const width of [375, 390, 320]) {
        await page.setViewportSize({ width, height: 812 });
        for (const target of ['sounds', 'sound-detail?kind=reverse', 'lights', 'light-rule', 'team', 'team-invitation']) {
          await route(page, `/pages/controls/${target}`);
          const overflow = await page.locator('.page-shell:visible').last().evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
          if (overflow.scroll > overflow.client + 2) throw new Error(`${width} ${target}: horizontal overflow ${JSON.stringify(overflow)}`);
        }
      }
    });
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

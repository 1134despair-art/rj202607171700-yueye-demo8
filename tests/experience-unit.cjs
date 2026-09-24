const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(relative) {
  const filename = path.resolve(__dirname, '../src/features/experience', relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const compiledModule = new Module(filename, module);
  compiledModule.filename = filename; compiledModule.paths = Module._nodeModulePaths(path.dirname(filename)); compiledModule._compile(compiled, filename);
  return compiledModule.exports;
}
const model = load('model.ts');
const transport = load('transport.ts');
let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`PASS ${name}`); }

test('audio format / size / duration boundaries', () => {
  ['test.mp3', 'test.M4A', '录音.wav'].forEach(name => model.validateAudio(name, 50, 2));
  model.validateAudio('max.wav', model.MAX_AUDIO_BYTES, 240);
  for (const [name, size, seconds] of [['test.txt', 10, 2], ['test.wav', 0, 2], ['test.wav', model.MAX_AUDIO_BYTES + 1, 2], ['test.wav', 10, 1], ['test.wav', 10, 240.1], ['test.wav', 10, NaN]]) assert.throws(() => model.validateAudio(name, size, seconds));
});
test('trim validation rejects inverted, short, nonfinite and outside ranges', () => {
  model.validateTrim(0, 240, 240); model.validateTrim(.5, 2, 2);
  [[0, 1, 2], [2, 1, 2], [-1, 2, 2], [0, 3, 2], [0, 241, 250], [NaN, 2, 2]].forEach(args => assert.throws(() => model.validateTrim(...args)));
});
test('preset sound library and required vehicle signals are complete', () => {
  for (const kind of ['startup', 'horn', 'reverse']) {
    assert.equal(model.soundPresets[kind].length, 3);
    model.soundPresets[kind].forEach(preset => assert.ok(preset.duration > 1 && preset.duration <= 240));
  }
  const ids = new Set(model.signals.map(signal => signal.id));
  for (const id of ['frontBrake', 'rearBrake', 'throttle', 'ignition', 'highBeam', 'leftTurn', 'rightTurn', 'hazard', 'hornSwitch', 'modeSwitch', 'combinationSwitch', 'current', 'rpm', 'temperature', 'motorTemperature', 'batteryTemperature', 'voltage', 'pitch', 'roll', 'acceleration', 'sideStand', 'speed']) assert.ok(ids.has(id), `missing signal ${id}`);
  const hazard = model.signals.find(signal => signal.id === 'hazard');
  assert.deepEqual(hazard.stateLabels, ['双闪关闭', '双闪开启']);
});
test('sound settings defaults, validation and legacy profile migration', () => {
  const defaults = model.defaultProfile();
  assert.deepEqual(defaults.soundSettings, { speakerEnabled: true, throttleWaveEnabled: false, startupEnabled: true, volume: 60 });
  model.validateSoundSettings(defaults.soundSettings);
  assert.throws(() => model.validateSoundSettings({ ...defaults.soundSettings, volume: 101 }));
  assert.throws(() => model.validateSoundSettings({ ...defaults.soundSettings, startupEnabled: 'yes' }));
  const legacy = { sounds: defaults.sounds, lights: defaults.lights, rules: [] };
  assert.deepEqual(model.normalizeProfile(legacy).soundSettings, defaults.soundSettings);
  const saved = model.normalizeProfile({ ...legacy, soundSettings: { ...defaults.soundSettings, volume: 35, speakerEnabled: false } });
  assert.equal(saved.soundSettings.volume, 35);
  assert.equal(saved.soundSettings.speakerEnabled, false);
});
test('five independent light zones and valid effect / color ranges', () => {
  const lights = model.defaultLights(); model.validateLights(lights);
  lights.zones[0].brightness = 20; assert.equal(lights.zones[1].brightness, 60);
  lights.zones[0].color = 'red'; assert.throws(() => model.validateLights(lights));
  lights.zones[0].color = '#112233'; lights.zones[0].speed = 101; assert.throws(() => model.validateLights(lights));
  assert.throws(() => model.validateLights({ zones: [lights.zones[0]] }));
});
function rule(id, priority, createdAt, value = 1000) { return { id, name: id, enabled: true, priority, createdAt, condition: { signal: 'rpm', compare: 'gte', value }, lights: model.defaultLights(), sound: 'none' }; }
test('one trigger / priority validation and deterministic rule selection', () => {
  const first = rule('first', 5, 1); const second = rule('second', 1, 2);
  model.validateRule(first); assert.equal(model.matchingRule([first, second], { rpm: 2000 }).id, 'second');
  second.enabled = false; assert.equal(model.matchingRule([first, second], { rpm: 2000 }).id, 'first');
  second.enabled = true; second.priority = 5; assert.equal(model.matchingRule([second, first], { rpm: 2000 }).id, 'first');
  assert.equal(model.matchingRule([first], { speed: 60 }), null);
  assert.equal(model.matchingRule([first], { rpm: NaN }), null);
  [0, 100, 1.5].forEach(priority => assert.throws(() => model.validateRule(rule('invalid', priority, 0))));
  first.condition = { signal: 'ignition', compare: 'gte', value: 1 }; assert.throws(() => model.validateRule(first));
});
test('snapshot isolation for invitation versus solo lights', () => {
  const profile = model.defaultProfile(); const invitation = model.clone({ lights: profile.lights, sound: 'startup' });
  invitation.lights.zones[0].color = '#FF0000'; assert.equal(profile.lights.zones[0].color, '#49A857');
  profile.sounds.startup.active = 'custom'; assert.equal(profile.sounds.horn.active, 'default');
});
(async () => {
  const receipt = await transport.sendExperienceCommand({ vehicleId: 'local', command: 'light.solo', scope: 'solo', payload: model.defaultLights() }, { assertConnected() {} });
  assert.equal(receipt.mode, 'mock');
  await assert.rejects(() => transport.sendExperienceCommand({ vehicleId: 'local', command: 'sound.upload', scope: 'solo', payload: {} }, { failed: true, assertConnected() {} }), /模拟传输失败/);
  let checks = 0;
  await assert.rejects(() => transport.sendExperienceCommand({ vehicleId: 'local', command: 'sound.upload', scope: 'solo', payload: {} }, { assertConnected() { checks += 1; if (checks > 2) throw new Error('disconnected'); } }), /disconnected/);
  console.log(`PASS transport success, explicit failure, mid-transfer disconnect\n${passed + 1} groups passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });

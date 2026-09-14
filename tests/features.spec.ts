import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useVehicleStore } from '@/stores/vehicle';
import { useAppStore } from '@/stores/app';
import { useOtaStore } from '@/stores/ota';
import { useDiagnosisStore } from '@/stores/diagnosis';
import { storageKeys, clearDemoStorage } from '@/utils/storage';

beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
async function connectedVehicle() {
  const vehicle = useVehicleStore();
  vehicle.bindVehicle(vehicle.availableVehicles[0]);
  const connecting = vehicle.connect();
  await vi.runAllTimersAsync();
  await connecting;
  return vehicle;
}

describe('sixth suite feature parity', () => {
  it('registers the seventh-suite entry, preserves every fifth-suite route and keeps each page local', () => {
    const current = JSON.parse(readFileSync(resolve('src/pages.json'),'utf8'));
    const expected = ['home/index','controls/index','service/index','me/index','me/update-messages','me/firmware-updates','onboarding/bind','controls/ride-modes','controls/power-curve','controls/wheel','service/status','service/battery','service/resources','service/diagnosis','service/diagnosis-result','service/ota','service/ota-detail','service/ota-progress','me/app-update','me/legal','me/about','me/debug'];
    const routes = current.pages.map((p: { path: string }) => p.path);
    expect(routes[0]).toBe('pages/raven/index');
    expect(routes).toEqual(expect.arrayContaining(expected.map(path => `pages/${path}`)));
    current.pages.forEach((p: { path: string }) => expect(existsSync(resolve('src',p.path + '.vue'))).toBe(true));
    expect(current.tabBar.list).toHaveLength(4);
  });
  it('does not read, overwrite or clear fifth-suite data', () => {
    uni.setStorageSync('binsen.adventure.v5.vehicle',{ id:'untouched' });
    expect(useVehicleStore().isBound).toBe(false);
    expect(Object.values(storageKeys).every(k => k.startsWith('binsen.raven.v7.'))).toBe(true);
    clearDemoStorage();
    expect(uni.getStorageSync('binsen.adventure.v5.vehicle')).toEqual({ id:'untouched' });
  });
  it('binds, connects, reads telemetry and preserves binding after disconnect', async () => {
    const vehicle = await connectedVehicle();
    expect(vehicle.hasTelemetry).toBe(true);
    expect(vehicle.telemetry.soc).toBe(78);
    vehicle.disconnect(true);
    expect(vehicle.isBound).toBe(true);
    expect(vehicle.hasTelemetry).toBe(false);
    expect(vehicle.shouldAutoConnect).toBe(false);
  });
  it('saves ride-mode values and restores them on a fresh store', async () => {
    const vehicle = await connectedVehicle();
    const saving = vehicle.writeControls({ regenLevel: 1, wheelieMode:'custom',wheelieMaxAngle:53,speedLimit:25 });
    await vi.runAllTimersAsync(); await saving;
    setActivePinia(createPinia());
    expect(useVehicleStore().controls).toMatchObject({regenLevel:1,wheelieMode:'custom',wheelieMaxAngle:55,speedLimit:25});
  });
  it('rejects disconnected writes and does not persist failed writes', async () => {
    const vehicle = useVehicleStore();
    await expect(vehicle.writeControl('autoPark', false)).rejects.toThrow();
    await connectedVehicle();
    const previous = vehicle.controls.regenLevel;
    vehicle.failNextWrite = true;
    const failed = expect(vehicle.writeControl('regenLevel', 3)).rejects.toThrow();
    await vi.runAllTimersAsync(); await failed;
    expect(vehicle.controls.regenLevel).toBe(previous);
    expect(vehicle.saving).toBe(false);
  });
  it('persists the explicit wheelie disclaimer and stays dark-only', () => {
    const app = useAppStore();
    expect(app.wheelieDisclaimerAccepted).toBe(false);
    app.acceptWheelieDisclaimer(); app.setThemeMode('light');
    setActivePinia(createPinia());
    expect(useAppStore().wheelieDisclaimerAccepted).toBe(true);
    expect(useAppStore().resolvedTheme).toBe('dark');
  });
  it('keeps telemetry unavailable for the no-data scenario', async () => {
    const vehicle = await connectedVehicle();
    const updating = vehicle.setTelemetryScenario('no-data');
    await vi.runAllTimersAsync(); await updating;
    expect(vehicle.isConnected).toBe(true);
    expect(vehicle.hasTelemetry).toBe(false);
  });
  it('records successful telemetry time, preserves it offline and clears it for another vehicle', async () => {
    const vehicle = await connectedVehicle();
    const syncedAt = vehicle.lastTelemetryAt;
    expect(syncedAt).toBe(Date.now());
    vehicle.disconnect();
    expect(vehicle.lastTelemetryAt).toBe(syncedAt);
    vehicle.bindVehicle(vehicle.availableVehicles[0]);
    expect(vehicle.lastTelemetryAt).toBeNull();
    const reconnecting = vehicle.connect();
    await vi.runAllTimersAsync(); await reconnecting;
    vehicle.unbindVehicle();
    expect(vehicle.lastTelemetryAt).toBeNull();
  });
  it('does not advance the sync timestamp on missing data or a failed read', async () => {
    const vehicle = await connectedVehicle();
    const syncedAt = vehicle.lastTelemetryAt;
    const missing = vehicle.setTelemetryScenario('no-data');
    await vi.runAllTimersAsync(); await missing;
    expect(vehicle.lastTelemetryAt).toBe(syncedAt);
    vehicle.failNextRead = true;
    const failed = expect(vehicle.loadVehicleData()).rejects.toThrow();
    await vi.runAllTimersAsync(); await failed;
    expect(vehicle.lastTelemetryAt).toBe(syncedAt);
  });
  it('shows low battery only for valid live telemetry and hides stale alerts offline', async () => {
    const vehicle = await connectedVehicle();
    expect(vehicle.isBatteryLow).toBe(false);
    vehicle.telemetry.soc = 20;
    expect(vehicle.isBatteryLow).toBe(true);
    vehicle.telemetry.soc = 0;
    expect(vehicle.isBatteryLow).toBe(true);
    vehicle.telemetry.soc = -1;
    expect(vehicle.isBatteryLow).toBe(false);
    vehicle.telemetry.soc = Number.NaN;
    expect(vehicle.isBatteryLow).toBe(false);
    vehicle.telemetry.soc = 19;
    vehicle.telemetryAvailable = false;
    expect(vehicle.isBatteryLow).toBe(false);
    const alerting = vehicle.setTelemetryScenario('overheat');
    await vi.runAllTimersAsync(); await alerting;
    expect(vehicle.activeAlert).toBe('overheat');
    vehicle.disconnect();
    expect(vehicle.isBatteryLow).toBe(false);
    expect(vehicle.activeAlert).toBeNull();
  });
  it('runs and persists both healthy and fault diagnoses', async () => {
    const diagnosis = useDiagnosisStore();
    const healthy = diagnosis.run('normal');
    await vi.runAllTimersAsync(); expect((await healthy)?.healthy).toBe(true);
    const faulty = diagnosis.run('motor-sensor');
    await vi.runAllTimersAsync(); expect((await faulty)?.healthy).toBe(false);
    setActivePinia(createPinia());
    expect(useDiagnosisStore().latest?.items.some(item => item.code === 'MTR-P021')).toBe(true);
  });
  it('requires verification and updates the shared firmware count after install', async () => {
    const ota = useOtaStore();
    expect(ota.start()).toBe(false);
    const count = ota.updateCount;
    const module = ota.modules.find(item => item.hasUpdate)!;
    ota.selectModule(module.id);
    const preparing = ota.prepareUpdate();
    await vi.runAllTimersAsync(); expect(await preparing).toBe(true);
    expect(ota.start()).toBe(true);
    await vi.runAllTimersAsync();
    expect(ota.session.stage).toBe('success');
    expect(ota.updateCount).toBe(count-1);
    setActivePinia(createPinia());
    expect(useOtaStore().updateCount).toBe(count-1);
  });
  it('blocks an OTA package after verification fails', async () => {
    const ota = useOtaStore();
    const preparing = ota.prepareUpdate('verify-failed');
    await vi.runAllTimersAsync();
    expect(await preparing).toBe(false);
    expect(ota.start()).toBe(false);
  });
  it('unbinds and keeps the other suites intact', async () => {
    const vehicle = await connectedVehicle();
    vehicle.unbindVehicle();
    setActivePinia(createPinia());
    expect(useVehicleStore().isBound).toBe(false);
    expect(useVehicleStore().shouldAutoConnect).toBe(false);
  });
});

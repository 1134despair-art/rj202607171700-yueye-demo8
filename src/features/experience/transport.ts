import type { NearbyVehicle } from './model';

export type ExperienceCommand =
  | 'sound.upload' | 'sound.activate' | 'sound.delete' | 'sound.settings' | 'light.solo' | 'rule.save' | 'rule.delete'
  | 'team.search' | 'team.stop-search' | 'team.invite' | 'team.accept' | 'team.reject'
  | 'team.remove' | 'team.leave' | 'team.disband' | 'team.lights' | 'team.hazard' | 'team.horn' | 'team.audio';
export interface ExperienceEnvelope { vehicleId: string; command: ExperienceCommand; scope: 'solo' | 'team'; payload: unknown }
export interface ExperienceReceipt { requestId: string; mode: 'mock'; accepted: true }
export async function sendExperienceCommand(envelope: ExperienceEnvelope, options: { failed?: boolean; assertConnected: () => void; progress?: (value: number) => void }): Promise<ExperienceReceipt> {
  options.assertConnected();
  const steps = envelope.command === 'sound.upload' ? 8 : envelope.command === 'team.audio' ? 6 : 1;
  for (let step = 1; step <= steps; step += 1) {
    await new Promise(resolve => setTimeout(resolve, steps > 1 ? 180 : 280));
    options.assertConnected();
    if (options.failed && step === Math.ceil(steps / 2)) throw new Error('模拟传输失败，原配置未改变，请手动重试');
    options.progress?.(Math.round(step / steps * 100));
  }
  return { requestId: `mock-${Date.now()}`, mode: 'mock', accepted: true };
}
export const mockNearbyVehicles: NearbyVehicle[] = [
  { id: 'nearby-pine', name: '林间骑士', model: 'X5', response: 'accepted' },
  { id: 'nearby-ridge', name: '山脊同行', model: 'X1', response: 'accepted' },
  { id: 'nearby-trail', name: '独行山路', model: 'X5', response: 'rejected' },
];

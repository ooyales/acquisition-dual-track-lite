import client from './client';
import type { IntakeOptions, DerivationResult } from '../types';

export const intakeApi = {
  getOptions: (): Promise<IntakeOptions> =>
    client.get('/intake/options').then(r => r.data),
  derive: (data: Record<string, unknown>): Promise<DerivationResult> =>
    client.post('/intake/derive', data).then(r => r.data),
  complete: (requestId: number, data?: Record<string, unknown>) =>
    client.post(`/intake/complete/${requestId}`, data || {}).then(r => r.data),
  recalculate: (requestId: number, data: Record<string, unknown>) =>
    client.post(`/intake/recalculate/${requestId}`, data).then(r => r.data),
};

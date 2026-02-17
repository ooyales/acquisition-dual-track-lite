import client from './client';

export const dashboardApi = {
  metrics: () => client.get('/dashboard').then(r => r.data),
  pipeline: () => client.get('/dashboard/pipeline').then(r => r.data),
  cycleTime: () => client.get('/dashboard/cycle-time').then(r => r.data),
  funding: () => client.get('/dashboard/funding').then(r => r.data),
};

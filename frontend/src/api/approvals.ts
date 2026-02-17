import client from './client';

export const approvalsApi = {
  queue: () => client.get('/approvals/queue').then(r => r.data),
  forRequest: (requestId: number) =>
    client.get(`/approvals/request/${requestId}`).then(r => r.data),
  action: (stepId: number, data: { action: string; role?: string; comments?: string }) =>
    client.post(`/approvals/${stepId}/action`, data).then(r => r.data),
  gateCheck: (stepId: number) =>
    client.get(`/approvals/${stepId}/gate-check`).then(r => r.data),
};

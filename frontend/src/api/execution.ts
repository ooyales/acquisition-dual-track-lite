import client from './client';

export const executionApi = {
  list: (params?: Record<string, string>) =>
    client.get('/execution', { params }).then(r => r.data),
  get: (id: number) =>
    client.get(`/execution/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    client.post('/execution', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/execution/${id}`, data).then(r => r.data),
  submit: (id: number) =>
    client.post(`/execution/${id}/submit`).then(r => r.data),
  approve: (id: number, data: { role: string; action: string; comments?: string }) =>
    client.post(`/execution/${id}/approve`, data).then(r => r.data),
  invoice: (id: number, data: Record<string, unknown>) =>
    client.post(`/execution/${id}/invoice`, data).then(r => r.data),
  validate: (id: number) =>
    client.post(`/execution/${id}/validate`).then(r => r.data),
};

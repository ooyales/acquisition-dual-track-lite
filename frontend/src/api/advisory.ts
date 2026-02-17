import client from './client';

export const advisoryApi = {
  queue: () => client.get('/advisory/queue').then(r => r.data),
  forRequest: (requestId: number) =>
    client.get(`/advisory/request/${requestId}`).then(r => r.data),
  submit: (id: number, data: Record<string, unknown>) =>
    client.post(`/advisory/${id}`, data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/advisory/${id}`, data).then(r => r.data),
};

import client from './client';

export const clinsApi = {
  forRequest: (requestId: number) =>
    client.get(`/clins/request/${requestId}`).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    client.post('/clins', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/clins/${id}`, data).then(r => r.data),
  remove: (id: number) =>
    client.delete(`/clins/${id}`).then(r => r.data),
  summary: (requestId: number) =>
    client.get(`/clins/request/${requestId}/summary`).then(r => r.data),
};

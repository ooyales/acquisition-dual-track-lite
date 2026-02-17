import client from './client';

export const documentsApi = {
  getForRequest: (requestId: number) =>
    client.get(`/documents/request/${requestId}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/documents/${id}`, data).then(r => r.data),
  draftAI: (id: number, data: Record<string, unknown>) =>
    client.post(`/documents/${id}/draft-ai`, data).then(r => r.data),
  reviewAI: (id: number) =>
    client.post(`/documents/${id}/review-ai`).then(r => r.data),
};

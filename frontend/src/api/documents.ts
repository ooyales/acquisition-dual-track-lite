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
  toggleRequired: (id: number, isRequired: boolean) =>
    client.post(`/documents/${id}/toggle-required`, { is_required: isRequired }).then(r => r.data),
  upload: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/documents/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  download: (id: number) =>
    client.get(`/documents/${id}/download`, { responseType: 'blob' }).then(r => {
      const url = window.URL.createObjectURL(r.data);
      const disposition = r.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : 'document';
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }),
};

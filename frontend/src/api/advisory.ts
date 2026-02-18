import client from './client';

export const advisoryApi = {
  queue: () => client.get('/advisory/queue').then(r => r.data),
  forRequest: (requestId: number) =>
    client.get(`/advisory/request/${requestId}`).then(r => r.data),
  submit: (id: number, data: Record<string, unknown>) =>
    client.post(`/advisory/${id}`, data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    client.put(`/advisory/${id}`, data).then(r => r.data),
  respond: (id: number, response: string, file?: File) => {
    const formData = new FormData();
    formData.append('response', response);
    if (file) formData.append('file', file);
    return client.post(`/advisory/${id}/respond`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  downloadAttachment: (id: number) =>
    client.get(`/advisory/${id}/attachment`, { responseType: 'blob' }).then(r => {
      const url = window.URL.createObjectURL(r.data);
      const disposition = r.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : 'attachment';
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }),
};

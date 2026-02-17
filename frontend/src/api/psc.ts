import client from './client';

export const pscApi = {
  list: (params?: Record<string, string>) =>
    client.get('/psc', { params }).then(r => r.data),
  search: (query: string) =>
    client.get('/psc/search', { params: { q: query } }).then(r => r.data),
};

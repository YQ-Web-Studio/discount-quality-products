import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/wp-json/wc/v3/*', () => {
    return HttpResponse.json([]);
  }),
  http.post('*/wp-json/wc/v3/*', () => {
    return HttpResponse.json({ id: 101, status: 'processing' });
  }),
];

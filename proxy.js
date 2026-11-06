import { rewrite } from '@vercel/functions';

export default function proxy(request) {
  const accept = request.headers.get('accept') || '';
  if (/text\/markdown/i.test(accept)) {
    return rewrite(new URL('/index.md', request.url));
  }
}

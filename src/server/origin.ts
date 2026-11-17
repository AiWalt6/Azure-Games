import type { IncomingHttpHeaders } from 'node:http';

export function allowsSocketRequest(headers: IncomingHttpHeaders, publicOrigin: string | undefined, production: boolean): boolean {
  if (!publicOrigin) return !production;
  if (headers.origin !== undefined) return headers.origin === publicOrigin;
  // Browsers omit Origin on same-origin GET polling requests. Fetch Metadata
  // distinguishes those from cross-site requests without weakening token auth.
  return headers['sec-fetch-site'] === 'same-origin';
}

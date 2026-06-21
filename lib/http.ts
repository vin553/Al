// Resolve the public origin of an incoming request, honouring the reverse
// proxy headers that hosts like Render/Vercel set. Used to build OAuth
// redirect URIs that match the live domain.
export function originOf(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

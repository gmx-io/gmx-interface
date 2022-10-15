export function getRootUrl() {
  const { origin, protocol, hostname, port } = window.location;
  let url = origin;
  if (!origin) {
    const portString = port && `:${port}`;
    url = `${protocol}//${hostname}${portString}`;
  }
  return url;
}

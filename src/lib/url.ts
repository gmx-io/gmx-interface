export function getUrlHost(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

export function getRootUrl() {
  const { origin, protocol, hostname, port } = window.location;
  let url = origin;
  if (!origin) {
    const portString = port && `:${port}`;
    url = `${protocol}//${hostname}${portString}`;
  }
  return url;
}

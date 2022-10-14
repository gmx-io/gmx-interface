export function getRootUrl() {
  const { origin } = window.location;
  let url = origin;
  if (!origin) {
    url = `${window.location.protocol}//${window.location.hostname}${
      window.location.port && `:${window.location.port}`
    }`;
  }
  return url;
}

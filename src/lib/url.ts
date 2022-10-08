export function getRootUrl() {
  let url = window.location.origin;
  if (!window.location.origin) {
    url =
      window.location.protocol +
      "//" +
      window.location.hostname +
      (window.location.port ? ":" + window.location.port : "");
  }
  return url;
}

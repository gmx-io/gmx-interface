export function get1InchSwapUrl(chainId, from, to) {
  const rootUrl = `https://app.1inch.io/#/${chainId}/unified/swap`;
  if (!from && !to) return rootUrl;
  return `${rootUrl}/${from}/${to}`;
}

export function getRootUrl() {
  if (!window.location.origin) {
    window.location.origin =
      window.location.protocol +
      "//" +
      window.location.hostname +
      (window.location.port ? ":" + window.location.port : "");
  }
  return window.location.origin;
}

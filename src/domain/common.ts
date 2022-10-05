export function get1InchSwapUrl(chainId: number, from?: string, to?: string) {
  const rootUrl = `https://app.1inch.io/#/${chainId}/unified/swap`;
  if (!from && !to) return rootUrl;
  return `${rootUrl}/${from}/${to}`;
}

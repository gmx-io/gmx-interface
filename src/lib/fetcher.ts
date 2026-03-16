export function arrayURLFetcher(urlArr: string[]) {
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  return Promise.all(urlArr.map(fetcher));
}

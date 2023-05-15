export function arrayURLFetcher(...urlArr) {
  const fetcher = (url) => fetch(url).then((res) => res.json());
  return Promise.all(urlArr.map(fetcher));
}

export function jsonFetcher(...args: any) {
  // @ts-ignore
  return fetch(...args).then((res) => res.json());
}

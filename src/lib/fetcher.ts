export function arrayURLFetcher(urlArr) {
  const fetcher = (url) => fetch(url).then((res) => res.json());
  return Promise.all(urlArr.map(fetcher));
}

export function jsonFetcher(url) {
  // @ts-ignore
  return fetch(url).then((res) => res.json());
}

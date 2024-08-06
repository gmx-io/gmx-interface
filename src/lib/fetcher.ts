export function arrayURLFetcher(urlArr) {
  const fetcher = (url) => fetch(url).then((res) => res.json());
  return Promise.all(urlArr.map(fetcher));
}

export function jsonFetcher<T>(url) {
  return fetch(url).then((res) => res.json() as Promise<T>);
}

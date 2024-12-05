import queryString from "query-string";

export function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined>) {
  const qs = query ? `?${queryString.stringify(query)}` : "";

  return `${baseUrl}${path}${qs}`;
}

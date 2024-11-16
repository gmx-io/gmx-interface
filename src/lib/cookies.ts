export function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

// maxAge and domain are optional
export function setCookie(name: string, value: string, maxAge?: number, domain?: string) {
  const maxAgeStr = maxAge ? `max-age=${maxAge};` : "";
  const domainStr = domain ? `domain=${domain};` : "";

  document.cookie = `${name}=${value}; path=/; ${maxAgeStr} ${domainStr}`;
}

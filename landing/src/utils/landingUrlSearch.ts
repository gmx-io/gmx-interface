// Hash search overrides outer search to match main app's useHashQueryParams.
export function getLandingUrlSearch(): URLSearchParams {
  const merged = new URLSearchParams(window.location.search);

  const hashQueryIndex = window.location.hash.indexOf("?");
  if (hashQueryIndex !== -1) {
    new URLSearchParams(window.location.hash.slice(hashQueryIndex)).forEach((value, key) => {
      merged.set(key, value);
    });
  }

  return merged;
}

// Legacy hash routes are rewritten to real paths in landing/src/index.tsx, so their query
// params are already merged into the search by the time this is read.
export function getLandingUrlSearch(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

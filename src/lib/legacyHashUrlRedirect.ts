import { redirectLegacyHashUrl, watchLegacyHashUrl } from "./legacyHashUrl";

// Imported for its side effect so the rewrite happens during module evaluation. A plain call in the
// entrypoint would be too late: every `import` there is evaluated first, and modules that snapshot
// the location at module scope (lib/metrics) would still read the legacy hash url.
redirectLegacyHashUrl();
watchLegacyHashUrl();

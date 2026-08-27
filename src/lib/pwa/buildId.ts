export const BUILD_ID_PATTERN = /^\d+$/;
export const UNKNOWN_BUILD_ID = "unknown";

const BUILD_ID_META_SELECTOR = 'meta[name="gmx-pwa-build-id"]';
const BUILD_ID_META_PATTERN = /<meta\s+name=["']gmx-pwa-build-id["']\s+content=["']([^"']+)["'][^>]*>/i;
const APP_SHELL_URL = "/";

let networkBuildIdRequest: Promise<string | undefined> | undefined;

export function getDocumentBuildId() {
  return document.querySelector<HTMLMetaElement>(BUILD_ID_META_SELECTOR)?.content;
}

export function getBuildIdFromHtml(html: string) {
  const buildId = html.match(BUILD_ID_META_PATTERN)?.[1];
  return buildId && BUILD_ID_PATTERN.test(buildId) ? buildId : undefined;
}

export function getIsNewerBuildId(currentBuildId: string | undefined, candidateBuildId: string | undefined) {
  if (!currentBuildId || !candidateBuildId) {
    return false;
  }

  const current = BUILD_ID_PATTERN.test(currentBuildId) ? Number(currentBuildId) : undefined;
  const candidate = BUILD_ID_PATTERN.test(candidateBuildId) ? Number(candidateBuildId) : undefined;
  if (current === undefined || candidate === undefined) {
    return false;
  }

  return Number.isSafeInteger(current) && Number.isSafeInteger(candidate) && candidate > current;
}

/**
 * Reads the build id the network currently serves. The service worker only intercepts navigations
 * and `/assets/`, so this bypasses the cached app shell and reaches the origin. Callers that ask at
 * the same time share one request, since boot has two of them.
 */
export function fetchNetworkBuildId() {
  if (!networkBuildIdRequest) {
    networkBuildIdRequest = readNetworkBuildId().finally(() => {
      networkBuildIdRequest = undefined;
    });
  }

  return networkBuildIdRequest;
}

async function readNetworkBuildId() {
  try {
    const response = await fetch(APP_SHELL_URL, { cache: "no-store" });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      return undefined;
    }

    return getBuildIdFromHtml(await response.text());
  } catch {
    return undefined;
  }
}

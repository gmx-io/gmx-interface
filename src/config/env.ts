import { PRODUCTION_PREVIEW_KEY } from "./localStorage";

export const UI_VERSION = "1.4";

export const IS_TOUCH = "ontouchstart" in self;

export const isWebWorker = Boolean(self.WorkerGlobalScope);

export function isDevelopment() {
  const isProductionPreview = isWebWorker
    ? // @ts-ignore
      Boolean((self as DedicatedWorkerGlobalScope).PRODUCTION_PREVIEW_KEY)
    : Boolean(localStorage.getItem(PRODUCTION_PREVIEW_KEY));

  return !self.location.host?.includes("gmx.io") && !self.location.host?.includes("ipfs.io") && !isProductionPreview;
}

export function isLocal() {
  return self.location.host?.includes("localhost");
}

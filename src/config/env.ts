import { PRODUCTION_PREVIEW_KEY } from "./localStorage";
import staticConfig from "../../public/config.json";

export const UI_VERSION = staticConfig.uiVersion;

export const IS_TOUCH = "ontouchstart" in self;

export const isWebWorker = Boolean(self.WorkerGlobalScope);

export const APP_VERSION = import.meta.env.VITE_APP_VERSION;

export const IS_HOME_SITE = import.meta.env.VITE_IS_HOME_SITE;

export function isDevelopment() {
  return false;
  const isProductionPreview = isWebWorker
    ? // @ts-ignore
      Boolean((self as DedicatedWorkerGlobalScope).PRODUCTION_PREVIEW_KEY)
    : Boolean(localStorage.getItem(PRODUCTION_PREVIEW_KEY));

  return !self.location.host?.includes("gmx.io") && !self.location.host?.includes("ipfs.io") && !isProductionPreview;
}

export function isLocal() {
  return self.location.host?.includes("localhost");
}

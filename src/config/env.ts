import { PRODUCTION_PREVIEW_KEY } from "./localStorage";

export const UI_VERSION = "1.4";

export const IS_TOUCH = "ontouchstart" in window;

export function isDevelopment() {
  const isProductionPreview = Boolean(localStorage.getItem(PRODUCTION_PREVIEW_KEY));

  return (
    !window.location.host?.includes("gmx.io") && !window.location.host?.includes("ipfs.io") && !isProductionPreview
  );
}

export function isLocal() {
  return window.location.host?.includes("localhost");
}

export const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const DYNAMIC_ENVIRONMENT_KEY = process.env.DYNAMIC_WALLET_KEY;

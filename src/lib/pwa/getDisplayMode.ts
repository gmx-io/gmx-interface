import { getIsInstalledApp } from "./getIsInstalledApp";

export type DisplayMode = "browser" | "standalone";

export function getDisplayMode(): DisplayMode {
  return getIsInstalledApp() ? "standalone" : "browser";
}

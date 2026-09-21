/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite/client" />

declare module "*.po" {
  export const messages: import("@lingui/core").Messages;
}

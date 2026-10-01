import type { Plugin } from "vite";

export function vitePluginUiBuildInfo(options: { appVersion: string }): Plugin {
  const buildTime = new Date().toISOString();
  return {
    name: "vite-plugin-ui-build-info",
    transformIndexHtml(html) {
      return html.replace(
        /<body([^>]*)>/,
        `<body$1 data-ui-build-time="${buildTime}" data-app-version="${options.appVersion}">`,
      );
    },
  };
}

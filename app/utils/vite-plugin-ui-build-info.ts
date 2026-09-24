import type { Plugin } from 'vite';

/**
 * Injects UI build metadata for the app bundle (version + build timestamp).
 * Build time is captured when Vite starts (build or dev server).
 */
export function vitePluginUiBuildInfo(options: { appVersion: string }): Plugin {
  const { appVersion } = options;
  const buildTime = new Date().toISOString();

  return {
    name: 'vite-plugin-ui-build-info',
    config() {
      return {
        define: {
          __APP_VERSION__: JSON.stringify(appVersion),
          __UI_BUILD_TIME__: JSON.stringify(buildTime),
        },
      };
    },
    transformIndexHtml(html) {
      return html.replace(
        /<body([^>]*)>/,
        `<body$1 data-ui-build-time="${buildTime}" data-app-version="${appVersion}">`
      );
    },
  };
}

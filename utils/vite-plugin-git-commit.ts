import { execSync } from "node:child_process";
import type { Plugin } from "vite";

export function vitePluginGitCommit(options?: { shortHash?: boolean; includeTimestamp?: boolean }): Plugin {
  const { shortHash = true, includeTimestamp = false } = options || {};
  const commitHash = execSync(shortHash ? "git rev-parse --short HEAD" : "git rev-parse HEAD", { encoding: "utf-8" }).trim();
  const timestamp = includeTimestamp ? new Date().toISOString() : null;
  return {
    name: "vite-plugin-git-commit",
    transformIndexHtml(html) {
      let attributes = `data-commit="${commitHash}"`;
      if (timestamp) attributes += ` data-build-time="${timestamp}"`;
      return html.replace(/<body([^>]*)>/, `<body$1 ${attributes}>`);
    },
  };
}

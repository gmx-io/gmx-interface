import { execSync } from 'child_process';
import type { Plugin } from 'vite';

/**
 * Get the current Git commit hash
 * @param short - Whether to return the short version of the commit hash
 * @returns The Git commit hash or 'unknown' if not in a Git repository
 */
function getGitCommitHash(short = true): string {
  try {
    const command = short ? 'git rev-parse --short HEAD' : 'git rev-parse HEAD';
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.warn('Failed to get Git commit hash:', error);
    return 'unknown';
  }
}

/**
 * Vite plugin to inject Git commit information into the HTML body tag
 * @param options - Plugin options
 * @returns Vite plugin
 */
export function vitePluginGitCommit(options?: {
  shortHash?: boolean;
  includeTimestamp?: boolean;
}): Plugin {
  const { shortHash = true, includeTimestamp = false } = options || {};

  const commitHash = getGitCommitHash(shortHash);
  const timestamp = includeTimestamp ? new Date().toISOString() : null;

  return {
    name: 'vite-plugin-git-commit',
    transformIndexHtml(html) {
      // Build the data attributes to inject
      let attributes = `data-commit="${commitHash}"`;

      if (timestamp) {
        attributes += ` data-build-time="${timestamp}"`;
      }

      // Replace the <body> tag with the one including Git commit info
      return html.replace(/<body([^>]*)>/, `<body$1 ${attributes}>`);
    },
  };
}

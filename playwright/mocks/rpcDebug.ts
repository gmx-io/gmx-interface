/**
 * Mock for lib/rpc/_debug used in Playwright CT builds.
 * The real module has a circular dependency that causes TDZ errors
 * in production bundles.
 */
export const _debugRpcTracker = undefined;

export enum RpcDebugFlags {
  DebugLargeAccount = "debugLargeAccount",
  DebugAlchemy = "debugAlchemy",
}

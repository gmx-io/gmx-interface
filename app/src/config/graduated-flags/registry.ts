const modules = import.meta.glob<boolean>(['./*.ts', '!./registry.ts'], {
  eager: true,
  import: 'default',
});

function pathToFlagKey(path: string): string {
  const name = path.match(/\/([^/]+)\.ts$/)?.[1] ?? '';
  return `FEATURE_NIGHTLY_${name}`;
}

export const graduatedFlagSet = new Set(
  Object.entries(modules)
    .filter(([, enabled]) => enabled === true)
    .map(([path]) => pathToFlagKey(path))
);

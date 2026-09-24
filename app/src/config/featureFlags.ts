import { graduatedFlagSet } from './graduated-flags/registry';

const isTrue = (value?: string) => {
  return value && typeof value === 'string' && value.toLocaleLowerCase() !== 'false';
}

const featureFlags: FeatureFlags = new Proxy({}, {
  get(_, prop) {
   
    if (typeof prop !== 'string') {
      return false;
    }
    if (prop.endsWith('_PASS')) {
      return true;
    }
    if (isTrue(import.meta.env.VITE_FORCE_GRADUATED_FLAGS)) {
      return graduatedFlagSet.has(prop);
    }
    if (import.meta.env.DEV) {
      return true;
    }
    const nightlyFlag = isTrue(import.meta.env.VITE_NIGHTLY);
    const previewFlag = import.meta.env.MODE === 'preview';
    if (nightlyFlag || previewFlag) {
      return true;
    }
    return graduatedFlagSet.has(prop);
  },
});

export default featureFlags;

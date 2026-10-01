import { sha256 } from '@noble/hashes/sha256';

export const keyToSeed = (key: string) => sha256(key);

const BLACKLISTED_REGEX = /Wrapped|\(Wormhole\)|\(LayerZero\)/gim;

export function stripBlacklistedWords(name: string): string {
  return name.replace(BLACKLISTED_REGEX, '').trim();
}

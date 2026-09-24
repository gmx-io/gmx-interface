export function getNormalizedTokenSymbolGMX(tokenSymbol: string) {
  if (!tokenSymbol) {
    return '';
  }
  if (['WGMX'].includes(tokenSymbol)) {
    return tokenSymbol.substr(1);
  } else if (tokenSymbol?.includes('.')) {
    return tokenSymbol.split('.')[0];
  }
  return tokenSymbol;
}

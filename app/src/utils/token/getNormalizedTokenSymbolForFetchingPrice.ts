export function getNormalizedTokenSymbolForFetchingPrice(tokenSymbol: string) {
  if (['WSOL', 'WETH', 'WBTC', 'WPUMP', 'WGMX'].includes(tokenSymbol)) {
    return tokenSymbol.substr(1);
  } else if (tokenSymbol.includes('.')) {
    return tokenSymbol.split('.')[0];
  }
  return tokenSymbol;
}

/*
Metamask sometimes does not recognize the connected network is not supported.
So we have to manually check the chainId from the window.

All data derived from rainbowkit config is poisoned and should not be trusted.
*/

export function getRealChainId() {
  // @ts-ignore
  const modernChainId = window.ethereum?.networkVersion;
  // @ts-ignore
  const legacyChainId = window.web3?.currentProvider?.networkVersion;

  const raw: string | undefined = modernChainId || legacyChainId;

  if (!raw) {
    return undefined;
  }

  const number = parseInt(raw, 10);

  if (isNaN(number)) {
    return undefined;
  }

  return number;
}

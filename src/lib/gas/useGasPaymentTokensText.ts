import { useMemo } from "react";

import { useMultichainTransferableGasPaymentTokenSymbols } from "domain/multichain/useMultichainTransferableGasPaymentTokenSymbols";
import { useChainId } from "lib/chains";
import { useLocalizedList } from "lib/i18n";
import { getGasPaymentTokens } from "sdk/configs/express";
import { getToken } from "sdk/configs/tokens";

export function useGasPaymentTokensText(chainId: number) {
  const { srcChainId } = useChainId();

  const settlementGasPaymentTokenSymbols = useMemo(
    () => getGasPaymentTokens(chainId).map((tokenAddress) => getToken(chainId, tokenAddress)?.symbol),
    [chainId]
  );
  const multichainGasPaymentTokenSymbols = useMultichainTransferableGasPaymentTokenSymbols();
  const gasPaymentTokenSymbols = srcChainId ? multichainGasPaymentTokenSymbols : settlementGasPaymentTokenSymbols;

  const localizedList = useLocalizedList(gasPaymentTokenSymbols);

  return {
    gasPaymentTokensText: localizedList,
    gasPaymentTokenSymbols,
  };
}

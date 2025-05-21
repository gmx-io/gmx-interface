import { useCallback } from "react";

import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { getGasPaymentTokens } from "sdk/configs/express";

import { useGmxAccountTokensDataRequest } from "components/Synthetics/GmxAccountModal/hooks";

import { GasPaymentTokenOption } from "./GasPaymentTokenOptionCard";

type Props = {
  currentTokenAddress: string | undefined;
  onSelectToken: (address: string) => void;
};

export function GasPaymentTokenSelector({ currentTokenAddress, onSelectToken }: Props) {
  const { chainId, srcChainId } = useChainId();
  // TODO: pick from synthetic state
  const { tokensData: settlementChainTokensData } = useTokensDataRequest(chainId);
  const { tokensData: gmxAccountTokensData } = useGmxAccountTokensDataRequest(chainId);

  let tokensData = settlementChainTokensData;

  if (srcChainId) {
    tokensData = gmxAccountTokensData;
  }

  const gasPaymentTokens = getGasPaymentTokens(chainId);

  const onSelectFactory = useCallback(
    (tokenAddress: string) => () => {
      onSelectToken(tokenAddress);
    },
    [onSelectToken]
  );

  return (
    <div>
      <div className="flex gap-8">
        {gasPaymentTokens.map((tokenAddress) => (
          <GasPaymentTokenOption
            tokensData={tokensData}
            key={tokenAddress}
            tokenAddress={tokenAddress}
            isSelected={currentTokenAddress === tokenAddress}
            onSelect={onSelectFactory(tokenAddress)}
          />
        ))}
      </div>
    </div>
  );
}

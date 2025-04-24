import { useCallback } from "react";

import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { getGasPaymentTokens } from "sdk/configs/express";

import { GasPaymentTokenOption } from "./GasPaymentTokenOptionCard";

type Props = {
  currentTokenAddress: string | undefined;
  onSelectToken: (address: string) => void;
};

export function GasPaymentTokenSelector({ currentTokenAddress, onSelectToken }: Props) {
  const { chainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId);
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

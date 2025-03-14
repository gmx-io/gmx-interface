import { useChainId } from "lib/chains";
import { getGasPaymentTokens } from "sdk/configs/gassless";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { GasPaymentTokenOption } from "./GasPaymentTokenOptionCard";

type Props = {
  curentTokenAddress: string;
  onSelectToken: (address: string) => void;
};

export function GasPaymentTokenSelector({ curentTokenAddress, onSelectToken }: Props) {
  const { chainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId);
  const gasPaymentTokens = getGasPaymentTokens(chainId);

  return (
    <div>
      <div className="flex gap-8">
        {gasPaymentTokens.map((tokenAddress) => (
          <GasPaymentTokenOption
            tokensData={tokensData}
            key={tokenAddress}
            tokenAddress={tokenAddress}
            isSelected={curentTokenAddress === tokenAddress}
            onSelect={() => onSelectToken(tokenAddress)}
          />
        ))}
      </div>
    </div>
  );
}

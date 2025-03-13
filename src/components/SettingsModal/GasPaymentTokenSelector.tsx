import { useChainId } from "lib/chains";
import { getGasPaymentTokens } from "sdk/configs/gassless";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { GasPaymentTokenOption } from "./GasPaymentTokenOptionCard";

type Props = {
  gasPaymentTokenAddress: string;
  onSelectToken: (address: string) => void;
};

export function GasPaymentTokenSelector({ gasPaymentTokenAddress, onSelectToken }: Props) {
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
            isSelected={gasPaymentTokenAddress === tokenAddress}
            onSelect={() => onSelectToken(tokenAddress)}
          />
        ))}
      </div>
    </div>
  );
}

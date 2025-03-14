import cx from "classnames";
import TokenIcon from "components/TokenIcon/TokenIcon";
import { TokensData } from "domain/synthetics/tokens/types";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getToken } from "sdk/configs/tokens";
import { convertToUsd } from "sdk/utils/tokens";

type Props = {
  tokensData?: TokensData;
  tokenAddress: string;
  isSelected: boolean;
  onSelect: () => void;
};

export function GasPaymentTokenOption({ tokenAddress, isSelected, onSelect, tokensData }: Props) {
  const { chainId } = useChainId();
  const token = getToken(chainId, tokenAddress);

  const tokenData = getByKey(tokensData, tokenAddress);

  const balanceUsd = convertToUsd(tokenData?.balance, token.decimals, tokenData?.prices?.minPrice);

  return (
    <button
      className={cx(
        "border-na flex flex-1 items-center rounded-4 border p-8 transition-colors hover:border-gray-400",
        isSelected ? "border-gray-400" : "border-stroke-primary"
      )}
      onClick={onSelect}
    >
      <TokenIcon symbol={token.symbol} className="mr-8" displaySize={32} />
      <div className="flex flex-col items-start">
        <div className="flex items-center">
          <span className="flex items-center text-12 font-medium">
            <span className="mr-4 inline-block max-w-60 truncate align-baseline">
              {formatTokenAmount(tokenData?.balance, token.decimals)}
            </span>
            {token.symbol}
          </span>
        </div>
        <div className="muted max-w-80 truncate text-12">{formatUsd(balanceUsd, { fallbackToZero: true })}</div>
      </div>
    </button>
  );
}

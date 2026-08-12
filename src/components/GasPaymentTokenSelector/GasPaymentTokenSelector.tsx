import { t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useCallback } from "react";

import { getBalanceByBalanceType } from "domain/synthetics/tokens";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { convertToUsd, TokenBalanceType, TokenData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";

import { SelectorBase, useSelectorClose } from "components/SelectorBase/SelectorBase";
import TokenIcon from "components/TokenIcon/TokenIcon";

type Props = {
  balanceType: TokenBalanceType;
  currentTokenAddress: string | undefined;
  label: ReactNode;
  onSelectToken: (address: string) => void;
};

export function GasPaymentTokenSelector({ balanceType, currentTokenAddress, label, onSelectToken }: Props) {
  const { chainId, srcChainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId, srcChainId);

  const gasPaymentTokens = getGasPaymentTokens(chainId);

  const currentToken = getByKey(tokensData, currentTokenAddress);
  const currentBalance = getBalanceByBalanceType(currentToken, balanceType);

  const onSelectFactory = useCallback(
    (tokenAddress: string) => () => {
      onSelectToken(tokenAddress);
    },
    [onSelectToken]
  );

  return (
    <SelectorBase
      modalLabel={t`Gas payment token`}
      desktopPanelClassName="!z-[10000] w-[360px]"
      label={
        <div className="flex w-full justify-between">
          <div className="font-medium text-typography-primary group-hover:text-blue-300">{label}</div>
          {currentToken && (
            <div
              className={cx(
                "flex items-center",
                currentBalance !== undefined && currentBalance > 0n
                  ? "text-typography-primary group-hover:text-blue-300"
                  : null
              )}
            >
              <TokenIcon symbol={currentToken.symbol} className="mr-8" displaySize={16} />
              <span className="mr-4 inline-block align-baseline">
                {formatTokenAmount(currentBalance, currentToken.decimals, undefined, {
                  isStable: currentToken.isStable,
                })}
              </span>
              {currentToken.symbol}
            </div>
          )}
        </div>
      }
    >
      <div className="tokens-list flex flex-col">
        {gasPaymentTokens.map((tokenAddress) => (
          <GasTokenOption
            key={tokenAddress}
            balanceType={balanceType}
            token={getByKey(tokensData, tokenAddress)}
            onClick={onSelectFactory(tokenAddress)}
          />
        ))}
      </div>
    </SelectorBase>
  );
}

function GasTokenOption({
  balanceType,
  token,
  onClick,
}: {
  balanceType: TokenBalanceType;
  token?: TokenData;
  onClick: () => void;
}) {
  const close = useSelectorClose();

  if (!token) {
    return null;
  }

  const balance = getBalanceByBalanceType(token, balanceType);
  const balanceUsd = convertToUsd(balance, token.decimals, token.prices?.minPrice);

  return (
    <div
      className="flex cursor-pointer items-center justify-between px-14 py-8 hover:bg-slate-600"
      onClick={() => {
        onClick();
        close();
      }}
    >
      <div className="flex items-center">
        <TokenIcon symbol={token.symbol} className="mr-8" displaySize={20} />
        <span className="mr-4 inline-block align-baseline">{formatTokenAmount(balance, token.decimals)}</span>
        {token.symbol}
      </div>
      <div className="text-right">{formatUsd(balanceUsd)}</div>
    </div>
  );
}

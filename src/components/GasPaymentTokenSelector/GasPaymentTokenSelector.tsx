import { t, Trans } from "@lingui/macro";
import { useCallback } from "react";

import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { convertToUsd, TokenData } from "domain/tokens";
import { useChainId } from "lib/chains";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getGasPaymentTokens } from "sdk/configs/express";

import { SelectorBase, useSelectorClose } from "components/Synthetics/SelectorBase/SelectorBase";
import TokenIcon from "components/TokenIcon/TokenIcon";

type Props = {
  curentTokenAddress: string;
  onSelectToken: (address: string) => void;
};

export function GasPaymentTokenSelector({ curentTokenAddress, onSelectToken }: Props) {
  const { chainId } = useChainId();
  const { tokensData } = useTokensDataRequest(chainId);
  const gasPaymentTokens = getGasPaymentTokens(chainId);

  const currentToken = getByKey(tokensData, curentTokenAddress);

  const onSelectFactory = useCallback(
    (tokenAddress: string) => () => {
      onSelectToken(tokenAddress);
    },
    [onSelectToken]
  );

  return (
    <SelectorBase
      modalLabel={t`Gas Payment Token`}
      desktopPanelClassName="!z-[10000] w-[360px] !top-[10px]"
      label={
        <div className="flex w-full justify-between">
          <div>
            <Trans>Gas Payment Token</Trans>
          </div>
          {currentToken && (
            <div className="flex items-center">
              <TokenIcon symbol={currentToken.symbol} className="mr-8" displaySize={16} />
              <span className="mr-4 inline-block max-w-60 truncate align-baseline">
                {formatTokenAmount(currentToken.balance, currentToken.decimals)}
              </span>
              {currentToken.symbol}
            </div>
          )}
        </div>
      }
    >
      <div className="tokens-list flex flex-col gap-8">
        {gasPaymentTokens.map((tokenAddress) => (
          <GasTokenOption
            key={tokenAddress}
            token={getByKey(tokensData, tokenAddress)}
            onClick={onSelectFactory(tokenAddress)}
          />
        ))}
      </div>
    </SelectorBase>
  );
}

function GasTokenOption({ token, onClick }: { token?: TokenData; onClick: () => void }) {
  const close = useSelectorClose();

  if (!token) {
    return null;
  }

  const balanceUsd = convertToUsd(token.balance, token.decimals, token.prices?.minPrice);

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
        <span className="mr-4 inline-block max-w-60 truncate align-baseline">
          {formatTokenAmount(token.balance, token.decimals)}
        </span>
        {token.symbol}
      </div>
      <div className="text-right">{formatUsd(balanceUsd)}</div>
    </div>
  );
}

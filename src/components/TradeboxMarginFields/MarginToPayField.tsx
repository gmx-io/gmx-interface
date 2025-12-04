import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { ChangeEvent, useCallback, useRef } from "react";

import { SourceChainId } from "config/chains";
import { isSettlementChain } from "config/multichain";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxFromToken,
  selectTradeboxState,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { convertToUsd } from "domain/synthetics/tokens";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { formatUsd, parseValue } from "lib/numbers";
import { useWalletIconUrls } from "lib/wallets/getWalletIconUrls";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";

import { useMultichainTokensRequest } from "components/GmxAccountModal/hooks";
import NumberInput from "components/NumberInput/NumberInput";
import { MultichainTokenSelector } from "components/TokenSelector/MultichainTokenSelector";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

type Props = {
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSelectFromTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
  onFocus?: () => void;
  qa?: string;
};

export function MarginToPayField({
  inputValue,
  onInputValueChange,
  onSelectFromTokenAddress,
  onDepositTokenAddress,
  onFocus,
  qa,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const tokensData = useTokensData();
  const { active } = useWallet();
  const { openConnectModal } = useConnectModal();
  const walletIconUrls = useWalletIconUrls();
  const isNonEoaAccountOnAnyChain = useIsNonEoaAccountOnAnyChain();

  const { tokenChainDataArray: multichainTokens } = useMultichainTokensRequest();

  const availableTokenOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const { swapTokens, infoTokens, sortedLongAndShortTokens } = availableTokenOptions;

  const { fromTokenAddress, isFromTokenGmxAccount } = useSelector(selectTradeboxState);

  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = fromToken ? parseValue(inputValue || "0", fromToken.decimals)! : 0n;
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);

  const handleBoxClick = useCallback((e: React.MouseEvent) => {
    // Don't focus input if clicking on the token selector area
    if ((e.target as HTMLElement).closest("[data-token-selector]")) {
      return;
    }
    inputRef.current?.focus();
  }, []);

  return (
    <div data-qa={qa}>
      <div
        className={cx(
          "flex cursor-text items-center justify-between gap-8 rounded-8 border-1/2 border-slate-600 bg-slate-900 px-8 py-6"
        )}
        onClick={handleBoxClick}
      >
        <div className="shrink-0 pl-4 text-12 font-medium text-typography-secondary">{t`Margin to Pay`}</div>

        <div className="flex min-w-0 items-center justify-end gap-8 rounded-8 border border-slate-800 bg-slate-800 px-8 py-5 focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover active:border-blue-300">
          <TooltipWithPortal
            handle={
              <NumberInput
                value={inputValue}
                className="bg-transparent text-body-large !w-74 p-1 text-13 outline-none"
                inputRef={inputRef}
                onValueChange={onInputValueChange}
                onFocus={onFocus}
                placeholder="0.00"
                qa={qa ? qa + "-input" : undefined}
              />
            }
            content={<span className="text-12">{formatUsd(fromUsd ?? 0n)}</span>}
            variant="none"
            position="top"
            disabled={fromUsd === undefined}
          />

          <div className="shrink-0" data-token-selector>
            {fromTokenAddress &&
              (!isSettlementChain(chainId) || isNonEoaAccountOnAnyChain ? (
                <TokenSelector
                  label={t`Pay`}
                  chainId={chainId}
                  tokenAddress={fromTokenAddress}
                  onSelectToken={(token) => {
                    onSelectFromTokenAddress(token.address, false);
                  }}
                  tokens={swapTokens}
                  infoTokens={infoTokens}
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                  missedCoinsPlace={MissedCoinsPlace.payToken}
                  extendedSortSequence={sortedLongAndShortTokens}
                  qa="margin-collateral-selector"
                />
              ) : (
                <MultichainTokenSelector
                  isConnected={active}
                  openConnectModal={openConnectModal}
                  walletIconUrls={walletIconUrls}
                  chainId={chainId}
                  srcChainId={srcChainId}
                  label={t`Pay`}
                  tokenAddress={fromTokenAddress}
                  isGmxAccount={isFromTokenGmxAccount}
                  onSelectTokenAddress={onSelectFromTokenAddress}
                  extendedSortSequence={sortedLongAndShortTokens}
                  qa="margin-collateral-selector"
                  tokensData={tokensData}
                  multichainTokens={multichainTokens}
                  onDepositTokenAddress={onDepositTokenAddress}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChangeEvent, useCallback, useRef } from "react";

import { GMX_ACCOUNT_PSEUDO_CHAIN_ID, SourceChainId } from "config/chains";
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
import { formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { useWalletIconUrls } from "lib/wallets/getWalletIconUrls";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";

import { useMultichainTradeTokensRequest } from "components/GmxAccountModal/hooks";
import NumberInput from "components/NumberInput/NumberInput";
import { MultichainTokenSelector } from "components/TokenSelector/MultichainTokenSelector";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import WalletIcon from "img/ic_wallet.svg?react";

type Props = {
  inputValue: string;
  onInputValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSelectFromTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
  onMaxClick?: () => void;
  onFocus?: () => void;
  qa?: string;
};

export function MarginField({
  inputValue,
  onInputValueChange,
  onSelectFromTokenAddress,
  onDepositTokenAddress,
  onMaxClick,
  onFocus,
  qa,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const tokensData = useTokensData();
  const { active, account } = useWallet();
  const { openConnectModal } = useConnectModal();
  const walletIconUrls = useWalletIconUrls();
  const { isNonEoaAccountOnAnyChain } = useIsNonEoaAccountOnAnyChain();

  const { tokenChainDataArray: multichainTokens } = useMultichainTradeTokensRequest(chainId, account);

  const availableTokenOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const { swapTokens, infoTokens, sortedLongAndShortTokens } = availableTokenOptions;

  const { fromTokenAddress, isFromTokenGmxAccount } = useSelector(selectTradeboxState);

  const fromToken = useSelector(selectTradeboxFromToken);
  const fromTokenAmount = fromToken ? parseValue(inputValue || "0", fromToken.decimals) ?? 0n : 0n;
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);

  const formattedBalance =
    fromToken?.balance !== undefined
      ? formatBalanceAmount(fromToken.balance, fromToken.decimals, "", { isStable: fromToken.isStable })
      : undefined;

  const handleBalanceClick = useCallback(() => {
    onMaxClick?.();
  }, [onMaxClick]);

  return (
    <div data-qa={qa}>
      <div className="flex cursor-default items-center justify-between gap-8 rounded-8 bg-slate-900">
        <div className="shrink-0 pl-4 text-12 font-medium text-typography-secondary">{t`Margin`}</div>

        <div className="flex min-w-0 items-center rounded-8 border border-slate-800 bg-slate-800">
          <div className="flex items-center gap-8 rounded-8 border border-slate-800 px-8 py-5 focus-within:border-blue-300 hover:bg-fill-surfaceElevatedHover">
            <TooltipWithPortal
              handle={
                <NumberInput
                  value={inputValue}
                  className="bg-transparent text-body-large w-auto min-w-40 max-w-[100px] p-1 text-13 outline-none"
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

            {formattedBalance !== undefined && (
              <button
                type="button"
                onClick={handleBalanceClick}
                className="flex shrink-0 items-center gap-4 text-12 text-typography-secondary hover:text-typography-primary"
              >
                <WalletIcon className="size-14" />
                <span className="numbers">{formattedBalance}</span>
              </button>
            )}
          </div>

          <div className="h-20 w-1 shrink-0 bg-slate-600" />

          <div className="shrink-0 px-8 py-5" data-token-selector>
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
                  onSelectTokenAddress={onSelectFromTokenAddress}
                  extendedSortSequence={sortedLongAndShortTokens}
                  qa="margin-collateral-selector"
                  tokensData={tokensData}
                  multichainTokens={multichainTokens}
                  onDepositTokenAddress={onDepositTokenAddress}
                  payChainId={isFromTokenGmxAccount ? GMX_ACCOUNT_PSEUDO_CHAIN_ID : undefined}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

import { SourceChainId } from "config/chains";
import { isSettlementChain } from "config/multichain";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { selectChainId, selectSrcChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAvailableTokensOptions,
  selectTradeboxFromToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxState,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMinResidualGasPaymentTokenAmount } from "domain/synthetics/express/getMinResidualGasPaymentTokenAmount";
import { convertToUsd } from "domain/synthetics/tokens";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useWalletIconUrls } from "lib/wallets/getWalletIconUrls";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useMultichainTokensRequest } from "components/GmxAccountModal/hooks";
import { MultichainTokenSelector } from "components/TokenSelector/MultichainTokenSelector";
import TokenSelector from "components/TokenSelector/TokenSelector";

import { MarginPercentageSlider } from "./MarginPercentageSlider";
import { SizeField, SizeDisplayMode } from "./SizeField";

type Props = {
  onSelectFromTokenAddress: (tokenAddress: string, isGmxAccount: boolean) => void;
  onDepositTokenAddress: (tokenAddress: string, chainId: SourceChainId) => void;
  fromTokenInputValue: string;
  setFromTokenInputValue: (value: string, resetPriceImpact?: boolean) => void;
  setFocusedInput: (input: "from" | "to") => void;
  toTokenInputValue: string;
  setToTokenInputValue: (value: string, resetPriceImpact: boolean) => void;
  expressOrdersEnabled: boolean;
  gasPaymentTokenAmountForMax?: bigint;
  isGasPaymentTokenAmountForMaxApproximate?: boolean;
  isExpressLoading?: boolean;
};

export function TradeboxMarginFields({
  onSelectFromTokenAddress,
  onDepositTokenAddress,
  fromTokenInputValue,
  setFromTokenInputValue,
  setFocusedInput,
  toTokenInputValue,
  setToTokenInputValue,
  expressOrdersEnabled,
  gasPaymentTokenAmountForMax,
  isGasPaymentTokenAmountForMaxApproximate,
  isExpressLoading,
}: Props) {
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

  const fromToken = useSelector(selectTradeboxFromToken);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const gasPaymentTokenData = useSelector(selectGasPaymentToken);

  const { fromTokenAddress, toTokenAddress, isFromTokenGmxAccount } = useSelector(selectTradeboxState);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const toToken = getByKey(tokensData, toTokenAddress);

  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);

  const [sizeDisplayMode, setSizeDisplayMode] = useState<SizeDisplayMode>("token");
  const [marginPercentage, setMarginPercentage] = useState<number>(0);

  // Calculate margin percentage from input value
  useEffect(() => {
    if (typeof fromToken?.balance === "undefined" || fromToken.balance === 0n) {
      setMarginPercentage(0);
      return;
    }

    const inputAmount = parseValue(fromTokenInputValue || "0", fromToken.decimals) ?? 0n;
    if (inputAmount === 0n) {
      setMarginPercentage(0);
      return;
    }

    const percentage = Number((inputAmount * 100n) / fromToken.balance);
    setMarginPercentage(Math.min(100, Math.max(0, percentage)));
  }, [fromTokenInputValue, fromToken?.balance, fromToken?.decimals]);

  const { formattedMaxAvailableAmount, showClickMax } = useMaxAvailableAmount({
    fromToken,
    nativeToken,
    fromTokenAmount,
    fromTokenInputValue,
    minResidualAmount: getMinResidualGasPaymentTokenAmount({
      gasPaymentToken: gasPaymentTokenData,
      gasPaymentTokenAmount: gasPaymentTokenAmountForMax,
      payTokenAddress: fromTokenAddress,
      applyBuffer: !isGasPaymentTokenAmountForMaxApproximate,
    }),
    isLoading: expressOrdersEnabled && (isExpressLoading || gasPaymentTokenAmountForMax === undefined),
  });

  const handleFromInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("from");
      setFromTokenInputValue(e.target.value, true);
    },
    [setFocusedInput, setFromTokenInputValue]
  );

  const handleMaxClick = useCallback(() => {
    if (formattedMaxAvailableAmount) {
      setFocusedInput("from");
      setFromTokenInputValue(formattedMaxAvailableAmount, true);
    }
  }, [formattedMaxAvailableAmount, setFocusedInput, setFromTokenInputValue]);

  const handlePercentageChange = useCallback(
    (percentage: number) => {
      if (typeof fromToken?.balance === "undefined" || fromToken.balance === 0n) return;

      setMarginPercentage(percentage);

      const amount = (fromToken.balance * BigInt(percentage)) / 100n;
      const formatted = formatAmountFree(amount, fromToken.decimals);
      setFocusedInput("from");
      setFromTokenInputValue(formatted, true);
    },
    [fromToken?.balance, fromToken?.decimals, setFocusedInput, setFromTokenInputValue]
  );

  const handleSizeInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("to");
      setToTokenInputValue(e.target.value, true);
    },
    [setFocusedInput, setToTokenInputValue]
  );

  const payUsd = increaseAmounts?.initialCollateralUsd ?? fromUsd;

  return (
    <div className="flex flex-col gap-4">
      <BuyInputSection
        topLeftLabel={t`Margin to Pay`}
        bottomLeftValue={payUsd !== undefined ? formatUsd(payUsd) : ""}
        bottomRightValue={
          fromToken && fromToken.balance !== undefined && fromToken.balance > 0n ? (
            <>
              {formatBalanceAmount(fromToken.balance, fromToken.decimals, undefined, {
                isStable: fromToken.isStable,
              })}{" "}
              <span className="text-typography-secondary">{fromToken.symbol}</span>
            </>
          ) : undefined
        }
        inputValue={fromTokenInputValue}
        onInputValueChange={handleFromInputChange}
        qa="margin-to-pay"
      >
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
      </BuyInputSection>

      <SizeField
        sizeInTokens={increaseAmounts?.sizeDeltaInTokens}
        sizeInUsd={increaseAmounts?.sizeDeltaUsd}
        indexToken={toToken}
        displayMode={sizeDisplayMode}
        onDisplayModeChange={setSizeDisplayMode}
        inputValue={toTokenInputValue}
        onInputValueChange={handleSizeInputChange}
        onFocus={() => setFocusedInput("to")}
        qa="position-size"
      />

      <MarginPercentageSlider
        value={marginPercentage}
        onChange={handlePercentageChange}
        onMaxClick={showClickMax ? handleMaxClick : undefined}
      />
    </div>
  );
}

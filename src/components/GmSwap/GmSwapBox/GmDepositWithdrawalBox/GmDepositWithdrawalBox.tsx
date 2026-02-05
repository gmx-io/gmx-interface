import { t } from "@lingui/macro";
import cx from "classnames";
import mapValues from "lodash/mapValues";
import { useCallback, useEffect, useMemo } from "react";

import { AVALANCHE } from "config/chains";
import { isSourceChain } from "config/multichain";
import {
  usePoolsDetailsFirstTokenAddress,
  usePoolsDetailsFirstTokenInputValue,
  usePoolsDetailsMarketOrGlvTokenInputValue,
  usePoolsDetailsPaySource,
  usePoolsDetailsSecondTokenAddress,
  usePoolsDetailsSecondTokenInputValue,
} from "context/PoolsDetailsContext/hooks";
import {
  selectPoolsDetailsFirstTokenAmount,
  selectPoolsDetailsFirstTokenData,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsGlvTokenData,
  selectPoolsDetailsIsCrossChainMarket,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsMarketOrGlvTokenData,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsMarketTokensData,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAmount,
  selectPoolsDetailsSecondTokenData,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsSetFocusedInput,
  selectPoolsDetailsSetGlvOrMarketAddress,
  selectPoolsDetailsSetIsMarketForGlvSelectedManually,
  selectPoolsDetailsSetSelectedMarketAddressForGlv,
  selectPoolsDetailsTradeTokensDataWithSourceChainBalances,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectMultichainMarketTokenBalances } from "context/PoolsDetailsContext/selectors/selectMultichainMarketTokenBalances";
import { selectPoolsDetailsTokenOptions } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsTokenOptions";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectAccount,
  selectGlvAndMarketsInfoData,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { paySourceToTokenBalanceType } from "domain/multichain/paySourceToTokenBalanceType";
import { useGasLimits, useGasPrice } from "domain/synthetics/fees";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import {
  getAvailableUsdLiquidityForCollateral,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { convertToTokenAmount, convertToUsd, getBalanceByBalanceType, getMidPrice } from "domain/synthetics/tokens";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { ERC20Address, NativeTokenSupportedAddress } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { switchNetwork } from "lib/wallets";
import { GMX_ACCOUNT_PSEUDO_CHAIN_ID, type AnyChainId, type GmxAccountPseudoChainId } from "sdk/configs/chains";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useBestGmPoolAddressForGlv } from "components/MarketStats/hooks/useBestGmPoolForGlv";
import { SwitchToSettlementChainButtons } from "components/SwitchToSettlementChain/SwitchToSettlementChainButtons";
import { SwitchToSettlementChainWarning } from "components/SwitchToSettlementChain/SwitchToSettlementChainWarning";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { MultichainTokenSelectorForLp } from "components/TokenSelector/MultichainTokenSelectorForLp";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { GmSwapBoxPoolRow } from "../GmSwapBoxPoolRow";
import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { SelectedPoolLabel } from "../SelectedPool";
import { useGmWarningState } from "../useGmWarningState";
import { InfoRows } from "./InfoRows";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useGmSwapSubmitState } from "./useGmSwapSubmitState";
import { useTechnicalFees } from "./useTechnicalFeesAsyncResult";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";

export function GmSwapBoxDepositWithdrawal() {
  const { shouldDisableValidationForTesting } = useSettings();
  const { chainId, srcChainId } = useChainId();

  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);

  const { isDeposit, isWithdrawal, isPair, isSingle } = useSelector(selectPoolsDetailsFlags);

  const selectedGlvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const setGlvOrMarketAddress = useSelector(selectPoolsDetailsSetGlvOrMarketAddress);
  const selectedMarketForGlv = useSelector(selectPoolsDetailsSelectedMarketAddressForGlv);
  const setSelectedMarketAddressForGlv = useSelector(selectPoolsDetailsSetSelectedMarketAddressForGlv);
  const setIsMarketForGlvSelectedManually = useSelector(selectPoolsDetailsSetIsMarketForGlvSelectedManually);

  const [firstTokenAddress, setFirstTokenAddress] = usePoolsDetailsFirstTokenAddress();
  const [secondTokenAddress] = usePoolsDetailsSecondTokenAddress();

  const [paySource, setPaySource] = usePoolsDetailsPaySource();
  const [firstTokenInputValue, setFirstTokenInputValue] = usePoolsDetailsFirstTokenInputValue();
  const [secondTokenInputValue, setSecondTokenInputValue] = usePoolsDetailsSecondTokenInputValue();
  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = usePoolsDetailsMarketOrGlvTokenInputValue();
  const setFocusedInput = useSelector(selectPoolsDetailsSetFocusedInput);

  const account = useSelector(selectAccount);
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const marketTokensData = useSelector(selectPoolsDetailsMarketTokensData);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);

  const tradeTokensData = useSelector(selectPoolsDetailsTradeTokensDataWithSourceChainBalances);
  const isMarketTransferrableToSourceChain = useSelector(selectPoolsDetailsIsCrossChainMarket);
  const firstToken = useSelector(selectPoolsDetailsFirstTokenData);
  const secondToken = useSelector(selectPoolsDetailsSecondTokenData);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const glvToken = useSelector(selectPoolsDetailsGlvTokenData);
  const marketOrGlvTokenData = useSelector(selectPoolsDetailsMarketOrGlvTokenData);
  const nativeToken = getByKey(tradeTokensData, NATIVE_TOKEN_ADDRESS);

  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);

  const multichainMarketTokensBalances = useSelector(selectMultichainMarketTokenBalances);
  const multichainMarketTokenBalances = selectedGlvOrMarketAddress
    ? multichainMarketTokensBalances[selectedGlvOrMarketAddress]
    : undefined;

  const marketTokenBalancesData: Partial<Record<AnyChainId | GmxAccountPseudoChainId, bigint>> = useMemo(
    () =>
      multichainMarketTokenBalances?.balances
        ? mapValues(multichainMarketTokenBalances.balances, (data) => data?.balance)
        : {},
    [multichainMarketTokenBalances?.balances]
  );

  const { marketsInfo: sortedGlvOrMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    glvAndMarketsInfoData,
    marketTokensData
  );

  const indexName = useMemo(() => marketInfo && getMarketIndexName(marketInfo), [marketInfo]);

  const tokenOptions = useSelector(selectPoolsDetailsTokenOptions);

  const firstTokenUsd = convertToUsd(
    firstTokenAmount,
    firstToken?.decimals,
    isDeposit ? firstToken?.prices?.minPrice : firstToken?.prices?.maxPrice
  );

  const secondTokenUsd = convertToUsd(
    secondTokenAmount,
    secondToken?.decimals,
    isDeposit ? secondToken?.prices?.minPrice : secondToken?.prices?.maxPrice
  );

  const { longCollateralLiquidityUsd, shortCollateralLiquidityUsd } = useMemo(() => {
    if (!marketInfo) {
      return {};
    }

    return {
      longCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, true),
      shortCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, false),
    };
  }, [marketInfo]);

  const isMarketTokenDeposit = useSelector(selectPoolsDetailsIsMarketTokenDeposit);

  const amounts = useSelector(selectDepositWithdrawalAmounts);

  const { data: technicalFees, error: technicalFeesError } = useTechnicalFees();

  const logicalFees = useDepositWithdrawalFees({
    amounts,
    chainId,
    gasLimits,
    gasPrice,
    isDeposit,
    tokensData: tradeTokensData,
    glvInfo,
    isMarketTokenDeposit,
    technicalFees,
    srcChainId,
  });

  const { shouldShowWarning, shouldShowWarningForExecutionFee, shouldShowWarningForPosition } = useGmWarningState({
    logicalFees,
  });

  const shouldShowAvalancheGmxAccountWarning = paySource === "gmxAccount" && chainId === AVALANCHE && isDeposit;

  const submitState = useGmSwapSubmitState({
    logicalFees,
    technicalFees,
    technicalFeesError,
    shouldDisableValidation: shouldDisableValidationForTesting,
    longTokenLiquidityUsd: longCollateralLiquidityUsd,
    shortTokenLiquidityUsd: shortCollateralLiquidityUsd,
    marketsInfoData,
    glvAndMarketsInfoData,
  });

  const gasPaymentToken = useSelector(selectGasPaymentToken);
  const gasPaymentTokenForMax = paySource === "gmxAccount" ? gasPaymentToken : nativeToken;
  const gasPaymentTokenAmountForMax = convertToTokenAmount(
    (logicalFees?.logicalNetworkFee?.deltaUsd ?? 0n) * -1n,
    gasPaymentTokenForMax?.decimals,
    gasPaymentTokenForMax?.prices.minPrice
  );

  const balanceType = paySourceToTokenBalanceType(paySource);
  const gasPaymentTokenBalanceForMax = getBalanceByBalanceType(gasPaymentTokenForMax, balanceType);
  const marketOrGlvTokenBalance = getBalanceByBalanceType(marketOrGlvTokenData, balanceType);

  const isLoadingFirstTokenMaxAvailableAmount =
    firstToken?.address === gasPaymentTokenForMax?.address && logicalFees?.logicalNetworkFee?.deltaUsd === undefined;

  const firstTokenMaxDetails = useMaxAvailableAmount({
    fromToken: firstToken,
    fromTokenBalance: getBalanceByBalanceType(firstToken, balanceType),
    fromTokenAmount: firstTokenAmount,
    fromTokenInputValue: firstTokenInputValue,
    isLoading: isLoadingFirstTokenMaxAvailableAmount,
    srcChainId: paySource === "sourceChain" ? srcChainId : undefined,
    gasPaymentToken: isDeposit ? gasPaymentTokenForMax : undefined,
    gasPaymentTokenBalance: isDeposit ? gasPaymentTokenBalanceForMax : undefined,
    gasPaymentTokenAmount: isDeposit ? gasPaymentTokenAmountForMax : undefined,
  });

  const firstTokenShowMaxButton = isDeposit && firstTokenMaxDetails.showClickMax;

  const isLoadingSecondTokenMaxAvailableAmount =
    secondToken?.address === gasPaymentTokenForMax?.address && logicalFees?.logicalNetworkFee?.deltaUsd === undefined;

  const secondTokenMaxDetails = useMaxAvailableAmount({
    fromToken: secondToken,
    fromTokenBalance: getBalanceByBalanceType(secondToken, balanceType),
    fromTokenAmount: secondTokenAmount,
    fromTokenInputValue: secondTokenInputValue,
    isLoading: isLoadingSecondTokenMaxAvailableAmount,
    srcChainId: paySource === "sourceChain" ? srcChainId : undefined,
    gasPaymentToken: isDeposit ? gasPaymentTokenForMax : undefined,
    gasPaymentTokenBalance: isDeposit ? gasPaymentTokenBalanceForMax : undefined,
    gasPaymentTokenAmount: isDeposit ? gasPaymentTokenAmountForMax : undefined,
  });

  const secondTokenShowMaxButton = isDeposit && secondTokenMaxDetails.showClickMax;

  const marketTokenMaxDetails = useMaxAvailableAmount({
    fromToken: marketOrGlvTokenData,
    fromTokenBalance: marketOrGlvTokenBalance,
    fromTokenAmount: marketOrGlvTokenAmount,
    fromTokenInputValue: marketOrGlvTokenInputValue,
    srcChainId: paySource === "sourceChain" ? srcChainId : undefined,
    ignoreGasPaymentToken: true,
  });

  const marketTokenInputShowMaxButton = isWithdrawal && marketTokenMaxDetails.showClickMax;

  const receiveTokenUsd = glvInfo
    ? amounts?.glvTokenUsd ?? 0n
    : convertToUsd(
        marketOrGlvTokenAmount,
        marketToken?.decimals,
        isDeposit ? marketToken?.prices?.maxPrice : marketToken?.prices?.minPrice
      )!;

  // #region Callbacks
  const onFocusedCollateralInputChange = useCallback(
    (tokenAddress: string) => {
      if (!marketInfo) {
        return;
      }

      if (marketInfo.isSameCollaterals) {
        setFocusedInput("first");
        return;
      }

      if (getTokenPoolType(marketInfo, tokenAddress) === "long") {
        setFocusedInput("first");
      } else {
        setFocusedInput("second");
      }
    },
    [marketInfo, setFocusedInput]
  );

  const resetInputs = useCallback(() => {
    setFirstTokenInputValue("");
    setSecondTokenInputValue("");
    setMarketOrGlvTokenInputValue("");
  }, [setFirstTokenInputValue, setMarketOrGlvTokenInputValue, setSecondTokenInputValue]);

  const onGlvOrMarketChange = useCallback(
    (glvOrMarketAddress: string) => {
      resetInputs();
      setGlvOrMarketAddress(glvOrMarketAddress);
      setIsMarketForGlvSelectedManually(false);
    },
    [setGlvOrMarketAddress, resetInputs, setIsMarketForGlvSelectedManually]
  );

  const onMarketChange = useCallback(
    (marketAddress: string) => {
      setIsMarketForGlvSelectedManually(true);
      setSelectedMarketAddressForGlv(marketAddress);
    },
    [setSelectedMarketAddressForGlv, setIsMarketForGlvSelectedManually]
  );

  const onMaxClickFirstToken = useCallback(() => {
    if (firstTokenMaxDetails.formattedMaxAvailableAmount && firstToken?.address) {
      setFirstTokenInputValue(firstTokenMaxDetails.formattedMaxAvailableAmount);
      onFocusedCollateralInputChange(firstToken.address);
    }
  }, [
    firstToken?.address,
    firstTokenMaxDetails.formattedMaxAvailableAmount,
    onFocusedCollateralInputChange,
    setFirstTokenInputValue,
  ]);

  const onMaxClickSecondToken = useCallback(() => {
    if (!isDeposit || !secondTokenMaxDetails.formattedMaxAvailableAmount || !secondToken?.address) {
      return;
    }

    setSecondTokenInputValue(secondTokenMaxDetails.formattedMaxAvailableAmount);
    onFocusedCollateralInputChange(secondToken.address);
  }, [
    isDeposit,
    onFocusedCollateralInputChange,
    secondToken?.address,
    secondTokenMaxDetails.formattedMaxAvailableAmount,
    setSecondTokenInputValue,
  ]);

  const handleFirstTokenInputValueChange = useCallback(
    (e) => {
      if (firstTokenAddress) {
        setFirstTokenInputValue(e.target.value);
        onFocusedCollateralInputChange(firstTokenAddress);
      }
    },
    [firstTokenAddress, onFocusedCollateralInputChange, setFirstTokenInputValue]
  );

  const marketTokenInputClickMax = useCallback(() => {
    if (!marketTokenMaxDetails.formattedMaxAvailableAmount) {
      return;
    }

    setMarketOrGlvTokenInputValue(marketTokenMaxDetails.formattedMaxAvailableAmount);
    setFocusedInput("market");
  }, [setMarketOrGlvTokenInputValue, marketTokenMaxDetails.formattedMaxAvailableAmount, setFocusedInput]);

  const marketTokenInputClickTopRightLabel = useCallback(() => {
    if (!isWithdrawal) {
      return;
    }

    if (marketToken?.balance) {
      setMarketOrGlvTokenInputValue(formatAmountFree(marketToken.balance, marketToken.decimals));
      setFocusedInput("market");
    }
  }, [isWithdrawal, marketToken?.balance, marketToken?.decimals, setFocusedInput, setMarketOrGlvTokenInputValue]);

  const marketOrGlvTokenInputValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMarketOrGlvTokenInputValue(e.target.value);
      setFocusedInput("market");
    },
    [setFocusedInput, setMarketOrGlvTokenInputValue]
  );

  const secondTokenInputValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (secondToken) {
        setSecondTokenInputValue(e.target.value);
        onFocusedCollateralInputChange(secondToken.address);
      }
    },
    [onFocusedCollateralInputChange, secondToken, setSecondTokenInputValue]
  );

  const handleFirstTokenSelect = useCallback(
    (tokenAddress: ERC20Address | NativeTokenSupportedAddress): void => {
      setFirstTokenAddress(tokenAddress);

      const isGmMarketSelected = glvInfo && glvInfo.markets.find((m) => m.address === tokenAddress);

      if (isGmMarketSelected) {
        setSelectedMarketAddressForGlv(tokenAddress);
      }
    },
    [setFirstTokenAddress, glvInfo, setSelectedMarketAddressForGlv]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      submitState.onSubmit?.();
    },
    [submitState]
  );
  // #endregion

  // #region Effects
  useUpdateInputAmounts();

  useEffect(
    function updateMarket() {
      if (!selectedGlvOrMarketAddress && sortedGlvOrMarketsInfoByIndexToken.length) {
        onGlvOrMarketChange(getGlvOrMarketAddress(sortedGlvOrMarketsInfoByIndexToken[0]));
      }
    },
    [selectedGlvOrMarketAddress, onGlvOrMarketChange, sortedGlvOrMarketsInfoByIndexToken]
  );

  useUpdateTokens({
    tokenOptions,
    marketInfo,
  });

  useBestGmPoolAddressForGlv({
    fees: logicalFees,
    uiFeeFactor,
    marketTokenAmount: marketOrGlvTokenAmount,
    marketTokensData,
  });

  useUpdatePaySourceForMultichain();

  // #endregion

  // #region Render
  const submitButton = useMemo(() => {
    const btn = (
      <Button className="w-full" variant="primary-action" type="submit" disabled={submitState.disabled}>
        {submitState.text}
      </Button>
    );

    if (submitState.errorDescription) {
      return (
        <TooltipWithPortal content={submitState.errorDescription} variant="none">
          {btn}
        </TooltipWithPortal>
      );
    }

    return btn;
  }, [submitState]);

  const gmOrGlvSymbol = glvInfo ? "GLV" : "GM";

  return (
    <>
      <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
        <div className="flex flex-col rounded-b-8 bg-slate-900">
          <div className="flex flex-col gap-12 p-12">
            <div className={cx("flex gap-4", isWithdrawal ? "flex-col-reverse" : "flex-col")}>
              <div>
                <BuyInputSection
                  topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
                  bottomLeftValue={formatUsd(firstTokenUsd ?? 0n)}
                  bottomRightLabel={t`Balance`}
                  bottomRightValue={firstTokenMaxDetails.formattedBalance}
                  onClickTopRightLabel={isDeposit ? onMaxClickFirstToken : undefined}
                  inputValue={firstTokenInputValue}
                  onInputValueChange={handleFirstTokenInputValueChange}
                  onClickMax={firstTokenShowMaxButton ? onMaxClickFirstToken : undefined}
                  className={isPair ? "rounded-b-0" : undefined}
                >
                  {firstTokenAddress && isSingle && isDeposit ? (
                    <MultichainTokenSelectorForLp
                      chainId={chainId}
                      tokenAddress={firstTokenAddress}
                      payChainId={
                        paySource === "gmxAccount"
                          ? GMX_ACCOUNT_PSEUDO_CHAIN_ID
                          : paySource === "sourceChain"
                            ? srcChainId
                            : undefined
                      }
                      tokens={tokenOptions}
                      onSelectTokenAddress={async (tokenAddress, isGmxAccount, newSrcChainId) => {
                        if (account) {
                          if (newSrcChainId === undefined) {
                            await switchNetwork(chainId, true);
                          } else if (newSrcChainId !== srcChainId && newSrcChainId !== undefined) {
                            await switchNetwork(newSrcChainId, true);
                          }
                        }

                        setPaySource(
                          isSourceChain(newSrcChainId, chainId)
                            ? "sourceChain"
                            : isGmxAccount
                              ? "gmxAccount"
                              : "settlementChain"
                        );
                        handleFirstTokenSelect(tokenAddress as ERC20Address | NativeTokenSupportedAddress);
                      }}
                    />
                  ) : isWithdrawal && firstTokenAddress && isSingle && tokenOptions.length > 1 ? (
                    <TokenSelector
                      chainId={chainId}
                      tokenAddress={firstTokenAddress}
                      onSelectToken={(token) => {
                        handleFirstTokenSelect(token.address as ERC20Address | NativeTokenSupportedAddress);
                      }}
                      showSymbolImage
                      showTokenImgInDropdown
                      tokens={tokenOptions}
                      chainIdBadge={
                        paySource === "gmxAccount"
                          ? GMX_ACCOUNT_PSEUDO_CHAIN_ID
                          : paySource === "sourceChain"
                            ? srcChainId
                            : undefined
                      }
                    />
                  ) : (
                    <FirstTokenPlaceholder />
                  )}
                </BuyInputSection>

                {isPair && secondTokenAddress && (
                  <div className="border-t-1/2 border-slate-600">
                    <BuyInputSection
                      topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
                      bottomLeftValue={formatUsd(secondTokenUsd ?? 0n)}
                      bottomRightLabel={t`Balance`}
                      bottomRightValue={secondTokenMaxDetails.formattedBalance}
                      inputValue={secondTokenInputValue}
                      onInputValueChange={secondTokenInputValueChange}
                      onClickTopRightLabel={onMaxClickSecondToken}
                      onClickMax={secondTokenShowMaxButton ? onMaxClickSecondToken : undefined}
                      className={isPair ? "rounded-t-0" : undefined}
                    >
                      <div className="selected-token">
                        <TokenWithIcon
                          symbol={secondToken?.symbol}
                          displaySize={20}
                          chainIdBadge={
                            paySource === "gmxAccount"
                              ? GMX_ACCOUNT_PSEUDO_CHAIN_ID
                              : paySource === "sourceChain"
                                ? srcChainId
                                : undefined
                          }
                        />
                      </div>
                    </BuyInputSection>
                  </div>
                )}
              </div>

              <div className={cx("flex", isWithdrawal ? "flex-col-reverse" : "flex-col")}>
                <BuyInputSection
                  topLeftLabel={isWithdrawal ? t`Pay` : t`Receive`}
                  bottomLeftValue={formatUsd(receiveTokenUsd ?? 0n)}
                  bottomRightLabel={t`Balance`}
                  bottomRightValue={marketTokenMaxDetails.formattedBalance}
                  inputValue={marketOrGlvTokenInputValue}
                  onInputValueChange={marketOrGlvTokenInputValueChange}
                  onClickTopRightLabel={marketTokenInputClickTopRightLabel}
                  onClickMax={marketTokenInputShowMaxButton ? marketTokenInputClickMax : undefined}
                >
                  {selectedGlvOrMarketAddress && isWithdrawal ? (
                    <MultichainMarketTokenSelector
                      chainId={chainId}
                      label={isWithdrawal ? t`Sell ${gmOrGlvSymbol}` : ""}
                      srcChainId={srcChainId}
                      paySource={paySource}
                      onSelectTokenAddress={async (newChainId) => {
                        if (newChainId === GMX_ACCOUNT_PSEUDO_CHAIN_ID) {
                          setPaySource("gmxAccount");
                        } else if (newChainId === chainId) {
                          if (srcChainId !== undefined && account) {
                            await switchNetwork(chainId, true);
                          }
                          setPaySource("settlementChain");
                        } else {
                          if (account) {
                            await switchNetwork(newChainId, true);
                          }
                          setPaySource("sourceChain");
                        }
                      }}
                      marketInfo={glvInfo ?? marketInfo}
                      tokenBalancesData={marketTokenBalancesData}
                      marketTokenPrice={
                        glvToken
                          ? getMidPrice(glvToken.prices)
                          : marketToken
                            ? getMidPrice(marketToken.prices)
                            : undefined
                      }
                    />
                  ) : (
                    (glvInfo || marketInfo) && (
                      <span className="inline-flex items-center">
                        <TokenIcon
                          className="mr-5"
                          symbol={glvInfo?.glvToken.symbol ?? marketInfo?.indexToken.symbol ?? ""}
                          displaySize={20}
                          chainIdBadge={
                            paySource === "sourceChain"
                              ? srcChainId
                              : paySource === "gmxAccount"
                                ? GMX_ACCOUNT_PSEUDO_CHAIN_ID
                                : undefined
                          }
                        />
                        <SelectedPoolLabel glvOrMarketInfo={glvInfo ?? marketInfo} />
                      </span>
                    )
                  )}
                </BuyInputSection>
              </div>
            </div>

            <div className="flex flex-col gap-14">
              <GmSwapBoxPoolRow
                indexName={indexName}
                marketAddress={selectedGlvOrMarketAddress}
                marketTokensData={marketTokensData}
                isDeposit={isDeposit}
                glvInfo={glvInfo}
                selectedMarketForGlv={isMarketTokenDeposit ? firstTokenAddress : selectedMarketForGlv}
                disablePoolSelector={isMarketTokenDeposit}
                onMarketChange={glvInfo ? onMarketChange : onGlvOrMarketChange}
              />

              <GmSwapWarningsRow
                shouldShowWarning={shouldShowWarning}
                shouldShowWarningForPosition={shouldShowWarningForPosition}
                shouldShowWarningForExecutionFee={shouldShowWarningForExecutionFee}
                bannerErrorContent={submitState.bannerErrorContent}
                shouldShowAvalancheGmxAccountWarning={shouldShowAvalancheGmxAccountWarning}
                isSubmitDisabled={submitState.disabled}
                gasPaymentTokenWarningContent={
                  firstTokenMaxDetails.gasPaymentTokenWarningContent ??
                  secondTokenMaxDetails.gasPaymentTokenWarningContent
                }
              />
            </div>
          </div>
          <div className="border-t border-slate-600 p-12">
            {srcChainId === undefined || isMarketTransferrableToSourceChain ? (
              submitButton
            ) : (
              <>
                <SwitchToSettlementChainWarning topic="liquidity" />
                <SwitchToSettlementChainButtons>{submitButton}</SwitchToSettlementChainButtons>
              </>
            )}
          </div>
        </div>

        <InfoRows
          fees={logicalFees}
          isLoading={(firstTokenAmount ?? 0n) === 0n || technicalFeesError ? false : !technicalFees}
          isDeposit={isDeposit}
        />
      </form>
    </>
  );
}

/**
 * Placeholder eligible for the first token in the pair,
 * additional check added to prevent try render GM token placeholder
 * until useUpdateTokens switch GM to long token
 */
function FirstTokenPlaceholder() {
  const { chainId, srcChainId } = useChainId();
  const paySource = useSelector(selectPoolsDetailsPaySource);
  const firstToken = useSelector(selectPoolsDetailsFirstTokenData);

  if (firstToken?.symbol === "GM") {
    return (
      <div className="selected-token">
        <TokenIcon
          symbol={
            getToken(
              chainId,
              convertTokenAddress(chainId, MARKETS[chainId]?.[firstToken.address]?.indexTokenAddress, "native")
            ).symbol
          }
          displaySize={20}
          chainIdBadge={
            paySource === "sourceChain"
              ? srcChainId
              : paySource === "gmxAccount"
                ? GMX_ACCOUNT_PSEUDO_CHAIN_ID
                : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="selected-token">
      <TokenWithIcon
        symbol={firstToken?.symbol}
        displaySize={20}
        chainIdBadge={
          paySource === "sourceChain"
            ? srcChainId
            : paySource === "gmxAccount"
              ? GMX_ACCOUNT_PSEUDO_CHAIN_ID
              : undefined
        }
      />
    </div>
  );
}

function useUpdatePaySourceForMultichain() {
  const [paySource, setPaySource] = usePoolsDetailsPaySource();
  const isCrossChainMarket = useSelector(selectPoolsDetailsIsCrossChainMarket);

  useEffect(
    function updatePaySource() {
      if (paySource === "sourceChain") {
        if (!isCrossChainMarket) {
          setPaySource("gmxAccount");
        }
      }
    },
    [isCrossChainMarket, paySource, setPaySource]
  );
}

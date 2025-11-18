import { t } from "@lingui/macro";
import cx from "classnames";
import noop from "lodash/noop";
import pickBy from "lodash/pickBy";
import { useCallback, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";

import { getContract } from "config/contracts";
import { isSettlementChain, isSourceChain, MULTI_CHAIN_PLATFORM_TOKENS_MAP } from "config/multichain";
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
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsMarketAndTradeTokensData,
  selectPoolsDetailsMarketInfo,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsMarketOrGlvTokenData,
  selectPoolsDetailsMarketTokenData,
  selectPoolsDetailsMarketTokensData,
  selectPoolsDetailsMultichainTokensArray,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAmount,
  selectPoolsDetailsSecondTokenData,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsSetFocusedInput,
  selectPoolsDetailsSetGlvOrMarketAddress,
  selectPoolsDetailsSetIsMarketForGlvSelectedManually,
  selectPoolsDetailsSetSelectedMarketAddressForGlv,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsTradeTokensDataWithSourceChainBalances,
} from "context/PoolsDetailsContext/selectors";
import { selectDepositWithdrawalAmounts } from "context/PoolsDetailsContext/selectors/selectDepositWithdrawalAmounts";
import { selectPoolsDetailsTokenOptions } from "context/PoolsDetailsContext/selectors/selectPoolsDetailsTokenOptions";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
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
  isMarketTokenAddress,
} from "domain/synthetics/markets/utils";
import { convertToUsd, getMidPrice } from "domain/synthetics/tokens";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { ERC20Address, NativeTokenSupportedAddress } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatBalanceAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { switchNetwork } from "lib/wallets";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { useMultichainMarketTokenBalancesRequest } from "components/GmxAccountModal/hooks";
import { useBestGmPoolAddressForGlv } from "components/MarketStats/hooks/useBestGmPoolForGlv";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import { MultichainMarketTokenSelector } from "components/TokenSelector/MultichainMarketTokenSelector";
import { MultichainTokenSelector } from "components/TokenSelector/MultichainTokenSelector";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { GmSwapBoxPoolRow } from "../GmSwapBoxPoolRow";
import { GmSwapWarningsRow } from "../GmSwapWarningsRow";
import { useGmWarningState } from "../useGmWarningState";
import { InfoRows } from "./InfoRows";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useGmSwapSubmitState } from "./useGmSwapSubmitState";
import { useTechnicalFeesAsyncResult } from "./useTechnicalFeesAsyncResult";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";

export function GmSwapBoxDepositWithdrawal() {
  const { shouldDisableValidationForTesting } = useSettings();
  const { chainId, srcChainId } = useChainId();
  const { address: account } = useAccount();

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
  const longTokenAddress = useSelector(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = useSelector(selectPoolsDetailsShortTokenAddress);

  const [paySource, setPaySource] = usePoolsDetailsPaySource();
  const [firstTokenInputValue, setFirstTokenInputValue] = usePoolsDetailsFirstTokenInputValue();
  const [secondTokenInputValue, setSecondTokenInputValue] = usePoolsDetailsSecondTokenInputValue();
  const [marketOrGlvTokenInputValue, setMarketOrGlvTokenInputValue] = usePoolsDetailsMarketOrGlvTokenInputValue();
  const setFocusedInput = useSelector(selectPoolsDetailsSetFocusedInput);

  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const marketTokensData = useSelector(selectPoolsDetailsMarketTokensData);
  const marketInfo = useSelector(selectPoolsDetailsMarketInfo);
  const glvInfo = useSelector(selectPoolsDetailsGlvInfo);

  const tradeTokensData = useSelector(selectPoolsDetailsTradeTokensDataWithSourceChainBalances);
  const marketAndTradeTokensData = useSelector(selectPoolsDetailsMarketAndTradeTokensData);
  const firstToken = useSelector(selectPoolsDetailsFirstTokenData);
  const secondToken = useSelector(selectPoolsDetailsSecondTokenData);
  const marketToken = useSelector(selectPoolsDetailsMarketTokenData);
  const glvToken = useSelector(selectPoolsDetailsGlvTokenData);
  const marketOrGlvTokenData = useSelector(selectPoolsDetailsMarketOrGlvTokenData);
  const nativeToken = getByKey(tradeTokensData, NATIVE_TOKEN_ADDRESS);

  const firstTokenAmount = useSelector(selectPoolsDetailsFirstTokenAmount);
  const secondTokenAmount = useSelector(selectPoolsDetailsSecondTokenAmount);
  const marketOrGlvTokenAmount = useSelector(selectPoolsDetailsMarketOrGlvTokenAmount);

  const { tokenBalancesData: marketTokenBalancesData } = useMultichainMarketTokenBalancesRequest(
    chainId,
    srcChainId,
    account,
    selectedGlvOrMarketAddress
  );

  const { marketsInfo: sortedGlvOrMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    glvAndMarketsInfoData,
    marketTokensData
  );

  const indexName = useMemo(() => marketInfo && getMarketIndexName(marketInfo), [marketInfo]);
  const routerAddress = useMemo(() => getContract(chainId, "SyntheticsRouter"), [chainId]);

  const sourceChainTokenOptions = useSelector(selectPoolsDetailsMultichainTokensArray).filter(
    (t) =>
      longTokenAddress &&
      shortTokenAddress &&
      (t.address === longTokenAddress ||
        t.address === shortTokenAddress ||
        t.wrappedAddress === longTokenAddress ||
        t.wrappedAddress === shortTokenAddress)
  );

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

  const tokenOptions = useSelector(selectPoolsDetailsTokenOptions);

  const availableTokensData = useMemo(() => {
    return pickBy(marketAndTradeTokensData, (token) => {
      return tokenOptions.find((t) => t.address === token.address);
    });
  }, [marketAndTradeTokensData, tokenOptions]);

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

  const technicalFeesAsyncResult = useTechnicalFeesAsyncResult();

  const { logicalFees } = useDepositWithdrawalFees({
    amounts,
    chainId,
    gasLimits,
    gasPrice,
    isDeposit,
    tokensData: tradeTokensData,
    glvInfo,
    isMarketTokenDeposit,
    technicalFees: technicalFeesAsyncResult.data,
    srcChainId,
  });

  const { shouldShowWarning, shouldShowWarningForExecutionFee, shouldShowWarningForPosition } = useGmWarningState({
    logicalFees,
  });

  const submitState = useGmSwapSubmitState({
    routerAddress,
    logicalFees,
    technicalFees: technicalFeesAsyncResult.data,
    shouldDisableValidation: shouldDisableValidationForTesting,
    tokensData: tradeTokensData,
    longTokenLiquidityUsd: longCollateralLiquidityUsd,
    shortTokenLiquidityUsd: shortCollateralLiquidityUsd,
    marketsInfoData,
    glvAndMarketsInfoData,
  });

  const firstTokenMaxDetails = useMaxAvailableAmount({
    fromToken: firstToken,
    fromTokenAmount: firstTokenAmount ?? 0n,
    fromTokenInputValue: firstTokenInputValue || "",
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
    srcChainId,
    tokenBalanceType: paySourceToTokenBalanceType(paySource),
  });

  const firstTokenShowMaxButton = isDeposit && firstTokenMaxDetails.showClickMax;

  const secondTokenMaxDetails = useMaxAvailableAmount({
    fromToken: secondToken,
    fromTokenAmount: secondTokenAmount ?? 0n,
    fromTokenInputValue: secondTokenInputValue,
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
  });

  const secondTokenShowMaxButton = isDeposit && secondTokenMaxDetails.showClickMax;

  const marketTokenMaxDetails = useMaxAvailableAmount({
    // TODO make glv balances work on source chain
    fromToken: marketOrGlvTokenData,
    fromTokenAmount: marketOrGlvTokenAmount,
    fromTokenInputValue: marketOrGlvTokenInputValue,
    nativeToken: nativeToken,
    minResidualAmount: undefined,
    isLoading: false,
    tokenBalanceType: paySourceToTokenBalanceType(paySource),
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

  const isMarketTransferrableToSourceChain = useUpdatePaySourceForMultichain();

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
                  {firstTokenAddress && isSingle && isDeposit && tokenOptions.length > 1 ? (
                    <MultichainTokenSelector
                      chainId={chainId}
                      srcChainId={srcChainId}
                      tokenAddress={firstTokenAddress}
                      payChainId={paySource === "gmxAccount" ? 0 : paySource === "sourceChain" ? srcChainId : undefined}
                      tokensData={availableTokensData}
                      onSelectTokenAddress={async (tokenAddress, isGmxAccount, newSrcChainId) => {
                        if (isMarketTokenAddress(chainId, firstTokenAddress)) {
                          await switchNetwork(chainId, true);
                        } else if (newSrcChainId !== srcChainId && newSrcChainId !== undefined) {
                          await switchNetwork(newSrcChainId, true);
                        }

                        setPaySource(
                          isSourceChain(newSrcChainId) ? "sourceChain" : isGmxAccount ? "gmxAccount" : "settlementChain"
                        );
                        handleFirstTokenSelect(tokenAddress as ERC20Address | NativeTokenSupportedAddress);
                      }}
                      multichainTokens={sourceChainTokenOptions}
                      includeMultichainTokensInPay={isMarketTransferrableToSourceChain}
                      onDepositTokenAddress={noop}
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
                        paySource === "gmxAccount" ? 0 : paySource === "sourceChain" ? srcChainId : undefined
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
                      bottomRightValue={
                        secondToken && secondToken.balance !== undefined
                          ? formatBalanceAmount(secondToken.balance, secondToken.decimals, undefined, {
                              isStable: secondToken.isStable,
                            })
                          : undefined
                      }
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
                            paySource === "gmxAccount" ? 0 : paySource === "sourceChain" ? srcChainId : undefined
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
                  {selectedGlvOrMarketAddress && (
                    <MultichainMarketTokenSelector
                      chainId={chainId}
                      label={isWithdrawal ? t`Pay` : t`Receive`}
                      srcChainId={srcChainId}
                      paySource={paySource || "settlementChain"}
                      onSelectTokenAddress={async (newChainId) => {
                        if (newChainId === 0) {
                          setPaySource("gmxAccount");
                        } else if (newChainId === chainId) {
                          if (srcChainId !== undefined) {
                            await switchNetwork(chainId, true);
                          }
                          setPaySource("settlementChain");
                        } else {
                          await switchNetwork(newChainId, true);
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
              />
            </div>
          </div>
          <div className="border-t border-slate-600 p-12">{submitButton}</div>
        </div>

        <InfoRows
          fees={logicalFees}
          isLoading={firstTokenAmount === undefined ? false : !technicalFeesAsyncResult.data}
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
          chainIdBadge={paySource === "sourceChain" ? srcChainId : paySource === "gmxAccount" ? 0 : undefined}
        />
      </div>
    );
  }

  return (
    <div className="selected-token">
      <TokenWithIcon
        symbol={firstToken?.symbol}
        displaySize={20}
        chainIdBadge={paySource === "sourceChain" ? srcChainId : paySource === "gmxAccount" ? 0 : undefined}
      />
    </div>
  );
}

function useUpdatePaySourceForMultichain() {
  const { chainId } = useChainId();
  const selectedGlvOrMarketAddress = useSelector(selectPoolsDetailsGlvOrMarketAddress);
  const [paySource, setPaySource] = usePoolsDetailsPaySource();

  const isMarketTransferrableToSourceChain = useMemo((): boolean => {
    if (!selectedGlvOrMarketAddress || !isSettlementChain(chainId)) {
      return false;
    }

    return MULTI_CHAIN_PLATFORM_TOKENS_MAP[chainId]?.includes(selectedGlvOrMarketAddress);
  }, [chainId, selectedGlvOrMarketAddress]);

  useEffect(
    function updatePaySource() {
      if (paySource === "sourceChain") {
        if (!isMarketTransferrableToSourceChain) {
          setPaySource("gmxAccount");
        }
      }
    },
    [isMarketTransferrableToSourceChain, paySource, setPaySource]
  );

  return isMarketTransferrableToSourceChain;
}

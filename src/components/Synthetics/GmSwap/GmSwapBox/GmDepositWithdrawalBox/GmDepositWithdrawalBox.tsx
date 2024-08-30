import { t } from "@lingui/macro";
import cx from "classnames";

import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useGasLimits, useGasPrice } from "domain/synthetics/fees";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import { useMarketTokensData } from "domain/synthetics/markets";
import type { MarketInfo } from "domain/synthetics/markets/types";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarketIndexName,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { TokenData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useGmTokensFavorites } from "domain/synthetics/tokens/useGmTokensFavorites";
import { useAvailableTokenOptions } from "domain/synthetics/trade";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { Token, getMinResidualAmount } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatTokenAmount, formatUsd, limitDecimals, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { useCallback, useEffect, useMemo } from "react";
import type { GmSwapBoxProps } from "../GmSwapBox";
import { showMarketToast } from "../showMarketToast";
import { Mode, Operation } from "../types";
import { useUpdateByQueryParams } from "../useUpdateByQueryParams";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useGmDepositWithdrawalBoxState } from "./useGmDepositWithdrawalBoxState";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";

import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import { getContract } from "config/contracts";
import { GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { selectAllMarketsData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { isGlv } from "domain/synthetics/markets/glv";
import { Swap } from "../Swap";
import { InfoRows } from "./InfoRows";
import { useFees } from "./useFees";
import { useSubmitButtonState } from "./useSubmitButtonState";
import { useBestGmPoolAddressForGlv } from "components/Synthetics/MarketStats/hooks/useBestGmPoolForGlv";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

export function GmSwapBoxDepositWithdrawal(p: GmSwapBoxProps & { glvMarket?: GlvMarketInfo }) {
  const {
    selectedMarketAddress: marketAddress,
    operation,
    mode,
    onSetMode,
    onSetOperation,
    onSelectMarket,
    selectedGlvGmMarket,
    onSelectGlvGmMarket,
  } = p;
  const isMetamaskMobile = useIsMetamaskMobile();

  const { shouldDisableValidationForTesting } = useSettings();
  const { chainId } = useChainId();

  // #region Requests
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);
  // #endregion

  // #region Selectors
  const marketsInfoData = useSelector(selectAllMarketsData);
  const { marketsInfo: sortedMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    marketsInfoData,
    depositMarketTokensData
  );
  const isDeposit = operation === Operation.Deposit;
  const tokensData = useTokensData();
  const { infoTokens } = useAvailableTokenOptions(chainId, {
    marketsInfoData,
    tokensData,
    marketTokens: isDeposit ? depositMarketTokensData : withdrawalMarketTokensData,
  });

  const marketInfo = getByKey(marketsInfoData, marketAddress);
  const isGlvMarket = marketInfo && isGlv(marketInfo);

  // #region State
  const gmTokenFavoritesContext = useGmTokensFavorites();
  const {
    focusedInput,
    setFocusedInput,
    isHighPriceImpactAccepted,
    setIsHighPriceImpactAccepted,
    firstTokenAddress,
    setFirstTokenAddress,
    secondTokenAddress,
    setSecondTokenAddress,
    firstTokenInputValue,
    setFirstTokenInputValue,
    secondTokenInputValue,
    setSecondTokenInputValue,
    marketTokenInputValue,
    setMarketTokenInputValue,
  } = useGmDepositWithdrawalBoxState(operation, mode, marketAddress);

  // #endregion
  // #region Derived state
  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices?.maxPrice);

  const isWithdrawal = operation === Operation.Withdrawal;
  const isSingle = mode === Mode.Single;
  const isPair = mode === Mode.Pair;

  const marketTokensData = isDeposit ? depositMarketTokensData : withdrawalMarketTokensData;

  const indexName = marketInfo && getMarketIndexName(marketInfo);

  const routerAddress = useMemo(() => getContract(chainId, "SyntheticsRouter"), [chainId]);

  const allTokensData = useMemo(() => {
    return {
      ...tokensData,
      ...marketTokensData,
    };
  }, [tokensData, marketTokensData]);

  let firstToken = getTokenData(allTokensData, firstTokenAddress);
  let firstTokenAmount = parseValue(firstTokenInputValue, firstToken?.decimals || 0);
  const firstTokenUsd = convertToUsd(
    firstTokenAmount,
    firstToken?.decimals,
    isDeposit ? firstToken?.prices?.minPrice : firstToken?.prices?.maxPrice
  );

  let secondToken = getTokenData(allTokensData, secondTokenAddress);
  let secondTokenAmount = parseValue(secondTokenInputValue, secondToken?.decimals || 0);
  const secondTokenUsd = convertToUsd(
    secondTokenAmount,
    secondToken?.decimals,
    isDeposit ? secondToken?.prices?.minPrice : secondToken?.prices?.maxPrice
  );

  const {
    longTokenInputState,
    // Undefined when isSameCollaterals is true
    shortTokenInputState,
  } = useMemo(() => {
    if (!marketInfo) {
      return {};
    }

    const inputs: {
      address: string;
      value: string;
      amount?: bigint;
      isGm?: boolean;
      usd?: bigint;
      token?: TokenData;
      setValue: (val: string) => void;
    }[] = [];

    if (firstTokenAddress) {
      inputs.push({
        address: firstTokenAddress,
        isGm: firstToken?.symbol === "GM",
        value: firstTokenInputValue,
        setValue: setFirstTokenInputValue,
        amount: firstTokenAmount,
        usd: firstTokenUsd,
        token: firstToken,
      });
    }

    if (isPair && secondTokenAddress) {
      inputs.push({
        address: secondTokenAddress,
        value: secondTokenInputValue,
        isGm: false,
        setValue: setSecondTokenInputValue,
        amount: secondTokenAmount,
        usd: secondTokenUsd,
        token: secondToken,
      });
    }

    const longTokenInputState = inputs.find((input) => {
      return input.token?.symbol === "GM" || getTokenPoolType(marketInfo, input.address) === "long";
    });
    const shortTokenInputState = inputs.find((input) => getTokenPoolType(marketInfo, input.address) === "short");

    return {
      longTokenInputState,
      shortTokenInputState,
    };
  }, [
    firstToken,
    firstTokenAddress,
    firstTokenAmount,
    firstTokenInputValue,
    firstTokenUsd,
    isPair,
    marketInfo,
    secondToken,
    secondTokenAddress,
    secondTokenAmount,
    secondTokenInputValue,
    secondTokenUsd,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
  ]);

  const tokenOptions: (Token & { isGm?: boolean })[] = useMemo(
    function getTokenOptions(): TokenData[] {
      const { longToken, shortToken } = marketInfo || {};

      if (!longToken || !shortToken) return [];

      const result = [longToken];

      if (isGlvMarket && !isPair) {
        return [
          longToken,
          shortToken,
          ...marketInfo.markets
            .map((m) => {
              const token = marketTokensData?.[m.address];
              const market = marketsInfoData[m.address];

              if (market.isDisabled) {
                return;
              }

              if (token) {
                return {
                  ...token,
                  isGm: true,
                  name: `${market.indexToken.symbol}: ${market.name}`,
                  symbol: market.indexToken.symbol,
                };
              }
            })
            .filter(Boolean as unknown as <T>(x: T | undefined) => x is T),
        ];
      }

      if (longToken.address !== shortToken.address) {
        result.push(shortToken);
      }

      const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS)!;

      if (result.some((token) => token.isWrapped) && nativeToken) {
        result.unshift(nativeToken);
      }

      return result;
    },
    [marketInfo, tokensData, isGlvMarket, marketTokensData, marketsInfoData, isPair]
  );

  const bestGmPoolAddress = useBestGmPoolAddressForGlv(isDeposit, marketInfo, selectedGlvGmMarket);

  useEffect(() => {
    if (!selectedGlvGmMarket && bestGmPoolAddress) {
      onSelectGlvGmMarket?.(bestGmPoolAddress);
    }
  }, [bestGmPoolAddress, onSelectGlvGmMarket, selectedGlvGmMarket]);

  /**
   * Here and following we use `underlyingGmMarket` to get the correct market info for GLV markets
   * because we need to use actual GM market data to calculate fees, errors and so on,
   * but here marketInfo may be a Vault market
   */
  const { underlyingGmMarket, underlyingGmMarketToken, marketTokenAmount, marketToken } = useMemo(() => {
    const realGmMarket = isGlvMarket
      ? selectedGlvGmMarket
        ? marketsInfoData[selectedGlvGmMarket]
        : marketsInfoData[(marketInfo as GlvMarketInfo).markets[0].address]
      : marketInfo;

    const marketToken = getTokenData(
      isDeposit ? depositMarketTokensData : withdrawalMarketTokensData,
      realGmMarket?.marketTokenAddress
    );
    const marketTokenAmount = parseValue(marketTokenInputValue || "0", marketToken?.decimals || 0)!;

    const usedMarketToken = isGlvMarket ? marketInfo?.indexToken : marketToken;

    return {
      underlyingGmMarket: realGmMarket,
      underlyingGmMarketToken: marketToken,
      marketToken: usedMarketToken,
      marketTokenAmount,
    };
  }, [
    isGlvMarket,
    marketInfo,
    marketsInfoData,
    depositMarketTokensData,
    withdrawalMarketTokensData,
    marketTokenInputValue,
    isDeposit,
    selectedGlvGmMarket,
  ]);

  const marketTokenUsd = isGlvMarket
    ? convertToUsd(
        marketTokenAmount,
        marketInfo.indexToken?.decimals,
        isDeposit ? marketInfo?.indexToken.prices.maxPrice : marketInfo?.indexToken.prices.minPrice
      )!
    : convertToUsd(
        marketTokenAmount,
        underlyingGmMarketToken?.decimals,
        isDeposit ? underlyingGmMarketToken?.prices?.maxPrice : underlyingGmMarketToken?.prices?.minPrice
      )!;

  const { longCollateralLiquidityUsd, shortCollateralLiquidityUsd } = useMemo(() => {
    if (!underlyingGmMarket) {
      return {};
    }

    return {
      longCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(underlyingGmMarket, true),
      shortCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(underlyingGmMarket, false),
    };
  }, [underlyingGmMarket]);

  const isMarketTokenDeposit = Boolean(longTokenInputState?.isGm);
  const amounts = useDepositWithdrawalAmounts({
    isDeposit,
    marketInfo: underlyingGmMarket,
    vaultInfo: isGlvMarket ? marketInfo : undefined,
    marketToken: underlyingGmMarketToken,
    longTokenInputState,
    shortTokenInputState,
    marketTokenAmount,
    uiFeeFactor,
    focusedInput,
    isWithdrawal,
    marketTokensData,
    isMarketTokenDeposit,
  });

  const vaultInfo = isGlvMarket ? marketInfo : undefined;

  const { fees, executionFee } = useFees({
    amounts,
    chainId,
    gasLimits,
    gasPrice,
    isDeposit,
    tokensData,
    isGlv: isGlvMarket,
    glvMarket: marketInfo as GlvMarketInfo,
    isMarketTokenDeposit,
  });

  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const isHighPriceImpact =
    (fees?.swapPriceImpact?.deltaUsd ?? 0) < 0 &&
    bigMath.abs(fees?.swapPriceImpact?.bps ?? 0n) >= HIGH_PRICE_IMPACT_BPS;

  const submitState = useSubmitButtonState({
    routerAddress,
    amounts,
    executionFee,
    fees,
    isDeposit,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    marketInfo: underlyingGmMarket,
    vaultInfo,
    marketToken: marketToken!,
    operation,
    shouldDisableValidation: shouldDisableValidationForTesting,
    tokensData,
    longToken: longTokenInputState?.token,
    shortToken: shortTokenInputState?.token,
    marketTokenAmount,
    marketTokenUsd: amounts?.marketTokenUsd,
    longTokenAmount: amounts?.longTokenAmount,
    shortTokenAmount: amounts?.shortTokenAmount,
    longTokenUsd: amounts?.longTokenUsd,
    shortTokenUsd: amounts?.shortTokenUsd,
    longTokenLiquidityUsd: longCollateralLiquidityUsd,
    shortTokenLiquidityUsd: shortCollateralLiquidityUsd,
    marketTokensData,
    isGlv: Boolean(isGlvMarket),
    selectedGlvGmMarket,
    isHighFeeConsentError,
    isMarketTokenDeposit: isMarketTokenDeposit,
    marketsInfoData,
  });

  const firstTokenShowMaxButton =
    (isDeposit &&
      firstToken?.balance &&
      (firstTokenAmount === undefined || firstTokenAmount !== firstToken.balance) &&
      (firstToken?.isNative
        ? minResidualAmount !== undefined && firstToken?.balance !== undefined && firstToken.balance > minResidualAmount
        : true)) ||
    false;

  const secondTokenShowMaxButton =
    (isDeposit &&
      secondToken?.balance &&
      (secondTokenAmount === undefined || secondTokenAmount !== secondToken.balance) &&
      (secondToken?.isNative
        ? minResidualAmount !== undefined &&
          secondToken?.balance !== undefined &&
          secondToken.balance > minResidualAmount
        : true)) ||
    false;

  const marketTokenInputShowMaxButton =
    (isWithdrawal &&
      marketToken?.balance &&
      (marketTokenAmount === undefined || marketTokenAmount !== marketToken.balance)) ||
    false;
  // #endregion
  // #region Callbacks
  const onFocusedCollateralInputChange = useCallback(
    (tokenAddress: string) => {
      if (!marketInfo) {
        return;
      }

      if (marketInfo.isSameCollaterals) {
        setFocusedInput("longCollateral");
        return;
      }

      if (getTokenPoolType(marketInfo, tokenAddress) === "long") {
        setFocusedInput("longCollateral");
      } else {
        setFocusedInput("shortCollateral");
      }
    },
    [marketInfo, setFocusedInput]
  );

  const resetInputs = useCallback(() => {
    setFirstTokenInputValue("");
    setSecondTokenInputValue("");
    setMarketTokenInputValue("");
  }, [setFirstTokenInputValue, setMarketTokenInputValue, setSecondTokenInputValue]);

  const onMarketChange = useCallback(
    (marketAddress: string) => {
      resetInputs();
      onSelectMarket(marketAddress);
    },
    [onSelectMarket, resetInputs]
  );

  const onGmPoolChange = useCallback(
    (marketAddress: string) => {
      onSelectGlvGmMarket?.(marketAddress);
    },
    [onSelectGlvGmMarket]
  );

  const onMaxClickFirstToken = useCallback(() => {
    if (firstToken?.balance) {
      let maxAvailableAmount = firstToken.isNative
        ? firstToken.balance - (minResidualAmount ?? 0n)
        : firstToken.balance;

      if (maxAvailableAmount < 0) {
        maxAvailableAmount = 0n;
      }

      const formattedMaxAvailableAmount = formatAmountFree(maxAvailableAmount, firstToken.decimals);
      const finalAmount = isMetamaskMobile
        ? limitDecimals(formattedMaxAvailableAmount, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedMaxAvailableAmount;

      setFirstTokenInputValue(finalAmount);
      onFocusedCollateralInputChange(firstToken.address);
    }
  }, [
    firstToken?.address,
    firstToken?.balance,
    firstToken?.decimals,
    firstToken?.isNative,
    isMetamaskMobile,
    minResidualAmount,
    onFocusedCollateralInputChange,
    setFirstTokenInputValue,
  ]);

  const onMaxClickSecondToken = useCallback(() => {
    if (!isDeposit) {
      return;
    }

    if (secondToken?.balance === undefined) {
      return;
    }

    let maxAvailableAmount = secondToken.isNative
      ? secondToken.balance - (minResidualAmount ?? 0n)
      : secondToken.balance;

    if (maxAvailableAmount < 0) {
      maxAvailableAmount = 0n;
    }

    const formattedMaxAvailableAmount = formatAmountFree(maxAvailableAmount, secondToken.decimals);
    const finalAmount = isMetamaskMobile
      ? limitDecimals(formattedMaxAvailableAmount, MAX_METAMASK_MOBILE_DECIMALS)
      : formattedMaxAvailableAmount;
    setSecondTokenInputValue(finalAmount);
    onFocusedCollateralInputChange(secondToken.address);
  }, [
    isDeposit,
    isMetamaskMobile,
    minResidualAmount,
    onFocusedCollateralInputChange,
    secondToken?.address,
    secondToken?.balance,
    secondToken?.decimals,
    secondToken?.isNative,
    setSecondTokenInputValue,
  ]);

  const handleFirstTokenInputValueChange = useCallback(
    (e) => {
      if (firstToken) {
        setFirstTokenInputValue(e.target.value);
        onFocusedCollateralInputChange(firstToken.address);
      }
    },
    [firstToken, onFocusedCollateralInputChange, setFirstTokenInputValue]
  );

  const marketTokenInputClickMax = useCallback(() => {
    if (marketToken?.balance) {
      const formattedGMBalance = formatAmountFree(marketToken.balance, marketToken.decimals);
      const finalGMBalance = isMetamaskMobile
        ? limitDecimals(formattedGMBalance, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedGMBalance;
      setMarketTokenInputValue(finalGMBalance);
      setFocusedInput("market");
    }
  }, [isMetamaskMobile, marketToken?.balance, marketToken?.decimals, setFocusedInput, setMarketTokenInputValue]);

  const marketTokenInputClickTopRightLabel = useCallback(() => {
    if (!isWithdrawal) {
      return;
    }

    if (marketToken?.balance) {
      setMarketTokenInputValue(formatAmountFree(marketToken.balance, marketToken.decimals));
      setFocusedInput("market");
    }
  }, [isWithdrawal, marketToken?.balance, marketToken?.decimals, setFocusedInput, setMarketTokenInputValue]);

  const marketTokenInputValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMarketTokenInputValue(e.target.value);
      setFocusedInput("market");
    },
    [setFocusedInput, setMarketTokenInputValue]
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

  const firstTokenSelectToken = useCallback(
    (token: Token): void => setFirstTokenAddress(token.address),
    [setFirstTokenAddress]
  );

  const marketTokenSelectMarket = useCallback(
    (marketInfo: MarketInfo): void => {
      onMarketChange(marketInfo.marketTokenAddress);
      showMarketToast(marketInfo);
    },
    [onMarketChange]
  );
  // #endregion
  // #region Effects
  useUpdateInputAmounts({
    marketToken: underlyingGmMarketToken,
    marketInfo,
    longTokenInputState,
    shortTokenInputState,
    isDeposit,
    focusedInput,
    amounts,
    setMarketTokenInputValue,
    marketTokenAmount,
    isWithdrawal,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
  });

  useEffect(
    function updateMarket() {
      if (!marketAddress && sortedMarketsInfoByIndexToken.length) {
        onMarketChange(sortedMarketsInfoByIndexToken[0].marketTokenAddress);
      }
    },
    [marketAddress, onMarketChange, sortedMarketsInfoByIndexToken]
  );

  useEffect(() => {
    const isGmAsLongSelected = longTokenInputState?.isGm;

    if (isGmAsLongSelected) {
      onSelectGlvGmMarket?.(longTokenInputState?.address);
    }
  }, [longTokenInputState, onSelectGlvGmMarket]);

  useUpdateByQueryParams({
    operation,
    setOperation: onSetOperation,
    setMode: onSetMode,
    onSelectMarket,
    onSelectGlvGmMarket,
    setFirstTokenAddress,
  });

  useUpdateTokens({
    tokenOptions,
    firstTokenAddress,
    setFirstTokenAddress,
    isSingle,
    secondTokenAddress,
    marketInfo,
    secondTokenAmount,
    setFocusedInput,
    setSecondTokenAddress,
    setSecondTokenInputValue,
    isPair,
    chainId,
  });
  // #endregion

  const marketTokenFormatted = useMemo(() => {
    const usedMarketToken = isGlvMarket ? marketInfo?.indexToken : marketToken;

    return formatTokenAmount(usedMarketToken?.balance, usedMarketToken?.decimals, "", {
      useCommas: true,
    });
  }, [marketToken, marketInfo, isGlvMarket]);

  const { viewTokenInfo, showTokenName } = useMemo(() => {
    const selectedToken = firstTokenAddress ? marketTokensData?.[firstTokenAddress] : undefined;
    const isGm = selectedToken?.symbol === "GM";

    return {
      viewTokenInfo: isGm
        ? {
            ...marketsInfoData?.[selectedToken.address].indexToken,
            name: getMarketIndexName({
              indexToken: marketsInfoData?.[selectedToken.address].indexToken,
              isSpotOnly: marketsInfoData?.[selectedToken.address].isSpotOnly,
            }),
          }
        : selectedToken,
      showTokenName: isGm,
    };
  }, [firstTokenAddress, marketTokensData, marketsInfoData]);

  const submitButton = useMemo(() => {
    const btn = (
      <Button
        className="w-full"
        variant="primary-action"
        onClick={submitState.onSubmit}
        disabled={submitState.disabled}
      >
        {submitState.text}
      </Button>
    );

    if (submitState.errorDescription) {
      return (
        <TooltipWithPortal content={submitState.errorDescription} disableHandleStyle>
          {btn}
        </TooltipWithPortal>
      );
    }

    return btn;
  }, [submitState]);

  return (
    <>
      <form>
        <div className={cx("GmSwapBox-form-layout", { reverse: isWithdrawal })}>
          <BuyInputSection
            topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
            topLeftValue={formatUsd(firstTokenUsd)}
            topRightLabel={t`Balance`}
            topRightValue={formatTokenAmount(firstToken?.balance, firstToken?.decimals, "", {
              useCommas: true,
            })}
            preventFocusOnLabelClick="right"
            onClickTopRightLabel={isDeposit ? onMaxClickFirstToken : undefined}
            showMaxButton={firstTokenShowMaxButton}
            inputValue={firstTokenInputValue}
            onInputValueChange={handleFirstTokenInputValueChange}
            onClickMax={onMaxClickFirstToken}
          >
            {firstTokenAddress && isSingle && isDeposit && tokenOptions.length > 1 ? (
              <TokenSelector
                label={isDeposit ? t`Pay` : t`Receive`}
                chainId={chainId}
                tokenInfo={viewTokenInfo}
                showTokenName={showTokenName}
                tokenAddress={firstTokenAddress}
                onSelectToken={firstTokenSelectToken}
                tokens={tokenOptions}
                infoTokens={infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showTokenImgInDropdown={true}
              />
            ) : (
              <div className="selected-token">
                <TokenWithIcon symbol={firstToken?.symbol} displaySize={20} />
              </div>
            )}
          </BuyInputSection>

          {isPair && secondTokenAddress && (
            <BuyInputSection
              topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
              topLeftValue={formatUsd(secondTokenUsd)}
              topRightLabel={t`Balance`}
              topRightValue={formatTokenAmount(secondToken?.balance, secondToken?.decimals, "", {
                useCommas: true,
              })}
              preventFocusOnLabelClick="right"
              inputValue={secondTokenInputValue}
              showMaxButton={secondTokenShowMaxButton}
              onInputValueChange={secondTokenInputValueChange}
              onClickTopRightLabel={onMaxClickSecondToken}
              onClickMax={onMaxClickSecondToken}
            >
              <div className="selected-token">
                <TokenWithIcon symbol={secondToken?.symbol} displaySize={20} />
              </div>
            </BuyInputSection>
          )}

          <Swap />

          <BuyInputSection
            topLeftLabel={isWithdrawal ? t`Pay` : t`Receive`}
            topLeftValue={marketTokenUsd ? formatUsd(marketTokenUsd) : ""}
            topRightLabel={t`Balance`}
            topRightValue={marketTokenFormatted}
            preventFocusOnLabelClick="right"
            showMaxButton={marketTokenInputShowMaxButton}
            inputValue={marketTokenInputValue}
            onInputValueChange={marketTokenInputValueChange}
            onClickTopRightLabel={marketTokenInputClickTopRightLabel}
            onClickMax={marketTokenInputClickMax}
          >
            <PoolSelector
              label={t`Pool`}
              className="-mr-4"
              selectedIndexName={indexName}
              selectedMarketAddress={marketAddress}
              markets={sortedMarketsInfoByIndexToken}
              marketTokensData={marketTokensData}
              isSideMenu
              showAllPools
              showBalances
              showIndexIcon
              onSelectMarket={marketTokenSelectMarket}
              {...gmTokenFavoritesContext}
            />
          </BuyInputSection>
        </div>

        <InfoRows
          indexName={indexName}
          marketAddress={marketAddress}
          marketTokensData={marketTokensData}
          isDeposit={isDeposit}
          fees={fees}
          marketInfo={marketInfo}
          executionFee={executionFee}
          isHighPriceImpact={isHighPriceImpact}
          disablePoolSelector={longTokenInputState?.isGm}
          selectedGlvGmMarket={selectedGlvGmMarket}
          isHighPriceImpactAccepted={isHighPriceImpactAccepted}
          setIsHighPriceImpactAccepted={setIsHighPriceImpactAccepted}
          isSingle={isSingle}
          onGmPoolChange={onGmPoolChange}
          onMarketChange={onMarketChange}
        />

        {submitState.tokensToApprove && submitState.tokensToApprove.length > 0 && (
          <div>
            {submitState.tokensToApprove.map((address) => {
              const token = getTokenData(allTokensData, address)!;
              let marketTokenData = address === marketToken?.address && getByKey(marketsInfoData, marketToken?.address);
              return (
                <div key={address}>
                  <ApproveTokenButton
                    key={address}
                    tokenAddress={address}
                    tokenSymbol={marketTokenData ? `GM: ${marketTokenData.name}` : token.assetSymbol ?? token.symbol}
                    spenderAddress={routerAddress}
                  />
                </div>
              );
            })}
          </div>
        )}

        {highExecutionFeeAcknowledgement ? (
          <div className="GmConfirmationBox-high-fee">{highExecutionFeeAcknowledgement}</div>
        ) : null}

        <div className="Exchange-swap-button-container">{submitButton}</div>
      </form>
    </>
  );
}

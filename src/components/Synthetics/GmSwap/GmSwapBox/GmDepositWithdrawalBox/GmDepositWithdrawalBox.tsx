import { t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";

import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useHasOutdatedUi } from "domain/legacy";
import {
  FeeItem,
  estimateExecuteDepositGasLimit,
  estimateExecuteWithdrawalGasLimit,
  getExecutionFee,
  getFeeItem,
  getTotalFeeItem,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  estimateDepositOraclePriceCount,
  estimateWithdrawalOraclePriceCount,
} from "domain/synthetics/fees/utils/estimateOraclePriceCount";
import useUiFeeFactor from "domain/synthetics/fees/utils/useUiFeeFactor";
import { useMarketTokensData } from "domain/synthetics/markets";
import type { MarketInfo } from "domain/synthetics/markets/types";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarketIndexName,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { TokenData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useGmTokensFavorites } from "domain/synthetics/tokens/useGmTokensFavorites";
import { GmSwapFees, useAvailableTokenOptions } from "domain/synthetics/trade";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { Token, getMinResidualAmount } from "domain/tokens";
import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatTokenAmount, formatUsd, limitDecimals, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";
import { useCallback, useEffect, useMemo } from "react";
import type { GmSwapBoxProps } from "../GmSwapBox";
import { showMarketToast } from "../showMarketToast";
import { Mode, Operation } from "../types";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useGmDepositWithdrawalBoxState } from "./useGmDepositWithdrawalBoxState";
import { useUpdateByQueryParams } from "../useUpdateByQueryParams";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { GmConfirmationBox } from "../../GmConfirmationBox/GmConfirmationBox";
import { Swap } from "../Swap";
import { InfoRows } from "./InfoRows";

export function GmSwapBoxDepositWithdrawal(p: GmSwapBoxProps) {
  const { selectedMarketAddress: marketAddress, operation, mode, onSetMode, onSetOperation, onSelectMarket } = p;
  const isMetamaskMobile = useIsMetamaskMobile();
  const { openConnectModal } = useConnectModal();

  const { shouldDisableValidationForTesting } = useSettings();

  const { chainId } = useChainId();
  const { account } = useWallet();

  // #region Requests
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const uiFeeFactor = useUiFeeFactor(chainId);
  const { data: hasOutdatedUi } = useHasOutdatedUi();
  // #endregion
  // #region Selectors
  const marketsInfoData = useMarketsInfoData();
  const { marketsInfo: sortedMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    marketsInfoData,
    depositMarketTokensData
  );
  const tokensData = useTokensData();
  const { infoTokens } = useAvailableTokenOptions(chainId, { marketsInfoData, tokensData });

  // #region State
  const gmTokenFavoritesContext = useGmTokensFavorites();
  const {
    focusedInput,
    setFocusedInput,
    stage,
    setStage,
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

  const isDeposit = operation === Operation.Deposit;
  const isWithdrawal = operation === Operation.Withdrawal;
  const isSingle = mode === Mode.Single;
  const isPair = mode === Mode.Pair;

  const marketTokensData = isDeposit ? depositMarketTokensData : withdrawalMarketTokensData;

  const marketInfo = getByKey(marketsInfoData, marketAddress);
  const indexName = marketInfo && getMarketIndexName(marketInfo);

  let firstToken = getTokenData(tokensData, firstTokenAddress);
  let firstTokenAmount = parseValue(firstTokenInputValue, firstToken?.decimals || 0);
  const firstTokenUsd = convertToUsd(
    firstTokenAmount,
    firstToken?.decimals,
    isDeposit ? firstToken?.prices?.minPrice : firstToken?.prices?.maxPrice
  );

  let secondToken = getTokenData(tokensData, secondTokenAddress);
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
      usd?: bigint;
      token?: TokenData;
      setValue: (val: string) => void;
    }[] = [];

    if (firstTokenAddress) {
      inputs.push({
        address: firstTokenAddress,
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
        setValue: setSecondTokenInputValue,
        amount: secondTokenAmount,
        usd: secondTokenUsd,
        token: secondToken,
      });
    }

    const longTokenInputState = inputs.find((input) => getTokenPoolType(marketInfo, input.address) === "long");
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

  const tokenOptions: Token[] = useMemo(
    function getTokenOptions(): TokenData[] {
      const { longToken, shortToken } = marketInfo || {};

      if (!longToken || !shortToken) return [];

      const result = [longToken];

      if (longToken.address !== shortToken.address) {
        result.push(shortToken);
      }

      const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS)!;

      if (result.some((token) => token.isWrapped) && nativeToken) {
        result.unshift(nativeToken);
      }

      return result;
    },
    [marketInfo, tokensData]
  );

  const marketToken = getTokenData(
    isDeposit ? depositMarketTokensData : withdrawalMarketTokensData,
    marketInfo?.marketTokenAddress
  );
  const marketTokenAmount = parseValue(marketTokenInputValue || "0", marketToken?.decimals || 0)!;
  const marketTokenUsd = convertToUsd(
    marketTokenAmount,
    marketToken?.decimals,
    isDeposit ? marketToken?.prices?.maxPrice : marketToken?.prices?.minPrice
  )!;

  const { longCollateralLiquidityUsd, shortCollateralLiquidityUsd } = useMemo(() => {
    if (!marketInfo) return {};

    return {
      longCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, true),
      shortCollateralLiquidityUsd: getAvailableUsdLiquidityForCollateral(marketInfo, false),
    };
  }, [marketInfo]);

  const amounts = useDepositWithdrawalAmounts({
    isDeposit,
    marketInfo,
    marketToken,
    longTokenInputState,
    shortTokenInputState,
    marketTokenAmount,
    uiFeeFactor,
    focusedInput,
    isWithdrawal,
  });

  const { fees, executionFee } = useMemo(() => {
    if (!gasLimits || gasPrice === undefined || !tokensData || !amounts) {
      return {};
    }

    const basisUsd = isDeposit
      ? (amounts?.longTokenUsd ?? 0n) + (amounts?.shortTokenUsd ?? 0n)
      : amounts?.marketTokenUsd || 0n;

    const swapFee = getFeeItem(amounts.swapFeeUsd * -1n, basisUsd);
    const swapPriceImpact = getFeeItem(amounts.swapPriceImpactDeltaUsd, basisUsd);
    const uiFee = getFeeItem(amounts.uiFeeUsd * -1n, basisUsd, {
      shouldRoundUp: true,
    });

    const totalFees = getTotalFeeItem([swapPriceImpact, swapFee, uiFee].filter(Boolean) as FeeItem[]);
    const fees: GmSwapFees = {
      swapFee,
      swapPriceImpact,
      totalFees,
      uiFee,
    };

    const gasLimit = isDeposit
      ? estimateExecuteDepositGasLimit(gasLimits, {
          initialLongTokenAmount: amounts.longTokenAmount,
          initialShortTokenAmount: amounts.shortTokenAmount,
        })
      : estimateExecuteWithdrawalGasLimit(gasLimits, {});

    const oraclePriceCount = isDeposit ? estimateDepositOraclePriceCount(0) : estimateWithdrawalOraclePriceCount(0);

    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, gasLimit, gasPrice, oraclePriceCount);

    return {
      fees,
      executionFee,
    };
  }, [amounts, chainId, gasLimits, gasPrice, isDeposit, tokensData]);

  const isHighPriceImpact =
    (fees?.swapPriceImpact?.deltaUsd ?? 0) < 0 &&
    bigMath.abs(fees?.swapPriceImpact?.bps ?? 0n) >= HIGH_PRICE_IMPACT_BPS;

  const submitState = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: true,
      hasOutdatedUi,
    })[0];

    const swapError = getGmSwapError({
      isDeposit,
      marketInfo,
      marketToken,
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
      fees,
      isHighPriceImpact: Boolean(isHighPriceImpact),
      isHighPriceImpactAccepted,
      priceImpactUsd: fees?.swapPriceImpact?.deltaUsd,
    })[0];

    const error = commonError || swapError;

    if (!account) {
      return {
        text: t`Connect Wallet`,
        onSubmit: () => openConnectModal?.(),
      };
    }

    const onSubmit = () => {
      setStage("confirmation");
    };

    if (error) {
      return {
        text: error,
        error,
        isDisabled: !shouldDisableValidationForTesting,
        onSubmit,
      };
    }

    return {
      text: isDeposit ? t`Buy GM` : t`Sell GM`,
      onSubmit,
    };
  }, [
    chainId,
    hasOutdatedUi,
    isDeposit,
    marketInfo,
    marketToken,
    longTokenInputState?.token,
    shortTokenInputState?.token,
    marketTokenAmount,
    amounts?.marketTokenUsd,
    amounts?.longTokenAmount,
    amounts?.shortTokenAmount,
    amounts?.longTokenUsd,
    amounts?.shortTokenUsd,
    longCollateralLiquidityUsd,
    shortCollateralLiquidityUsd,
    fees,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    account,
    openConnectModal,
    setStage,
    shouldDisableValidationForTesting,
  ]);

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

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      submitState.onSubmit();
    },
    [submitState]
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
    marketToken,
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

  useUpdateByQueryParams({
    operation,
    setOperation: onSetOperation,
    setMode: onSetMode,
    onSelectMarket,
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
  return (
    <>
      <form onSubmit={handleFormSubmit}>
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
            {firstTokenAddress && isSingle && isDeposit ? (
              <TokenSelector
                label={isDeposit ? t`Pay` : t`Receive`}
                chainId={chainId}
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
            topRightValue={formatTokenAmount(marketToken?.balance, marketToken?.decimals, "", {
              useCommas: true,
            })}
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
          executionFee={executionFee}
          isHighPriceImpact={isHighPriceImpact}
          isHighPriceImpactAccepted={isHighPriceImpactAccepted}
          setIsHighPriceImpactAccepted={setIsHighPriceImpactAccepted}
          isSingle={isSingle}
          onMarketChange={onMarketChange}
        />

        <div className="Exchange-swap-button-container">
          <Button
            className="w-full"
            variant="primary-action"
            onClick={submitState.onSubmit}
            disabled={submitState.isDisabled}
          >
            {submitState.text}
          </Button>
        </div>
      </form>

      <GmConfirmationBox
        isVisible={stage === "confirmation"}
        marketToken={marketToken!}
        longToken={longTokenInputState?.token}
        shortToken={shortTokenInputState?.token}
        marketTokenAmount={amounts?.marketTokenAmount ?? 0n}
        marketTokenUsd={amounts?.marketTokenUsd ?? 0n}
        longTokenAmount={amounts?.longTokenAmount}
        longTokenUsd={amounts?.longTokenUsd}
        shortTokenAmount={amounts?.shortTokenAmount}
        shortTokenUsd={amounts?.shortTokenUsd}
        fees={fees!}
        error={submitState.error}
        operation={operation}
        executionFee={executionFee}
        onSubmitted={() => {
          setStage("swap");
        }}
        onClose={() => {
          setStage("swap");
        }}
        shouldDisableValidation={shouldDisableValidationForTesting}
      />
    </>
  );
}

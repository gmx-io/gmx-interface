import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getContract } from "config/contracts";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectGlvAndMarketsInfoData,
  selectMarketsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useGasLimits, useGasPrice } from "domain/synthetics/fees";
import useUiFeeFactorRequest from "domain/synthetics/fees/utils/useUiFeeFactor";
import { useMarketTokensData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import {
  getAvailableUsdLiquidityForCollateral,
  getGlvOrMarketAddress,
  getMarketIndexName,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { TokenData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useAvailableTokenOptions } from "domain/synthetics/trade";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { Token } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatBalanceAmount, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { useBestGmPoolAddressForGlv } from "components/Synthetics/MarketStats/hooks/useBestGmPoolForGlv";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";


import { useGmWarningState } from "../useGmWarningState";
import { useUpdateByQueryParams } from "../useUpdateByQueryParams";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useGmDepositWithdrawalBoxState } from "./useGmDepositWithdrawalBoxState";
import { useSubmitButtonState } from "./useSubmitButtonState";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";
import type { GmSwapBoxProps } from "../GmSwapBox";
import { Swap } from "../Swap";
import { Mode, Operation } from "../types";
import { InfoRows } from "./InfoRows";

export function GmSwapBoxDepositWithdrawal(p: GmSwapBoxProps) {
  const {
    selectedMarketAddress: marketAddress,
    operation,
    mode,
    onSetMode,
    onSetOperation,
    onSelectMarket,
    selectedMarketForGlv,
    onSelectedMarketForGlv,
  } = p;
  const { shouldDisableValidationForTesting } = useSettings();
  const { chainId } = useChainId();
  const [isMarketForGlvSelectedManually, setIsMarketForGlvSelectedManually] = useState(false);

  // #region Requests
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);
  const { uiFeeFactor } = useUiFeeFactorRequest(chainId);
  // #endregion

  // #region Selectors
  const glvAndMarketsInfoData = useSelector(selectGlvAndMarketsInfoData);
  const marketsInfoData = useSelector(selectMarketsInfoData);

  const { marketsInfo: sortedMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    glvAndMarketsInfoData,
    depositMarketTokensData
  );
  const isDeposit = operation === Operation.Deposit;
  const tokensData = useTokensData();
  const { infoTokens } = useAvailableTokenOptions(chainId, {
    marketsInfoData: glvAndMarketsInfoData,
    tokensData,
    marketTokens: isDeposit ? depositMarketTokensData : withdrawalMarketTokensData,
  });

  // #region State
  const {
    focusedInput,
    setFocusedInput,
    firstTokenAddress,
    setFirstTokenAddress,
    secondTokenAddress,
    setSecondTokenAddress,
    firstTokenInputValue,
    setFirstTokenInputValue,
    secondTokenInputValue,
    setSecondTokenInputValue,
    marketOrGlvTokenInputValue,
    setMarketOrGlvTokenInputValue,
  } = useGmDepositWithdrawalBoxState(operation, mode, marketAddress);
  // #endregion
  // #region Derived state

  /**
   * When buy/sell GM - marketInfo is GM market, glvInfo is undefined
   * When buy/sell GLV - marketInfo is corresponding GM market, glvInfo is selected GLV
   */
  const { marketInfo, glvInfo } = useMemo(() => {
    const initialMarketInfo = getByKey(glvAndMarketsInfoData, marketAddress);
    const isGlv = initialMarketInfo && isGlvInfo(initialMarketInfo);
    const marketInfo = isGlv
      ? selectedMarketForGlv
        ? marketsInfoData?.[selectedMarketForGlv]
        : undefined
      : initialMarketInfo;

    const glvInfo = isGlv ? initialMarketInfo : undefined;

    return {
      marketInfo,
      glvInfo,
    };
  }, [marketAddress, glvAndMarketsInfoData, marketsInfoData, selectedMarketForGlv]);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  const isWithdrawal = operation === Operation.Withdrawal;
  const isSingle = mode === Mode.Single;
  const isPair = mode === Mode.Pair;

  const marketTokensData = isDeposit ? depositMarketTokensData : withdrawalMarketTokensData;

  const indexName = useMemo(() => marketInfo && getMarketIndexName(marketInfo), [marketInfo]);
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
    // Undefined when paying with GM
    longTokenInputState,
    // Undefined when isSameCollaterals is true, or when paying with GM
    shortTokenInputState,
    // undefined when not paying with GM
    fromMarketTokenInputState,
  } = useMemo(() => {
    if (!marketInfo) {
      return {};
    }

    const inputs: {
      address: string;
      value: string;
      amount?: bigint;
      isMarketToken?: boolean;
      usd?: bigint;
      token?: TokenData;
      setValue: (val: string) => void;
    }[] = [];

    if (firstTokenAddress) {
      inputs.push({
        address: firstTokenAddress,
        isMarketToken: firstToken?.symbol === "GM",
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
        isMarketToken: false,
        setValue: setSecondTokenInputValue,
        amount: secondTokenAmount,
        usd: secondTokenUsd,
        token: secondToken,
      });
    }

    const longTokenInputState = inputs.find(
      (input) => input.isMarketToken === false && getTokenPoolType(marketInfo, input.address) === "long"
    );
    const shortTokenInputState = inputs.find(
      (input) => input.isMarketToken === false && getTokenPoolType(marketInfo, input.address) === "short"
    );
    const fromMarketTokenInputState = inputs.find((input) => input.isMarketToken);

    return {
      longTokenInputState,
      shortTokenInputState,
      fromMarketTokenInputState,
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

  /**
   * When buy/sell GM - marketToken is GM token, glvToken is undefined
   * When buy/sell GLV - marketToken is corresponding GM token, glvToken is selected GLV token
   */
  const { marketTokenAmount, marketToken, glvToken, glvTokenAmount } = useMemo(() => {
    const marketToken = getTokenData(marketTokensData, marketInfo?.marketTokenAddress);
    const marketTokenAmount = glvInfo
      ? fromMarketTokenInputState?.amount ?? 0n
      : parseValue(marketOrGlvTokenInputValue || "0", marketToken?.decimals || 0)!;

    const glvTokenAmount = glvInfo
      ? parseValue(marketOrGlvTokenInputValue || "0", glvInfo?.glvToken.decimals || 0)!
      : 0n;

    return {
      marketToken,
      marketTokenAmount,
      glvToken: glvInfo?.glvToken,
      glvTokenAmount,
    };
  }, [glvInfo, marketInfo, marketTokensData, marketOrGlvTokenInputValue, fromMarketTokenInputState?.amount]);

  const tokenOptions: (Token & { isMarketToken?: boolean })[] = useMemo(
    function getTokenOptions(): TokenData[] {
      const { longToken, shortToken } = marketInfo || {};

      if (!longToken || !shortToken) return [];

      const result = [longToken];

      if (glvInfo && !isPair) {
        const options = [longToken, shortToken];

        const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS)!;

        if (options.some((token) => token.isWrapped) && nativeToken) {
          options.unshift(nativeToken);
        }

        options.push(
          ...glvInfo.markets
            .map((m) => {
              const token = marketTokensData?.[m.address];
              const market = marketsInfoData?.[m.address];

              if (!market || market.isDisabled) {
                return;
              }

              if (token) {
                return {
                  ...token,
                  isMarketToken: true,
                  name: `${market.indexToken.symbol}: ${market.name}`,
                  symbol: market.indexToken.symbol,
                };
              }
            })
            .filter(Boolean as unknown as FilterOutFalsy)
        );

        return options;
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
    [marketInfo, tokensData, marketTokensData, marketsInfoData, isPair, glvInfo]
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

  const isMarketTokenDeposit = Boolean(fromMarketTokenInputState);

  const amounts = useDepositWithdrawalAmounts({
    isDeposit,
    marketInfo,
    marketToken,
    glvToken,
    glvTokenAmount,
    longTokenInputState,
    shortTokenInputState,
    marketTokenAmount,
    uiFeeFactor,
    focusedInput,
    isWithdrawal,
    marketTokensData,
    isMarketTokenDeposit,
    glvInfo,
  });

  const { fees, executionFee } = useDepositWithdrawalFees({
    amounts,
    chainId,
    gasLimits,
    gasPrice,
    isDeposit,
    tokensData,
    glvInfo: glvInfo,
    isMarketTokenDeposit,
  });

  const {
    isAccepted,
    setIsAccepted,
    consentError,
    shouldShowWarning,
    shouldShowWarningForExecutionFee,
    shouldShowWarningForPosition,
  } = useGmWarningState({
    executionFee,
    fees,
  });

  const submitState = useSubmitButtonState({
    routerAddress,
    amounts,
    executionFee,
    fees,
    isDeposit,
    consentError,
    marketInfo,
    glvInfo,
    marketToken: marketToken!,
    operation,
    glvToken,
    shouldDisableValidation: shouldDisableValidationForTesting,
    tokensData,
    longToken: longTokenInputState?.token,
    shortToken: shortTokenInputState?.token,
    longTokenLiquidityUsd: longCollateralLiquidityUsd,
    shortTokenLiquidityUsd: shortCollateralLiquidityUsd,
    marketTokensData,
    selectedMarketForGlv,
    selectedMarketInfoForGlv: getByKey(marketsInfoData, selectedMarketForGlv),
    isMarketTokenDeposit: isMarketTokenDeposit,
    marketsInfoData,
  });

  const firstTokenMaxDetails = useMaxAvailableAmount({
    fromToken: firstToken,
    fromTokenAmount: firstTokenAmount ?? 0n,
    fromTokenInputValue: firstTokenInputValue,
    nativeToken: nativeToken,
  });

  const firstTokenShowMaxButton = isDeposit && firstTokenMaxDetails.showClickMax;

  const secondTokenMaxDetails = useMaxAvailableAmount({
    fromToken: secondToken,
    fromTokenAmount: secondTokenAmount ?? 0n,
    fromTokenInputValue: secondTokenInputValue,
    nativeToken: nativeToken,
  });

  const secondTokenShowMaxButton = isDeposit && secondTokenMaxDetails.showClickMax;

  const marketTokenMaxDetails = useMaxAvailableAmount({
    fromToken: glvInfo ? glvToken : marketToken,
    fromTokenAmount: glvInfo ? glvTokenAmount : marketTokenAmount,
    fromTokenInputValue: marketOrGlvTokenInputValue,
    nativeToken: nativeToken,
  });

  const marketTokenInputShowMaxButton = isWithdrawal && marketTokenMaxDetails.showClickMax;

  const receiveTokenFormatted = useMemo(() => {
    const usedMarketToken = glvInfo ? glvToken : marketToken;

    return usedMarketToken && usedMarketToken.balance !== undefined
      ? formatBalanceAmount(usedMarketToken.balance, usedMarketToken.decimals)
      : undefined;
  }, [marketToken, glvInfo, glvToken]);

  const { viewTokenInfo, showTokenName } = useMemo(() => {
    const selectedToken = firstTokenAddress ? marketTokensData?.[firstTokenAddress] : undefined;
    const isGm = selectedToken?.symbol === "GM";

    const selectedMarket = selectedToken && marketsInfoData?.[selectedToken.address];

    if (!selectedToken || !selectedMarket) {
      return {
        viewTokenInfo: undefined,
        showTokenName: false,
      };
    }

    return {
      viewTokenInfo: isGm
        ? {
            ...selectedMarket.indexToken,
            name: getMarketIndexName(selectedMarket),
          }
        : selectedToken,
      showTokenName: isGm,
    };
  }, [firstTokenAddress, marketTokensData, marketsInfoData]);
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
    setMarketOrGlvTokenInputValue("");
  }, [setFirstTokenInputValue, setMarketOrGlvTokenInputValue, setSecondTokenInputValue]);

  const onGlvOrMarketChange = useCallback(
    (marketAddress: string) => {
      resetInputs();
      onSelectMarket(marketAddress);
      setIsMarketForGlvSelectedManually(false);
    },
    [onSelectMarket, resetInputs]
  );

  const onMarketChange = useCallback(
    (marketAddress: string) => {
      setIsMarketForGlvSelectedManually(true);
      onSelectedMarketForGlv?.(marketAddress);
    },
    [onSelectedMarketForGlv]
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
      if (firstToken) {
        setFirstTokenInputValue(e.target.value);
        onFocusedCollateralInputChange(firstToken.address);
      }
    },
    [firstToken, onFocusedCollateralInputChange, setFirstTokenInputValue]
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

  const firstTokenSelectToken = useCallback(
    (token: Token): void => {
      setFirstTokenAddress(token.address);

      const isGmMarketSelected = glvInfo && glvInfo.markets.find((m) => m.address === token.address);

      if (isGmMarketSelected) {
        onSelectedMarketForGlv?.(token.address);
      }
    },
    [setFirstTokenAddress, glvInfo, onSelectedMarketForGlv]
  );

  const marketTokenSelectMarket = useCallback(
    (marketInfo: GlvOrMarketInfo): void => {
      onGlvOrMarketChange(getGlvOrMarketAddress(marketInfo));
      onSelectedMarketForGlv?.(undefined);
    },
    [onGlvOrMarketChange, onSelectedMarketForGlv]
  );
  // #endregion

  // #region Effects
  useUpdateInputAmounts({
    marketToken,
    marketInfo,
    fromMarketTokenInputState,
    longTokenInputState,
    shortTokenInputState,
    isDeposit,
    glvInfo,
    glvToken,
    focusedInput,
    amounts,
    marketTokenAmount,
    glvTokenAmount,
    isWithdrawal,
    setMarketOrGlvTokenInputValue,
    setFirstTokenInputValue,
    setSecondTokenInputValue,
  });

  useEffect(
    function updateMarket() {
      if (!marketAddress && sortedMarketsInfoByIndexToken.length) {
        onGlvOrMarketChange(getGlvOrMarketAddress(sortedMarketsInfoByIndexToken[0]));
      }
    },
    [marketAddress, onGlvOrMarketChange, sortedMarketsInfoByIndexToken]
  );

  useUpdateByQueryParams({
    operation,
    setOperation: onSetOperation,
    setMode: onSetMode,
    onSelectMarket,
    onSelectedMarketForGlv,
    selectedMarketForGlv,
    setFirstTokenAddress,
    setIsMarketForGlvSelectedManually,
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

  useBestGmPoolAddressForGlv({
    isDeposit,
    glvInfo,
    selectedMarketForGlv,
    fees,
    uiFeeFactor,
    focusedInput,
    marketTokenAmount,
    isMarketTokenDeposit,
    isMarketForGlvSelectedManually,
    glvTokenAmount,
    onSelectedMarketForGlv,
    longTokenInputState,
    shortTokenInputState,
    fromMarketTokenInputState,
    marketTokensData,
  });
  // #endregion

  // #region Render
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

  /**
   * Placeholder eligible for the first token in the pair,
   * additional check added to prevent try render GM token placeholder
   * until useUpdateTokens switch GM to long token
   */
  const firstTokenPlaceholder = useMemo(() => {
    if (firstToken?.symbol === "GM") {
      return null;
    }

    return (
      <div className="selected-token">
        <TokenWithIcon symbol={firstToken?.symbol} displaySize={20} />
      </div>
    );
  }, [firstToken?.symbol]);

  const receiveTokenUsd = glvInfo
    ? amounts?.glvTokenUsd ?? 0n
    : convertToUsd(
        marketTokenAmount,
        marketToken?.decimals,
        isDeposit ? marketToken?.prices?.maxPrice : marketToken?.prices?.minPrice
      )!;

  return (
    <>
      <form>
        <div className={cx("mb-12 flex gap-4", isWithdrawal ? "flex-col-reverse" : "flex-col")}>
          <BuyInputSection
            topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
            bottomLeftValue={formatUsd(firstTokenUsd)}
            isBottomLeftValueMuted={firstTokenUsd === undefined || firstTokenUsd === 0n}
            bottomRightLabel={t`Balance`}
            bottomRightValue={
              firstToken && firstToken.balance !== undefined
                ? formatBalanceAmount(firstToken.balance, firstToken.decimals)
                : undefined
            }
            onClickTopRightLabel={isDeposit ? onMaxClickFirstToken : undefined}
            inputValue={firstTokenInputValue}
            onInputValueChange={handleFirstTokenInputValueChange}
            onClickMax={firstTokenShowMaxButton ? onMaxClickFirstToken : undefined}
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
                size="l"
                showSymbolImage={true}
                showTokenImgInDropdown={true}
                marketsInfoData={marketsInfoData}
              />
            ) : (
              firstTokenPlaceholder
            )}
          </BuyInputSection>

          {isPair && secondTokenAddress && (
            <BuyInputSection
              topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
              bottomLeftValue={formatUsd(secondTokenUsd)}
              isBottomLeftValueMuted={secondTokenUsd === undefined || secondTokenUsd === 0n}
              bottomRightLabel={t`Balance`}
              bottomRightValue={
                secondToken && secondToken.balance !== undefined
                  ? formatBalanceAmount(secondToken.balance, secondToken.decimals)
                  : undefined
              }
              inputValue={secondTokenInputValue}
              onInputValueChange={secondTokenInputValueChange}
              onClickTopRightLabel={onMaxClickSecondToken}
              onClickMax={secondTokenShowMaxButton ? onMaxClickSecondToken : undefined}
            >
              <div className="selected-token">
                <TokenWithIcon symbol={secondToken?.symbol} displaySize={20} />
              </div>
            </BuyInputSection>
          )}

          <div className={cx("flex", isWithdrawal ? "flex-col-reverse" : "flex-col")}>
            <Swap />

            <BuyInputSection
              topLeftLabel={isWithdrawal ? t`Pay` : t`Receive`}
              bottomLeftValue={receiveTokenUsd ? formatUsd(receiveTokenUsd) : ""}
              bottomRightLabel={t`Balance`}
              bottomRightValue={receiveTokenFormatted}
              inputValue={marketOrGlvTokenInputValue}
              onInputValueChange={marketOrGlvTokenInputValueChange}
              onClickTopRightLabel={marketTokenInputClickTopRightLabel}
              onClickMax={marketTokenInputShowMaxButton ? marketTokenInputClickMax : undefined}
            >
              <PoolSelector
                chainId={chainId}
                size="l"
                label={t`Pool`}
                selectedIndexName={indexName}
                selectedMarketAddress={marketAddress}
                markets={sortedMarketsInfoByIndexToken}
                marketTokensData={marketTokensData}
                isSideMenu
                showAllPools
                showBalances
                showIndexIcon
                onSelectMarket={marketTokenSelectMarket}
                favoriteKey="gm-token-receive-pay-selector"
              />
            </BuyInputSection>
          </div>
        </div>

        <InfoRows
          indexName={indexName}
          marketAddress={marketAddress}
          marketTokensData={marketTokensData}
          isDeposit={isDeposit}
          fees={fees}
          glvInfo={glvInfo}
          executionFee={executionFee}
          setIsAccepted={setIsAccepted}
          shouldShowWarning={shouldShowWarning}
          shouldShowWarningForPosition={shouldShowWarningForPosition}
          shouldShowWarningForExecutionFee={shouldShowWarningForExecutionFee}
          isAccepted={isAccepted}
          disablePoolSelector={fromMarketTokenInputState !== undefined}
          selectedMarketForGlv={selectedMarketForGlv}
          isSingle={isSingle}
          onMarketChange={glvInfo ? onMarketChange : onGlvOrMarketChange}
        />

        {submitState.tokensToApprove && submitState.tokensToApprove.length > 0 && <div className="App-card-divider " />}

        {submitState.isAllowanceLoaded && submitState.tokensToApprove && submitState.tokensToApprove.length > 0 && (
          <div>
            {submitState.tokensToApprove.map((address) => {
              const token = getTokenData(allTokensData, address)!;
              const marketOrGlv = getByKey(glvAndMarketsInfoData, address);
              let marketTokenData = address === marketToken?.address && getByKey(marketsInfoData, marketToken?.address);
              return (
                <div key={address}>
                  <ApproveTokenButton
                    key={address}
                    tokenAddress={address}
                    tokenSymbol={
                      marketTokenData
                        ? isGlvInfo(marketOrGlv)
                          ? marketOrGlv.glvToken.contractSymbol
                          : token.assetSymbol ?? token.symbol
                        : token.assetSymbol ?? token.symbol
                    }
                    spenderAddress={routerAddress}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="Exchange-swap-button-container">{submitButton}</div>
      </form>
    </>
  );
}

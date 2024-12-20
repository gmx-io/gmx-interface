import { t } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useState } from "react";

import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
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
import type { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarketIndexName,
  getGlvOrMarketAddress,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { TokenData, convertToUsd, getTokenData } from "domain/synthetics/tokens";
import { useAvailableTokenOptions } from "domain/synthetics/trade";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { Token, getMinResidualAmount } from "domain/tokens";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import { isGlvInfo } from "domain/synthetics/markets/glv";

import { bigMath } from "lib/bigmath";
import { useChainId } from "lib/chains";
import { formatAmountFree, formatTokenAmount, formatUsd, limitDecimals, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";

import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { useBestGmPoolAddressForGlv } from "components/Synthetics/MarketStats/hooks/useBestGmPoolForGlv";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import type { GmSwapBoxProps } from "../GmSwapBox";
import { showMarketToast } from "../showMarketToast";
import { Mode, Operation } from "../types";
import { useUpdateByQueryParams } from "../useUpdateByQueryParams";
import { useDepositWithdrawalAmounts } from "./useDepositWithdrawalAmounts";
import { useGmDepositWithdrawalBoxState } from "./useGmDepositWithdrawalBoxState";
import { useUpdateInputAmounts } from "./useUpdateInputAmounts";
import { useUpdateTokens } from "./useUpdateTokens";
import { Swap } from "../Swap";
import { InfoRows } from "./InfoRows";
import { useDepositWithdrawalFees } from "./useDepositWithdrawalFees";
import { useSubmitButtonState } from "./useSubmitButtonState";

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
  const isMetamaskMobile = useIsMetamaskMobile();
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
  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices?.maxPrice);

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

  const marketTokenInputShowMaxButton = useMemo(() => {
    if (!isWithdrawal) {
      return false;
    }

    if (glvInfo) {
      return Boolean(glvToken?.balance && (glvTokenAmount === undefined || glvTokenAmount !== glvToken.balance));
    }

    return Boolean(
      marketToken?.balance && (marketTokenAmount === undefined || marketTokenAmount !== marketToken.balance)
    );
  }, [isWithdrawal, glvInfo, glvToken, glvTokenAmount, marketToken, marketTokenAmount]);

  const receiveTokenFormatted = useMemo(() => {
    const usedMarketToken = glvInfo ? glvToken : marketToken;

    return formatTokenAmount(usedMarketToken?.balance, usedMarketToken?.decimals, "", {
      useCommas: true,
    });
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
    let formattedTokenAmount;

    if (glvInfo && glvToken?.balance) {
      formattedTokenAmount = formatAmountFree(glvToken.balance, glvToken.decimals);
    } else if (marketToken?.balance) {
      formattedTokenAmount = formatAmountFree(marketToken.balance, marketToken.decimals);
    }

    if (!formattedTokenAmount) {
      return;
    }

    const finalAmount = isMetamaskMobile
      ? limitDecimals(formattedTokenAmount, MAX_METAMASK_MOBILE_DECIMALS)
      : formattedTokenAmount;
    setMarketOrGlvTokenInputValue(finalAmount);
    setFocusedInput("market");
  }, [
    isMetamaskMobile,
    marketToken?.balance,
    marketToken?.decimals,
    setFocusedInput,
    setMarketOrGlvTokenInputValue,
    glvInfo,
    glvToken,
  ]);

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
      showMarketToast(marketInfo);
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
            topLeftValue={receiveTokenUsd ? formatUsd(receiveTokenUsd) : ""}
            topRightLabel={t`Balance`}
            topRightValue={receiveTokenFormatted}
            preventFocusOnLabelClick="right"
            showMaxButton={marketTokenInputShowMaxButton}
            inputValue={marketOrGlvTokenInputValue}
            onInputValueChange={marketOrGlvTokenInputValueChange}
            onClickTopRightLabel={marketTokenInputClickTopRightLabel}
            onClickMax={marketTokenInputClickMax}
          >
            <PoolSelector
              chainId={chainId}
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
              favoriteKey="gm-token-receive-pay-selector"
            />
          </BuyInputSection>
        </div>

        <InfoRows
          indexName={indexName}
          marketAddress={marketAddress}
          marketTokensData={marketTokensData}
          isDeposit={isDeposit}
          fees={fees}
          glvInfo={glvInfo}
          executionFee={executionFee}
          isHighPriceImpact={isHighPriceImpact}
          disablePoolSelector={fromMarketTokenInputState !== undefined}
          selectedMarketForGlv={selectedMarketForGlv}
          isHighPriceImpactAccepted={isHighPriceImpactAccepted}
          setIsHighPriceImpactAccepted={setIsHighPriceImpactAccepted}
          isSingle={isSingle}
          onMarketChange={glvInfo ? onMarketChange : onGlvOrMarketChange}
        />

        {((submitState.tokensToApprove && submitState.tokensToApprove.length > 0) ||
          highExecutionFeeAcknowledgement) && <div className="App-card-divider " />}

        {submitState.tokensToApprove && submitState.tokensToApprove.length > 0 && (
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

        {highExecutionFeeAcknowledgement ? (
          <div className="GmConfirmationBox-high-fee">{highExecutionFeeAcknowledgement}</div>
        ) : null}

        <div className="Exchange-swap-button-container">{submitButton}</div>
      </form>
    </>
  );
}

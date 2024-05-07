import { t, Trans } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { BigNumber } from "ethers";
import { isAddress } from "ethers/lib/utils.js";
import mapValues from "lodash/mapValues";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { useHistory } from "react-router-dom";

import { HIGH_PRICE_IMPACT_BPS } from "config/factors";
import { getSyntheticsDepositIndexTokenKey, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY } from "config/localStorage";
import { convertTokenAddress, getTokenBySymbolSafe, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";
import { useHasOutdatedUi } from "domain/legacy";
import {
  estimateExecuteDepositGasLimit,
  estimateExecuteWithdrawalGasLimit,
  FeeItem,
  getExecutionFee,
  getFeeItem,
  getTotalFeeItem,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import useUiFeeFactor from "domain/synthetics/fees/utils/useUiFeeFactor";
import { useMarketTokensData } from "domain/synthetics/markets";
import { Market, MarketsInfoData } from "domain/synthetics/markets/types";
import {
  getAvailableUsdLiquidityForCollateral,
  getMarketIndexName,
  getMarketPoolName,
  getTokenPoolType,
} from "domain/synthetics/markets/utils";
import { convertToUsd, getTokenData, TokenData, TokensData } from "domain/synthetics/tokens";
import { GmSwapFees, useAvailableTokenOptions } from "domain/synthetics/trade";
import useSortedPoolsWithIndexToken from "domain/synthetics/trade/useSortedPoolsWithIndexToken";
import { getDepositAmounts } from "domain/synthetics/trade/utils/deposit";
import { getCommonError, getGmSwapError } from "domain/synthetics/trade/utils/validation";
import { getWithdrawalAmounts } from "domain/synthetics/trade/utils/withdrawal";
import { getMinResidualAmount, Token } from "domain/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { BN_ZERO, formatAmountFree, formatTokenAmount, formatUsd, limitDecimals, parseValue } from "lib/numbers";
import { getByKey, getMatchingValueFromObject } from "lib/objects";
import { useSafeState } from "lib/useSafeState";
import useSearchParams from "lib/useSearchParams";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { PoolSelector } from "components/MarketSelector/PoolSelector";
import { GmFees } from "components/Synthetics/GmSwap/GmFees/GmFees";
import { NetworkFeeRow } from "components/Synthetics/NetworkFeeRow/NetworkFeeRow";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import Tab from "components/Tab/Tab";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { GmConfirmationBox } from "../GmConfirmationBox/GmConfirmationBox";
import { getGmSwapBoxAvailableModes } from "./getGmSwapBoxAvailableModes";

import "./GmSwapBox.scss";

type SearchParams = {
  market?: string;
  operation?: string;
  mode?: string;
  from?: string;
  pool?: string;
  scroll?: string;
};

export enum Operation {
  Deposit = "Deposit",
  Withdrawal = "Withdrawal",
}

export enum Mode {
  Single = "Single",
  Pair = "Pair",
}

type Props = {
  selectedMarketAddress?: string;
  markets: Market[];
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  onSelectMarket: (marketAddress: string) => void;
  operation: Operation;
  mode: Mode;
  setMode: Dispatch<SetStateAction<Mode>>;
  setOperation: Dispatch<SetStateAction<Operation>>;
};

const OPERATION_LABELS = {
  [Operation.Deposit]: /*i18n*/ "Buy GM",
  [Operation.Withdrawal]: /*i18n*/ "Sell GM",
};

const MODE_LABELS = {
  [Mode.Single]: /*i18n*/ "Single",
  [Mode.Pair]: /*i18n*/ "Pair",
};

export function GmSwapBox(p: Props) {
  const { operation, mode, setMode, setOperation, onSelectMarket, marketsInfoData, tokensData } = p;
  const { i18n } = useLingui();
  const isMetamaskMobile = useIsMetamaskMobile();
  const history = useHistory();
  const { openConnectModal } = useConnectModal();
  const searchParams = useSearchParams<SearchParams>();
  const marketAddress = p.selectedMarketAddress;
  const { shouldDisableValidationForTesting } = useSettings();

  const { chainId } = useChainId();
  const { account } = useWallet();

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices?.maxPrice);

  const uiFeeFactor = useUiFeeFactor(chainId);

  const gasLimits = useGasLimits(chainId);
  const gasPrice = useGasPrice(chainId);

  const { data: hasOutdatedUi } = useHasOutdatedUi();
  const { marketTokensData: depositMarketTokensData } = useMarketTokensData(chainId, { isDeposit: true });
  const { marketTokensData: withdrawalMarketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const [focusedInput, setFocusedInput] = useState<"longCollateral" | "shortCollateral" | "market">("market");
  const [stage, setStage] = useState<"swap" | "confirmation" | "processing">();
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);
  const { marketsInfo: sortedMarketsInfoByIndexToken } = useSortedPoolsWithIndexToken(
    marketsInfoData,
    depositMarketTokensData
  );

  const isDeposit = operation === Operation.Deposit;
  const isWithdrawal = operation === Operation.Withdrawal;
  const isSingle = mode === Mode.Single;
  const isPair = mode === Mode.Pair;

  const marketTokensData = isDeposit ? depositMarketTokensData : withdrawalMarketTokensData;
  const markets = useMemo(
    () => Object.values(marketsInfoData || {}).filter((marketInfo) => !marketInfo.isDisabled),
    [marketsInfoData]
  );
  const marketInfo = getByKey(marketsInfoData, marketAddress);
  const availableModes = getGmSwapBoxAvailableModes(operation, marketInfo);

  const [indexName, setIndexName] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsDepositIndexTokenKey(chainId),
    undefined
  );
  const { infoTokens } = useAvailableTokenOptions(chainId, { marketsInfoData, tokensData });

  const [firstTokenAddress, setFirstTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, marketAddress, "first"],
    undefined
  );

  const firstToken = getTokenData(tokensData, firstTokenAddress);
  const [firstTokenInputValue, setFirstTokenInputValue] = useSafeState<string>("");
  let firstTokenAmount = parseValue(firstTokenInputValue, firstToken?.decimals || 0);
  const firstTokenUsd = convertToUsd(
    firstTokenAmount,
    firstToken?.decimals,
    isDeposit ? firstToken?.prices?.minPrice : firstToken?.prices?.maxPrice
  );

  const [secondTokenAddress, setSecondTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY, isDeposit, marketAddress, "second"],
    undefined
  );
  const secondToken = getTokenData(tokensData, secondTokenAddress);
  const [secondTokenInputValue, setSecondTokenInputValue] = useSafeState<string>("");
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
      amount?: BigNumber;
      usd?: BigNumber;
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

  const tokenOptions: Token[] = (function getTokenOptions() {
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
  })();

  const [marketTokenInputValue, setMarketTokenInputValue] = useSafeState<string>();
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

  const depositAmounts = useMemo(() => {
    if (!isDeposit || !marketInfo || !marketToken) {
      return undefined;
    }

    const longTokenAmount =
      (marketInfo.isSameCollaterals ? longTokenInputState?.amount?.div(2) : longTokenInputState?.amount) || BN_ZERO;
    const shortTokenAmount =
      (marketInfo.isSameCollaterals
        ? longTokenInputState?.amount?.sub(longTokenAmount)
        : shortTokenInputState?.amount) || BN_ZERO;

    return getDepositAmounts({
      marketInfo,
      marketToken,
      longToken: marketInfo.longToken,
      shortToken: marketInfo.shortToken,
      longTokenAmount,
      shortTokenAmount,
      marketTokenAmount,
      includeLongToken: Boolean(longTokenInputState?.address),
      includeShortToken: Boolean(shortTokenInputState?.address),
      uiFeeFactor,
      strategy: focusedInput === "market" ? "byMarketToken" : "byCollaterals",
    });
  }, [
    focusedInput,
    isDeposit,
    longTokenInputState?.address,
    longTokenInputState?.amount,
    marketInfo,
    marketToken,
    marketTokenAmount,
    shortTokenInputState?.address,
    shortTokenInputState?.amount,
    uiFeeFactor,
  ]);

  const withdrawalAmounts = useMemo(() => {
    if (!isWithdrawal || !marketInfo || !marketToken) {
      return undefined;
    }

    let strategy;
    if (focusedInput === "market") {
      strategy = "byMarketToken";
    } else if (focusedInput === "longCollateral") {
      strategy = "byLongCollateral";
    } else {
      strategy = "byShortCollateral";
    }

    const longTokenAmount = marketInfo.isSameCollaterals
      ? longTokenInputState?.amount?.div(2) || BN_ZERO
      : longTokenInputState?.amount || BN_ZERO;
    const shortTokenAmount = marketInfo.isSameCollaterals
      ? longTokenInputState?.amount?.sub(longTokenAmount) || BN_ZERO
      : shortTokenInputState?.amount || BN_ZERO;

    return getWithdrawalAmounts({
      marketInfo,
      marketToken,
      marketTokenAmount,
      longTokenAmount,
      shortTokenAmount,
      strategy,
      uiFeeFactor,
    });
  }, [
    focusedInput,
    isWithdrawal,
    longTokenInputState?.amount,
    marketInfo,
    marketToken,
    marketTokenAmount,
    shortTokenInputState?.amount,
    uiFeeFactor,
  ]);

  const amounts = isDeposit ? depositAmounts : withdrawalAmounts;

  const { fees, executionFee } = useMemo(() => {
    if (!gasLimits || !gasPrice || !tokensData || !amounts) {
      return {};
    }

    const basisUsd = isDeposit
      ? BigNumber.from(0)
          .add(amounts?.longTokenUsd || 0)
          .add(amounts?.shortTokenUsd || 0)
      : amounts?.marketTokenUsd || BigNumber.from(0);

    const swapFee = getFeeItem(amounts.swapFeeUsd?.mul(-1), basisUsd);
    const swapPriceImpact = getFeeItem(amounts.swapPriceImpactDeltaUsd, basisUsd);
    const uiFee = getFeeItem(amounts.uiFeeUsd.mul(-1), basisUsd, {
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

    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, gasLimit, gasPrice);

    return {
      fees,
      executionFee,
    };
  }, [amounts, chainId, gasLimits, gasPrice, isDeposit, tokensData]);

  const isHighPriceImpact =
    fees?.swapPriceImpact?.deltaUsd.lt(0) && fees.swapPriceImpact.bps.abs().gte(HIGH_PRICE_IMPACT_BPS);

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
    account,
    amounts?.longTokenAmount,
    amounts?.longTokenUsd,
    amounts?.marketTokenUsd,
    amounts?.shortTokenAmount,
    amounts?.shortTokenUsd,
    chainId,
    fees,
    hasOutdatedUi,
    isDeposit,
    isHighPriceImpact,
    isHighPriceImpactAccepted,
    longCollateralLiquidityUsd,
    marketInfo,
    marketToken,
    marketTokenAmount,
    openConnectModal,
    shortCollateralLiquidityUsd,
    shouldDisableValidationForTesting,
    longTokenInputState?.token,
    shortTokenInputState?.token,
  ]);

  function onFocusedCollateralInputChange(tokenAddress: string) {
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
  }

  const resetInputs = useCallback(() => {
    setFirstTokenInputValue("");
    setSecondTokenInputValue("");
    setMarketTokenInputValue("");
  }, [setFirstTokenInputValue, setMarketTokenInputValue, setSecondTokenInputValue]);

  const onSwitchSide = useCallback(() => {
    setFocusedInput("market");
    resetInputs();
    setOperation(operation === Operation.Deposit ? Operation.Withdrawal : Operation.Deposit);
  }, [operation, resetInputs, setOperation]);

  const onOperationChange = useCallback(
    (operation: Operation) => {
      resetInputs();
      setOperation(operation);
    },
    [resetInputs, setOperation]
  );

  const onMarketChange = useCallback(
    (marketAddress: string) => {
      resetInputs();
      onSelectMarket(marketAddress);
    },
    [onSelectMarket, resetInputs]
  );

  useEffect(
    function updateInputAmounts() {
      if (!marketToken || !marketInfo) {
        return;
      }

      const longToken = longTokenInputState?.token;
      const shortToken = shortTokenInputState?.token;

      if (isDeposit) {
        if (["longCollateral", "shortCollateral"].includes(focusedInput)) {
          if (!amounts?.longTokenUsd?.gt(0) && !amounts?.shortTokenUsd?.gt(0)) {
            setMarketTokenInputValue("");
            return;
          }

          if (amounts) {
            setMarketTokenInputValue(
              amounts.marketTokenAmount.gt(0) ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
            );
          }
        } else if (focusedInput === "market") {
          if (!marketTokenAmount?.gt(0)) {
            longTokenInputState?.setValue("");
            shortTokenInputState?.setValue("");
            return;
          }

          if (amounts) {
            if (longToken) {
              longTokenInputState?.setValue(
                amounts.longTokenAmount?.gt(0) ? formatAmountFree(amounts.longTokenAmount, longToken.decimals) : ""
              );
            }
            if (shortToken) {
              shortTokenInputState?.setValue(
                amounts.shortTokenAmount?.gt(0) ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
              );
            }
            return;
          }
        }

        return;
      }

      if (isWithdrawal) {
        if (focusedInput === "market") {
          if (!amounts?.marketTokenAmount?.gt(0)) {
            longTokenInputState?.setValue("");
            shortTokenInputState?.setValue("");
            return;
          }

          if (amounts) {
            if (marketInfo.isSameCollaterals) {
              if (longToken) {
                setFirstTokenInputValue(
                  amounts.longTokenAmount?.gt(0)
                    ? formatAmountFree(amounts.longTokenAmount.add(amounts.shortTokenAmount), longToken.decimals)
                    : ""
                );
              }
            } else {
              if (longToken) {
                longTokenInputState?.setValue(
                  amounts.longTokenAmount?.gt(0) ? formatAmountFree(amounts.longTokenAmount, longToken.decimals) : ""
                );
              }
              if (shortToken) {
                shortTokenInputState?.setValue(
                  amounts.shortTokenAmount?.gt(0) ? formatAmountFree(amounts.shortTokenAmount, shortToken.decimals) : ""
                );
              }
            }
          }
        } else if (["longCollateral", "shortCollateral"].includes(focusedInput)) {
          if (focusedInput === "longCollateral" && !amounts?.longTokenAmount?.gt(0)) {
            shortTokenInputState?.setValue("");
            setMarketTokenInputValue("");
            return;
          }

          if (focusedInput === "shortCollateral" && !amounts?.shortTokenAmount?.gt(0)) {
            longTokenInputState?.setValue("");
            setMarketTokenInputValue("");
            return;
          }

          if (amounts) {
            setMarketTokenInputValue(
              amounts.marketTokenAmount.gt(0) ? formatAmountFree(amounts.marketTokenAmount, marketToken.decimals) : ""
            );
            if (marketInfo.isSameCollaterals) {
              if (longToken) {
                longTokenInputState?.setValue(
                  formatAmountFree(amounts.longTokenAmount.add(amounts.shortTokenAmount), longToken.decimals)
                );
              }
            } else {
              if (longToken) {
                longTokenInputState?.setValue(formatAmountFree(amounts.longTokenAmount, longToken.decimals));
              }
              if (shortToken) {
                shortTokenInputState?.setValue(formatAmountFree(amounts.shortTokenAmount, shortToken.decimals));
              }
            }
          }
        }
      }
    },
    [
      amounts,
      focusedInput,
      isDeposit,
      isWithdrawal,
      longTokenInputState,
      marketInfo,
      marketToken,
      marketTokenAmount,
      setFirstTokenInputValue,
      setMarketTokenInputValue,
      setSecondTokenInputValue,
      shortTokenInputState,
    ]
  );

  useEffect(
    function updateIndexToken() {
      if (!indexName && markets.length) {
        setIndexName(getMarketIndexName(markets[0]));
      }
    },
    [indexName, markets, setIndexName]
  );

  useEffect(
    function updateMarket() {
      const marketsByIndexName = markets.filter((market) => getMarketIndexName(market) === indexName);

      if (!marketsByIndexName.length) {
        return;
      }

      if (!marketAddress || !marketsByIndexName.find((market) => market.marketTokenAddress === marketAddress)) {
        onMarketChange(marketsByIndexName[0].marketTokenAddress);
      }
    },
    [indexName, marketAddress, markets, onMarketChange]
  );

  useEffect(
    function updateByQueryParams() {
      const { market: marketRaw, operation, mode, from: fromToken, pool, scroll } = searchParams;
      const marketAddress = marketRaw?.toLowerCase();

      if (operation) {
        let finalOperation;

        if (operation.toLowerCase() === "buy") {
          finalOperation = Operation.Deposit;
        } else if (operation.toLowerCase() === "sell") {
          finalOperation = Operation.Withdrawal;
        }

        if (finalOperation) {
          setOperation(finalOperation as Operation);
        }
      }

      if (mode) {
        const validMode = getMatchingValueFromObject(Mode, mode);
        if (validMode) {
          setMode(validMode as Mode);
        }
      }

      if (fromToken) {
        const fromTokenInfo = getTokenBySymbolSafe(chainId, fromToken, {
          version: "v2",
        });
        if (fromTokenInfo) {
          setFirstTokenAddress(convertTokenAddress(chainId, fromTokenInfo.address, "wrapped"));
        }
      }

      if (scroll === "1") {
        window.scrollTo({ top: 0, left: 0 });
      }

      if ((marketAddress || pool) && markets.length > 0) {
        if (marketAddress && isAddress(marketAddress)) {
          const marketInfo = markets.find((market) => market.marketTokenAddress.toLowerCase() === marketAddress);
          if (marketInfo) {
            setIndexName(getMarketIndexName(marketInfo));
            onSelectMarket(marketInfo.marketTokenAddress);
            const indexName = getMarketIndexName(marketInfo);
            const poolName = getMarketPoolName(marketInfo);
            helperToast.success(
              <Trans>
                <div className="inline-flex">
                  GM:&nbsp;<span>{indexName}</span>
                  <span className="subtext gm-toast leading-1">[{poolName}]</span>
                </div>{" "}
                <span>selected in order form</span>
              </Trans>
            );
          }
        }

        if (history.location.search) {
          history.replace({ search: "" });
        }
      }

      if (!marketAddress && !pool) {
        if (history.location.search) {
          history.replace({ search: "" });
        }
      }
    },
    [history, onSelectMarket, searchParams, setIndexName, setOperation, setMode, setFirstTokenAddress, chainId, markets]
  );

  useEffect(
    function updateTokens() {
      if (!tokenOptions.length) return;

      if (!tokenOptions.find((token) => token.address === firstTokenAddress)) {
        setFirstTokenAddress(tokenOptions[0].address);
      }

      if (isSingle && secondTokenAddress && marketInfo && secondTokenAmount?.gt(0)) {
        const secondTokenPoolType = getTokenPoolType(marketInfo, secondTokenAddress);
        setFocusedInput(secondTokenPoolType === "long" ? "longCollateral" : "shortCollateral");
        setSecondTokenAddress(undefined);
        setSecondTokenInputValue("");
        return;
      }

      if (isPair && firstTokenAddress) {
        if (marketInfo?.isSameCollaterals) {
          if (!secondTokenAddress || firstTokenAddress !== secondTokenAddress) {
            setSecondTokenAddress(firstTokenAddress);
          }

          return;
        }

        if (
          !secondTokenAddress ||
          !tokenOptions.find((token) => token.address === secondTokenAddress) ||
          convertTokenAddress(chainId, firstTokenAddress, "wrapped") ===
            convertTokenAddress(chainId, secondTokenAddress, "wrapped")
        ) {
          const secondToken = tokenOptions.find((token) => {
            return (
              convertTokenAddress(chainId, token.address, "wrapped") !==
              convertTokenAddress(chainId, firstTokenAddress, "wrapped")
            );
          });
          setSecondTokenAddress(secondToken?.address);
        }
      }
    },
    [
      chainId,
      firstTokenAddress,
      isPair,
      isSingle,
      marketInfo,
      secondTokenAddress,
      secondTokenAmount,
      setFirstTokenAddress,
      setSecondTokenAddress,
      setSecondTokenInputValue,
      tokenOptions,
    ]
  );

  function onMaxClickFirstToken() {
    if (firstToken?.balance) {
      let maxAvailableAmount = firstToken.isNative
        ? firstToken.balance.sub(minResidualAmount || 0)
        : firstToken.balance;

      if (maxAvailableAmount.isNegative()) {
        maxAvailableAmount = BigNumber.from(0);
      }

      const formattedMaxAvailableAmount = formatAmountFree(maxAvailableAmount, firstToken.decimals);
      const finalAmount = isMetamaskMobile
        ? limitDecimals(formattedMaxAvailableAmount, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedMaxAvailableAmount;

      setFirstTokenInputValue(finalAmount);
      onFocusedCollateralInputChange(firstToken.address);
    }
  }

  function onMaxClickSecondToken() {
    if (secondToken?.balance) {
      let maxAvailableAmount = secondToken.isNative
        ? secondToken.balance.sub(minResidualAmount || 0)
        : secondToken.balance;

      if (maxAvailableAmount.isNegative()) {
        maxAvailableAmount = BigNumber.from(0);
      }

      const formattedMaxAvailableAmount = formatAmountFree(maxAvailableAmount, secondToken.decimals);
      const finalAmount = isMetamaskMobile
        ? limitDecimals(formattedMaxAvailableAmount, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedMaxAvailableAmount;
      setSecondTokenInputValue(finalAmount);
      onFocusedCollateralInputChange(secondToken.address);
    }
  }

  const { localizedOperationLabels, localizedModeLabels } = useMemo(() => {
    return {
      localizedOperationLabels: mapValues(OPERATION_LABELS, (label) => i18n._(label)),
      localizedModeLabels: mapValues(MODE_LABELS, (label) => i18n._(label)),
    };
  }, [i18n]);

  return (
    <div className={`App-box GmSwapBox`}>
      <Tab
        options={Object.values(Operation)}
        optionLabels={localizedOperationLabels}
        option={operation}
        onChange={onOperationChange}
        className="Exchange-swap-option-tabs"
      />

      <Tab
        options={availableModes}
        optionLabels={localizedModeLabels}
        className="GmSwapBox-asset-options-tabs"
        type="inline"
        option={mode}
        onChange={setMode}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitState.onSubmit();
        }}
      >
        <div className={cx("GmSwapBox-form-layout", { reverse: isWithdrawal })}>
          <BuyInputSection
            topLeftLabel={isDeposit ? t`Pay` : t`Receive`}
            topLeftValue={formatUsd(firstTokenUsd)}
            topRightLabel={t`Balance`}
            topRightValue={formatTokenAmount(firstToken?.balance, firstToken?.decimals, "", {
              useCommas: true,
            })}
            preventFocusOnLabelClick="right"
            {...(isDeposit && {
              onClickTopRightLabel: onMaxClickFirstToken,
            })}
            showMaxButton={
              isDeposit &&
              firstToken?.balance?.gt(0) &&
              !firstTokenAmount?.eq(firstToken.balance) &&
              (firstToken?.isNative ? minResidualAmount && firstToken?.balance?.gt(minResidualAmount) : true)
            }
            inputValue={firstTokenInputValue}
            onInputValueChange={(e) => {
              if (firstToken) {
                setFirstTokenInputValue(e.target.value);
                onFocusedCollateralInputChange(firstToken.address);
              }
            }}
            onClickMax={onMaxClickFirstToken}
          >
            {firstTokenAddress && isSingle ? (
              <TokenSelector
                label={isDeposit ? t`Pay` : t`Receive`}
                chainId={chainId}
                tokenAddress={firstTokenAddress}
                onSelectToken={(token) => setFirstTokenAddress(token.address)}
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
              showMaxButton={
                isDeposit &&
                secondToken?.balance?.gt(0) &&
                !secondTokenAmount?.eq(secondToken.balance) &&
                (secondToken?.isNative ? minResidualAmount && secondToken?.balance?.gt(minResidualAmount) : true)
              }
              onInputValueChange={(e) => {
                if (secondToken) {
                  setSecondTokenInputValue(e.target.value);
                  onFocusedCollateralInputChange(secondToken.address);
                }
              }}
              {...(isDeposit && {
                onClickTopRightLabel: onMaxClickSecondToken,
              })}
              onClickMax={onMaxClickSecondToken}
            >
              <div className="selected-token">
                <TokenWithIcon symbol={secondToken?.symbol} displaySize={20} />
              </div>
            </BuyInputSection>
          )}

          <div className="AppOrder-ball-container" onClick={onSwitchSide}>
            <div className="AppOrder-ball">
              <IoMdSwap className="Exchange-swap-ball-icon" />
            </div>
          </div>

          <BuyInputSection
            topLeftLabel={isWithdrawal ? t`Pay` : t`Receive`}
            topLeftValue={marketTokenUsd?.gt(0) ? formatUsd(marketTokenUsd) : ""}
            topRightLabel={t`Balance`}
            topRightValue={formatTokenAmount(marketToken?.balance, marketToken?.decimals, "", {
              useCommas: true,
            })}
            preventFocusOnLabelClick="right"
            showMaxButton={isWithdrawal && marketToken?.balance?.gt(0) && !marketTokenAmount?.eq(marketToken.balance)}
            inputValue={marketTokenInputValue}
            onInputValueChange={(e) => {
              setMarketTokenInputValue(e.target.value);
              setFocusedInput("market");
            }}
            {...(isWithdrawal && {
              onClickTopRightLabel: () => {
                if (marketToken?.balance) {
                  setMarketTokenInputValue(formatAmountFree(marketToken.balance, marketToken.decimals));
                  setFocusedInput("market");
                }
              },
            })}
            onClickMax={() => {
              if (marketToken?.balance) {
                const formattedGMBalance = formatAmountFree(marketToken.balance, marketToken.decimals);
                const finalGMBalance = isMetamaskMobile
                  ? limitDecimals(formattedGMBalance, MAX_METAMASK_MOBILE_DECIMALS)
                  : formattedGMBalance;
                setMarketTokenInputValue(finalGMBalance);
                setFocusedInput("market");
              }
            }}
          >
            <PoolSelector
              label={t`Pool`}
              className="SwapBox-info-dropdown"
              selectedIndexName={indexName}
              selectedMarketAddress={marketAddress}
              markets={sortedMarketsInfoByIndexToken}
              marketTokensData={marketTokensData}
              isSideMenu
              showBalances
              showAllPools
              showIndexIcon
              onSelectMarket={(marketInfo) => {
                setIndexName(getMarketIndexName(marketInfo));
                onMarketChange(marketInfo.marketTokenAddress);
                showMarketToast(marketInfo);
              }}
            />
          </BuyInputSection>
        </div>

        <ExchangeInfo className="GmSwapBox-info-section" dividerClassName="App-card-divider">
          <ExchangeInfo.Group>
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Pool`}
              value={
                <PoolSelector
                  label={t`Pool`}
                  className="SwapBox-info-dropdown"
                  selectedIndexName={indexName}
                  selectedMarketAddress={marketAddress}
                  markets={markets}
                  marketTokensData={marketTokensData}
                  isSideMenu
                  showBalances
                  onSelectMarket={(marketInfo) => {
                    onMarketChange(marketInfo.marketTokenAddress);
                    showMarketToast(marketInfo);
                  }}
                />
              }
            />
          </ExchangeInfo.Group>

          <ExchangeInfo.Group>
            <div className="GmSwapBox-info-section">
              <GmFees
                isDeposit={isDeposit}
                totalFees={fees?.totalFees}
                swapFee={fees?.swapFee}
                swapPriceImpact={fees?.swapPriceImpact}
                uiFee={fees?.uiFee}
              />
              <NetworkFeeRow executionFee={executionFee} />
            </div>
          </ExchangeInfo.Group>

          {isHighPriceImpact && (
            <ExchangeInfo.Group>
              <Checkbox
                className="GmSwapBox-warning"
                asRow
                isChecked={isHighPriceImpactAccepted}
                setIsChecked={setIsHighPriceImpactAccepted}
              >
                {isSingle ? (
                  <Tooltip
                    className="warning-tooltip"
                    handle={<Trans>Acknowledge high Price Impact</Trans>}
                    position="top-start"
                    renderContent={() => (
                      <div>{t`Consider selecting and using the "Pair" option to reduce the Price Impact.`}</div>
                    )}
                  />
                ) : (
                  <span className="muted text-14 text-yellow">
                    <Trans>Acknowledge high Price Impact</Trans>
                  </span>
                )}
              </Checkbox>
            </ExchangeInfo.Group>
          )}
        </ExchangeInfo>

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
        marketTokenAmount={amounts?.marketTokenAmount ?? BigNumber.from(0)}
        marketTokenUsd={amounts?.marketTokenUsd ?? BigNumber.from(0)}
        longTokenAmount={amounts?.longTokenAmount}
        longTokenUsd={amounts?.longTokenUsd}
        shortTokenAmount={amounts?.shortTokenAmount}
        shortTokenUsd={amounts?.shortTokenUsd}
        fees={fees!}
        error={submitState.error}
        isDeposit={isDeposit}
        executionFee={executionFee}
        onSubmitted={() => {
          setStage("swap");
        }}
        onClose={() => {
          setStage("swap");
        }}
        shouldDisableValidation={shouldDisableValidationForTesting}
      />
    </div>
  );
}

function showMarketToast(market) {
  if (!market) return;
  const indexName = getMarketIndexName(market);
  const poolName = getMarketPoolName(market);
  helperToast.success(
    <Trans>
      <div className="inline-flex">
        GM:&nbsp;<span>{indexName}</span>
        <span className="subtext gm-toast">[{poolName}]</span>
      </div>{" "}
      <span>selected in order form</span>
    </Trans>
  );
}

import React, { useEffect, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import useSWR from "swr";
import { ethers } from "ethers";
import cx from "classnames";

import {
  FUNDING_RATE_PRECISION,
  BASIS_POINTS_DIVISOR,
  MARGIN_FEE_BASIS_POINTS,
  SWAP,
  LONG,
  SHORT,
  USD_DECIMALS,
  getPositionKey,
  getPositionContractKey,
  getLeverage,
  getDeltaStr,
  useAccountOrders,
  getPageTitle,
} from "lib/legacy";
import { getConstant, getExplorerUrl } from "config/chains";
import { approvePlugin, useMinExecutionFee, cancelMultipleOrders } from "domain/legacy";

import { getContract } from "config/contracts";

import Reader from "abis/ReaderV2.json";
import VaultV2 from "abis/VaultV2.json";
import Router from "abis/Router.json";
import Token from "abis/Token.json";

import Checkbox from "components/Checkbox/Checkbox";
import SwapBox from "components/Exchange/SwapBox";
import ExchangeTVChart, { getChartToken } from "components/Exchange/ExchangeTVChart";
import PositionsList from "components/Exchange/PositionsList";
import OrdersList from "components/Exchange/OrdersList";
import TradeHistory from "components/Exchange/TradeHistory";
import ExchangeWalletTokens from "components/Exchange/ExchangeWalletTokens";
import ExchangeBanner from "components/Exchange/ExchangeBanner";
import Tab from "components/Tab/Tab";
import Footer from "components/Footer/Footer";

import "./Exchange.css";
import { contractFetcher } from "lib/contracts";
import { useInfoTokens } from "domain/tokens";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import { helperToast } from "lib/helperToast";
import { getTokenInfo } from "domain/tokens/utils";
import { bigNumberify, formatAmount } from "lib/numbers";
import { getToken, getTokenBySymbol, getTokens, getWhitelistedTokens } from "config/tokens";
import { useChainId } from "lib/chains";
const { AddressZero } = ethers.constants;

const PENDING_POSITION_VALID_DURATION = 600 * 1000;
const UPDATED_POSITION_VALID_DURATION = 60 * 1000;

const notifications = {};

function pushSuccessNotification(chainId, message, e) {
  const { transactionHash } = e;
  const id = ethers.utils.id(message + transactionHash);
  if (notifications[id]) {
    return;
  }

  notifications[id] = true;

  const txUrl = getExplorerUrl(chainId) + "tx/" + transactionHash;
  helperToast.success(
    <div>
      {message}{" "}
      <a href={txUrl} target="_blank" rel="noopener noreferrer">
        View
      </a>
    </div>
  );
}

function pushErrorNotification(chainId, message, e) {
  const { transactionHash } = e;
  const id = ethers.utils.id(message + transactionHash);
  if (notifications[id]) {
    return;
  }

  notifications[id] = true;

  const txUrl = getExplorerUrl(chainId) + "tx/" + transactionHash;
  helperToast.error(
    <div>
      {message}{" "}
      <a href={txUrl} target="_blank" rel="noopener noreferrer">
        View
      </a>
    </div>
  );
}

function getFundingFee(data) {
  let { entryFundingRate, cumulativeFundingRate, size } = data;
  if (entryFundingRate && cumulativeFundingRate) {
    return size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION);
  }
  return;
}

const getTokenAddress = (token, nativeTokenAddress) => {
  if (token.address === AddressZero) {
    return nativeTokenAddress;
  }
  return token.address;
};

function applyPendingChanges(position, pendingPositions) {
  if (!pendingPositions) {
    return;
  }
  const { key } = position;

  if (
    pendingPositions[key] &&
    pendingPositions[key].updatedAt &&
    pendingPositions[key].pendingChanges &&
    pendingPositions[key].updatedAt + PENDING_POSITION_VALID_DURATION > Date.now()
  ) {
    const { pendingChanges } = pendingPositions[key];
    if (pendingChanges.size && position.size.eq(pendingChanges.size)) {
      return;
    }

    if (pendingChanges.expectingCollateralChange && !position.collateral.eq(pendingChanges.collateralSnapshot)) {
      return;
    }

    position.hasPendingChanges = true;
    position.pendingChanges = pendingChanges;
  }
}

export function getPositions(
  chainId,
  positionQuery,
  positionData,
  infoTokens,
  includeDelta,
  showPnlAfterFees,
  account,
  pendingPositions,
  updatedPositions
) {
  const propsLength = getConstant(chainId, "positionReaderPropsLength");
  const positions = [];
  const positionsMap = {};
  if (!positionData) {
    return { positions, positionsMap };
  }
  const { collateralTokens, indexTokens, isLong } = positionQuery;
  for (let i = 0; i < collateralTokens.length; i++) {
    const collateralToken = getTokenInfo(infoTokens, collateralTokens[i], true, getContract(chainId, "NATIVE_TOKEN"));
    const indexToken = getTokenInfo(infoTokens, indexTokens[i], true, getContract(chainId, "NATIVE_TOKEN"));
    const key = getPositionKey(account, collateralTokens[i], indexTokens[i], isLong[i]);
    let contractKey;
    if (account) {
      contractKey = getPositionContractKey(account, collateralTokens[i], indexTokens[i], isLong[i]);
    }

    const position = {
      key,
      contractKey,
      collateralToken,
      indexToken,
      isLong: isLong[i],
      size: positionData[i * propsLength],
      collateral: positionData[i * propsLength + 1],
      averagePrice: positionData[i * propsLength + 2],
      entryFundingRate: positionData[i * propsLength + 3],
      cumulativeFundingRate: collateralToken.cumulativeFundingRate,
      hasRealisedProfit: positionData[i * propsLength + 4].eq(1),
      realisedPnl: positionData[i * propsLength + 5],
      lastIncreasedTime: positionData[i * propsLength + 6].toNumber(),
      hasProfit: positionData[i * propsLength + 7].eq(1),
      delta: positionData[i * propsLength + 8],
      markPrice: isLong[i] ? indexToken.minPrice : indexToken.maxPrice,
    };

    if (
      updatedPositions &&
      updatedPositions[key] &&
      updatedPositions[key].updatedAt &&
      updatedPositions[key].updatedAt + UPDATED_POSITION_VALID_DURATION > Date.now()
    ) {
      const updatedPosition = updatedPositions[key];
      position.size = updatedPosition.size;
      position.collateral = updatedPosition.collateral;
      position.averagePrice = updatedPosition.averagePrice;
      position.entryFundingRate = updatedPosition.entryFundingRate;
    }

    let fundingFee = getFundingFee(position);
    position.fundingFee = fundingFee ? fundingFee : bigNumberify(0);
    position.collateralAfterFee = position.collateral.sub(position.fundingFee);

    position.closingFee = position.size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
    position.positionFee = position.size.mul(MARGIN_FEE_BASIS_POINTS).mul(2).div(BASIS_POINTS_DIVISOR);
    position.totalFees = position.positionFee.add(position.fundingFee);

    position.pendingDelta = position.delta;

    if (position.collateral.gt(0)) {
      position.hasLowCollateral =
        position.collateralAfterFee.lt(0) || position.size.div(position.collateralAfterFee.abs()).gt(50);

      if (position.averagePrice && position.markPrice) {
        const priceDelta = position.averagePrice.gt(position.markPrice)
          ? position.averagePrice.sub(position.markPrice)
          : position.markPrice.sub(position.averagePrice);
        position.pendingDelta = position.size.mul(priceDelta).div(position.averagePrice);

        position.delta = position.pendingDelta;

        if (position.isLong) {
          position.hasProfit = position.markPrice.gte(position.averagePrice);
        } else {
          position.hasProfit = position.markPrice.lte(position.averagePrice);
        }
      }

      position.deltaPercentage = position.pendingDelta.mul(BASIS_POINTS_DIVISOR).div(position.collateral);

      const { deltaStr, deltaPercentageStr } = getDeltaStr({
        delta: position.pendingDelta,
        deltaPercentage: position.deltaPercentage,
        hasProfit: position.hasProfit,
      });

      position.deltaStr = deltaStr;
      position.deltaPercentageStr = deltaPercentageStr;
      position.deltaBeforeFeesStr = deltaStr;

      let hasProfitAfterFees;
      let pendingDeltaAfterFees;

      if (position.hasProfit) {
        if (position.pendingDelta.gt(position.totalFees)) {
          hasProfitAfterFees = true;
          pendingDeltaAfterFees = position.pendingDelta.sub(position.totalFees);
        } else {
          hasProfitAfterFees = false;
          pendingDeltaAfterFees = position.totalFees.sub(position.pendingDelta);
        }
      } else {
        hasProfitAfterFees = false;
        pendingDeltaAfterFees = position.pendingDelta.add(position.totalFees);
      }

      position.hasProfitAfterFees = hasProfitAfterFees;
      position.pendingDeltaAfterFees = pendingDeltaAfterFees;
      position.deltaPercentageAfterFees = position.pendingDeltaAfterFees
        .mul(BASIS_POINTS_DIVISOR)
        .div(position.collateral);

      const { deltaStr: deltaAfterFeesStr, deltaPercentageStr: deltaAfterFeesPercentageStr } = getDeltaStr({
        delta: position.pendingDeltaAfterFees,
        deltaPercentage: position.deltaPercentageAfterFees,
        hasProfit: hasProfitAfterFees,
      });

      position.deltaAfterFeesStr = deltaAfterFeesStr;
      position.deltaAfterFeesPercentageStr = deltaAfterFeesPercentageStr;

      if (showPnlAfterFees) {
        position.deltaStr = position.deltaAfterFeesStr;
        position.deltaPercentageStr = position.deltaAfterFeesPercentageStr;
      }

      let netValue = position.hasProfit
        ? position.collateral.add(position.pendingDelta)
        : position.collateral.sub(position.pendingDelta);

      netValue = netValue.sub(position.fundingFee);

      if (showPnlAfterFees) {
        netValue = netValue.sub(position.closingFee);
      }

      position.netValue = netValue;
    }

    position.leverage = getLeverage({
      size: position.size,
      collateral: position.collateral,
      entryFundingRate: position.entryFundingRate,
      cumulativeFundingRate: position.cumulativeFundingRate,
      hasProfit: position.hasProfit,
      delta: position.delta,
      includeDelta,
    });

    positionsMap[key] = position;

    applyPendingChanges(position, pendingPositions);

    if (position.size.gt(0) || position.hasPendingChanges) {
      positions.push(position);
    }
  }

  return { positions, positionsMap };
}

export function getPositionQuery(tokens, nativeTokenAddress) {
  const collateralTokens = [];
  const indexTokens = [];
  const isLong = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.isStable) {
      continue;
    }
    if (token.isWrapped) {
      continue;
    }
    collateralTokens.push(getTokenAddress(token, nativeTokenAddress));
    indexTokens.push(getTokenAddress(token, nativeTokenAddress));
    isLong.push(true);
  }

  for (let i = 0; i < tokens.length; i++) {
    const stableToken = tokens[i];
    if (!stableToken.isStable) {
      continue;
    }

    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j];
      if (token.isStable) {
        continue;
      }
      if (token.isWrapped) {
        continue;
      }
      collateralTokens.push(stableToken.address);
      indexTokens.push(getTokenAddress(token, nativeTokenAddress));
      isLong.push(false);
    }
  }

  return { collateralTokens, indexTokens, isLong };
}

export const Exchange = forwardRef((props, ref) => {
  const {
    savedIsPnlInLeverage,
    setSavedIsPnlInLeverage,
    savedShowPnlAfterFees,
    savedSlippageAmount,
    pendingTxns,
    setPendingTxns,
    savedShouldShowPositionLines,
    setSavedShouldShowPositionLines,
    connectWallet,
    savedShouldDisableValidationForTesting,
  } = props;
  const [showBanner, setShowBanner] = useLocalStorageSerializeKey("showBanner", true);
  const [bannerHidden, setBannerHidden] = useLocalStorageSerializeKey("bannerHidden", null);

  const [pendingPositions, setPendingPositions] = useState({});
  const [updatedPositions, setUpdatedPositions] = useState({});

  const hideBanner = () => {
    const hiddenLimit = new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000);
    setBannerHidden(hiddenLimit);
    setShowBanner(false);
  };

  useEffect(() => {
    if (new Date() > new Date("2021-11-30")) {
      setShowBanner(false);
    } else {
      if (bannerHidden && new Date(bannerHidden) > new Date()) {
        setShowBanner(false);
      } else {
        setBannerHidden(null);
        setShowBanner(true);
      }
    }
  }, [showBanner, bannerHidden, setBannerHidden, setShowBanner]);

  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const currentAccount = account;

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");
  const readerAddress = getContract(chainId, "Reader");
  const usdgAddress = getContract(chainId, "USDG");

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);

  const positionQuery = getPositionQuery(whitelistedTokens, nativeTokenAddress);

  const defaultCollateralSymbol = getConstant(chainId, "defaultCollateralSymbol");
  const defaultTokenSelection = useMemo(
    () => ({
      [SWAP]: {
        from: AddressZero,
        to: getTokenBySymbol(chainId, defaultCollateralSymbol).address,
      },
      [LONG]: {
        from: AddressZero,
        to: AddressZero,
      },
      [SHORT]: {
        from: getTokenBySymbol(chainId, defaultCollateralSymbol).address,
        to: AddressZero,
      },
    }),
    [chainId, defaultCollateralSymbol]
  );

  const [tokenSelection, setTokenSelection] = useLocalStorageByChainId(
    chainId,
    "Exchange-token-selection-v2",
    defaultTokenSelection
  );
  const [swapOption, setSwapOption] = useLocalStorageByChainId(chainId, "Swap-option-v2", LONG);

  const fromTokenAddress = tokenSelection[swapOption].from;
  const toTokenAddress = tokenSelection[swapOption].to;

  const setFromTokenAddress = useCallback(
    (selectedSwapOption, address) => {
      const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection));
      newTokenSelection[selectedSwapOption].from = address;
      setTokenSelection(newTokenSelection);
    },
    [tokenSelection, setTokenSelection]
  );

  const setToTokenAddress = useCallback(
    (selectedSwapOption, address) => {
      const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection));
      newTokenSelection[selectedSwapOption].to = address;
      if (selectedSwapOption === LONG || selectedSwapOption === SHORT) {
        newTokenSelection[LONG].to = address;
        newTokenSelection[SHORT].to = address;
      }
      setTokenSelection(newTokenSelection);
    },
    [tokenSelection, setTokenSelection]
  );

  const setMarket = (selectedSwapOption, toTokenAddress) => {
    setSwapOption(selectedSwapOption);
    const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection));
    newTokenSelection[selectedSwapOption].to = toTokenAddress;
    if (selectedSwapOption === LONG || selectedSwapOption === SHORT) {
      newTokenSelection[LONG].to = toTokenAddress;
      newTokenSelection[SHORT].to = toTokenAddress;
    }
    setTokenSelection(newTokenSelection);
  };

  const [isConfirming, setIsConfirming] = useState(false);
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);

  const tokens = getTokens(chainId);

  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(active && [active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(library, Reader, [tokenAddresses]),
  });

  const { data: positionData, error: positionDataError } = useSWR(
    active && [active, chainId, readerAddress, "getPositions", vaultAddress, account],
    {
      fetcher: contractFetcher(library, Reader, [
        positionQuery.collateralTokens,
        positionQuery.indexTokens,
        positionQuery.isLong,
      ]),
    }
  );

  const positionsDataIsLoading = active && !positionData && !positionDataError;

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(library, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { data: totalTokenWeights } = useSWR(
    [`Exchange:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(library, VaultV2),
    }
  );

  const { data: usdgSupply } = useSWR([`Exchange:usdgSupply:${active}`, chainId, usdgAddress, "totalSupply"], {
    fetcher: contractFetcher(library, Token),
  });

  const orderBookAddress = getContract(chainId, "OrderBook");
  const routerAddress = getContract(chainId, "Router");
  const { data: orderBookApproved } = useSWR(
    active && [active, chainId, routerAddress, "approvedPlugins", account, orderBookAddress],
    {
      fetcher: contractFetcher(library, Router),
    }
  );

  const { data: positionRouterApproved } = useSWR(
    active && [active, chainId, routerAddress, "approvedPlugins", account, positionRouterAddress],
    {
      fetcher: contractFetcher(library, Router),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances, fundingRateInfo);
  const { minExecutionFee, minExecutionFeeUSD, minExecutionFeeErrorMessage } = useMinExecutionFee(
    library,
    active,
    chainId,
    infoTokens
  );

  useEffect(() => {
    const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
    const toToken = getTokenInfo(infoTokens, toTokenAddress);
    let selectedToken = getChartToken(swapOption, fromToken, toToken, chainId);
    let currentTokenPriceStr = formatAmount(selectedToken.maxPrice, USD_DECIMALS, 2, true);
    let title = getPageTitle(currentTokenPriceStr + ` | ${selectedToken.symbol}${selectedToken.isStable ? "" : "USD"}`);
    document.title = title;
  }, [tokenSelection, swapOption, infoTokens, chainId, fromTokenAddress, toTokenAddress]);

  const { positions, positionsMap } = getPositions(
    chainId,
    positionQuery,
    positionData,
    infoTokens,
    savedIsPnlInLeverage,
    savedShowPnlAfterFees,
    account,
    pendingPositions,
    updatedPositions
  );

  useImperativeHandle(ref, () => ({
    onUpdatePosition(key, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl) {
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        if (position.contractKey === key) {
          updatedPositions[position.key] = {
            size,
            collateral,
            averagePrice,
            entryFundingRate,
            reserveAmount,
            realisedPnl,
            updatedAt: Date.now(),
          };
          setUpdatedPositions({ ...updatedPositions });
          break;
        }
      }
    },
    onClosePosition(key, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, e) {
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        if (position.contractKey === key) {
          updatedPositions[position.key] = {
            size: bigNumberify(0),
            collateral: bigNumberify(0),
            averagePrice,
            entryFundingRate,
            reserveAmount,
            realisedPnl,
            updatedAt: Date.now(),
          };
          setUpdatedPositions({ ...updatedPositions });
          break;
        }
      }
    },

    onIncreasePosition(key, account, collateralToken, indexToken, collateralDelta, sizeDelta, isLong, price, fee, e) {
      if (account !== currentAccount) {
        return;
      }

      const indexTokenItem = getToken(chainId, indexToken);
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;

      let message;
      if (sizeDelta.eq(0)) {
        message = `Deposited ${formatAmount(collateralDelta, USD_DECIMALS, 2, true)} USD into ${tokenSymbol} ${
          isLong ? "Long" : "Short."
        }`;
      } else {
        message = `Increased ${tokenSymbol} ${isLong ? "Long" : "Short"}, +${formatAmount(
          sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD.`;
      }

      pushSuccessNotification(chainId, message, e);
    },

    onDecreasePosition(key, account, collateralToken, indexToken, collateralDelta, sizeDelta, isLong, price, fee, e) {
      if (account !== currentAccount) {
        return;
      }

      const indexTokenItem = getToken(chainId, indexToken);
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;

      let message;
      if (sizeDelta.eq(0)) {
        message = `Withdrew ${formatAmount(collateralDelta, USD_DECIMALS, 2, true)} USD from ${tokenSymbol} ${
          isLong ? "Long" : "Short"
        }.`;
      } else {
        message = `Decreased ${tokenSymbol} ${isLong ? "Long" : "Short"}, -${formatAmount(
          sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD.`;
      }

      pushSuccessNotification(chainId, message, e);
    },

    onCancelIncreasePosition(
      account,
      path,
      indexToken,
      amountIn,
      minOut,
      sizeDelta,
      isLong,
      acceptablePrice,
      executionFee,
      blockGap,
      timeGap,
      e
    ) {
      if (account !== currentAccount) {
        return;
      }
      const indexTokenItem = getToken(chainId, indexToken);
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;

      const message = `Could not increase ${tokenSymbol} ${
        isLong ? "Long" : "Short"
      } within the allowed slippage, you can adjust the allowed slippage in the settings on the top right of the page.`;

      pushErrorNotification(chainId, message, e);

      const key = getPositionKey(account, path[path.length - 1], indexToken, isLong);
      pendingPositions[key] = {};
      setPendingPositions({ ...pendingPositions });
    },

    onCancelDecreasePosition(
      account,
      path,
      indexToken,
      collateralDelta,
      sizeDelta,
      isLong,
      receiver,
      acceptablePrice,
      minOut,
      executionFee,
      blockGap,
      timeGap,
      e
    ) {
      if (account !== currentAccount) {
        return;
      }
      const indexTokenItem = getToken(chainId, indexToken);
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;

      const message = `Could not decrease ${tokenSymbol} ${
        isLong ? "Long" : "Short"
      } within the allowed slippage, you can adjust the allowed slippage in the settings on the top right of the page.`;

      pushErrorNotification(chainId, message, e);

      const key = getPositionKey(account, path[path.length - 1], indexToken, isLong);
      pendingPositions[key] = {};
      setPendingPositions({ ...pendingPositions });
    },
  }));

  const flagOrdersEnabled = true;
  const [orders] = useAccountOrders(flagOrdersEnabled);

  const [isWaitingForPluginApproval, setIsWaitingForPluginApproval] = useState(false);
  const [isWaitingForPositionRouterApproval, setIsWaitingForPositionRouterApproval] = useState(false);
  const [isPluginApproving, setIsPluginApproving] = useState(false);
  const [isPositionRouterApproving, setIsPositionRouterApproving] = useState(false);
  const [isCancelMultipleOrderProcessing, setIsCancelMultipleOrderProcessing] = useState(false);
  const [cancelOrderIdList, setCancelOrderIdList] = useState([]);

  const onMultipleCancelClick = useCallback(
    async function () {
      setIsCancelMultipleOrderProcessing(true);
      try {
        const tx = await cancelMultipleOrders(chainId, library, cancelOrderIdList, {
          successMsg: t`Orders cancelled.`,
          failMsg: t`Cancel failed.`,
          sentMsg: t`Cancel submitted.`,
          pendingTxns,
          setPendingTxns,
        });
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          setCancelOrderIdList([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsCancelMultipleOrderProcessing(false);
      }
    },
    [
      chainId,
      library,
      pendingTxns,
      setPendingTxns,
      setCancelOrderIdList,
      cancelOrderIdList,
      setIsCancelMultipleOrderProcessing,
    ]
  );

  const approveOrderBook = () => {
    setIsPluginApproving(true);
    return approvePlugin(chainId, orderBookAddress, {
      library,
      pendingTxns,
      setPendingTxns,
      sentMsg: t`Enable orders sent.`,
      failMsg: t`Enable orders failed.`,
    })
      .then(() => {
        setIsWaitingForPluginApproval(true);
      })
      .finally(() => {
        setIsPluginApproving(false);
      });
  };

  const approvePositionRouter = ({ sentMsg, failMsg }) => {
    setIsPositionRouterApproving(true);
    return approvePlugin(chainId, positionRouterAddress, {
      library,
      pendingTxns,
      setPendingTxns,
      sentMsg,
      failMsg,
    })
      .then(() => {
        setIsWaitingForPositionRouterApproval(true);
      })
      .finally(() => {
        setIsPositionRouterApproving(false);
      });
  };

  const LIST_SECTIONS = ["Positions", flagOrdersEnabled ? "Orders" : undefined, "Trades"].filter(Boolean);
  let [listSection, setListSection] = useLocalStorageByChainId(chainId, "List-section-v2", LIST_SECTIONS[0]);
  const LIST_SECTIONS_LABELS = {
    Orders: orders.length ? `Orders (${orders.length})` : undefined,
    Positions: positions.length ? `Positions (${positions.length})` : undefined,
  };
  if (!LIST_SECTIONS.includes(listSection)) {
    listSection = LIST_SECTIONS[0];
  }

  if (!getToken(chainId, toTokenAddress)) {
    return null;
  }

  const renderCancelOrderButton = () => {
    const orderText = cancelOrderIdList.length > 1 ? t`orders` : t`order`;
    if (cancelOrderIdList.length === 0) return;
    return (
      <button
        className="muted font-base cancel-order-btn"
        disabled={isCancelMultipleOrderProcessing}
        type="button"
        onClick={onMultipleCancelClick}
      >
        <Trans>
          Cancel {cancelOrderIdList.length} {orderText}
        </Trans>
      </button>
    );
  };

  const getListSection = () => {
    return (
      <div>
        <div className="Exchange-list-tab-container">
          <Tab
            options={LIST_SECTIONS}
            optionLabels={LIST_SECTIONS_LABELS}
            option={listSection}
            onChange={(section) => setListSection(section)}
            type="inline"
            className="Exchange-list-tabs"
          />
          <div className="align-right Exchange-should-show-position-lines">
            {renderCancelOrderButton()}
            <Checkbox
              isChecked={savedShouldShowPositionLines}
              setIsChecked={setSavedShouldShowPositionLines}
              className={cx("muted chart-positions", { active: savedShouldShowPositionLines })}
            >
              <span>
                <Trans>Chart positions</Trans>
              </span>
            </Checkbox>
          </div>
        </div>
        {listSection === "Positions" && (
          <PositionsList
            positionsDataIsLoading={positionsDataIsLoading}
            pendingPositions={pendingPositions}
            setPendingPositions={setPendingPositions}
            setListSection={setListSection}
            setIsWaitingForPluginApproval={setIsWaitingForPluginApproval}
            setIsWaitingForPositionRouterApproval={setIsWaitingForPositionRouterApproval}
            approveOrderBook={approveOrderBook}
            approvePositionRouter={approvePositionRouter}
            isPluginApproving={isPluginApproving}
            isPositionRouterApproving={isPositionRouterApproving}
            isWaitingForPluginApproval={isWaitingForPluginApproval}
            isWaitingForPositionRouterApproval={isWaitingForPositionRouterApproval}
            orderBookApproved={orderBookApproved}
            positionRouterApproved={positionRouterApproved}
            positions={positions}
            positionsMap={positionsMap}
            infoTokens={infoTokens}
            active={active}
            account={account}
            library={library}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            flagOrdersEnabled={flagOrdersEnabled}
            savedIsPnlInLeverage={savedIsPnlInLeverage}
            chainId={chainId}
            nativeTokenAddress={nativeTokenAddress}
            setMarket={setMarket}
            orders={orders}
            showPnlAfterFees={savedShowPnlAfterFees}
            minExecutionFee={minExecutionFee}
            minExecutionFeeUSD={minExecutionFeeUSD}
            minExecutionFeeErrorMessage={minExecutionFeeErrorMessage}
            usdgSupply={usdgSupply}
            totalTokenWeights={totalTokenWeights}
          />
        )}
        {listSection === "Orders" && (
          <OrdersList
            account={account}
            active={active}
            library={library}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            infoTokens={infoTokens}
            positionsMap={positionsMap}
            chainId={chainId}
            orders={orders}
            totalTokenWeights={totalTokenWeights}
            usdgSupply={usdgSupply}
            savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
            cancelOrderIdList={cancelOrderIdList}
            setCancelOrderIdList={setCancelOrderIdList}
          />
        )}
        {listSection === "Trades" && (
          <TradeHistory
            account={account}
            forSingleAccount={true}
            infoTokens={infoTokens}
            getTokenInfo={getTokenInfo}
            chainId={chainId}
            nativeTokenAddress={nativeTokenAddress}
            shouldShowPaginationButtons={true}
          />
        )}
      </div>
    );
  };

  const onSelectWalletToken = (token) => {
    setFromTokenAddress(swapOption, token.address);
  };

  const renderChart = () => {
    return (
      <ExchangeTVChart
        fromTokenAddress={fromTokenAddress}
        toTokenAddress={toTokenAddress}
        infoTokens={infoTokens}
        swapOption={swapOption}
        chainId={chainId}
        positions={positions}
        savedShouldShowPositionLines={savedShouldShowPositionLines}
        orders={orders}
        setToTokenAddress={setToTokenAddress}
      />
    );
  };

  return (
    <div className="Exchange page-layout">
      {showBanner && <ExchangeBanner hideBanner={hideBanner} />}
      <div className="Exchange-content">
        <div className="Exchange-left">
          {renderChart()}
          <div className="Exchange-lists large">{getListSection()}</div>
        </div>
        <div className="Exchange-right">
          <SwapBox
            pendingPositions={pendingPositions}
            setPendingPositions={setPendingPositions}
            setIsWaitingForPluginApproval={setIsWaitingForPluginApproval}
            setIsWaitingForPositionRouterApproval={setIsWaitingForPositionRouterApproval}
            approveOrderBook={approveOrderBook}
            approvePositionRouter={approvePositionRouter}
            isPluginApproving={isPluginApproving}
            isPositionRouterApproving={isPositionRouterApproving}
            isWaitingForPluginApproval={isWaitingForPluginApproval}
            isWaitingForPositionRouterApproval={isWaitingForPositionRouterApproval}
            orderBookApproved={orderBookApproved}
            positionRouterApproved={positionRouterApproved}
            orders={orders}
            flagOrdersEnabled={flagOrdersEnabled}
            chainId={chainId}
            infoTokens={infoTokens}
            active={active}
            connectWallet={connectWallet}
            library={library}
            account={account}
            positionsMap={positionsMap}
            fromTokenAddress={fromTokenAddress}
            setFromTokenAddress={setFromTokenAddress}
            toTokenAddress={toTokenAddress}
            setToTokenAddress={setToTokenAddress}
            swapOption={swapOption}
            setSwapOption={setSwapOption}
            pendingTxns={pendingTxns}
            setPendingTxns={setPendingTxns}
            tokenSelection={tokenSelection}
            setTokenSelection={setTokenSelection}
            isConfirming={isConfirming}
            setIsConfirming={setIsConfirming}
            isPendingConfirmation={isPendingConfirmation}
            setIsPendingConfirmation={setIsPendingConfirmation}
            savedIsPnlInLeverage={savedIsPnlInLeverage}
            setSavedIsPnlInLeverage={setSavedIsPnlInLeverage}
            nativeTokenAddress={nativeTokenAddress}
            savedSlippageAmount={savedSlippageAmount}
            totalTokenWeights={totalTokenWeights}
            usdgSupply={usdgSupply}
            savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
            minExecutionFee={minExecutionFee}
            minExecutionFeeUSD={minExecutionFeeUSD}
            minExecutionFeeErrorMessage={minExecutionFeeErrorMessage}
          />
          <div className="Exchange-wallet-tokens">
            <div className="Exchange-wallet-tokens-content">
              <ExchangeWalletTokens tokens={tokens} infoTokens={infoTokens} onSelectToken={onSelectWalletToken} />
            </div>
          </div>
        </div>
        <div className="Exchange-lists small">{getListSection()}</div>
      </div>
      <Footer />
    </div>
  );
});

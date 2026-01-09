import chunk from "lodash/chunk";
import { bytesToHex, hexToBytes, numberToHex, zeroAddress } from "viem";

import { CROSS_CHAIN_SLIPPAGE_AMOUNT, DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
import {
  CHAIN_ID_TO_ENDPOINT_ID,
  getLayerZeroEndpointId,
  getMultichainTokenId,
  getStargatePoolAddress,
} from "config/multichain";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import {
  selectPoolsDetailsFirstTokenAddress,
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsGlvTokenAddress,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsLongTokenAmount,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSelectedMarketAddressForGlv,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsShortTokenAmount,
  selectPoolsDetailsWithdrawalReceiveTokenAddress,
} from "context/PoolsDetailsContext/selectors";
import {
  selectAccount,
  selectChainId,
  selectGlvAndMarketsInfoData,
  selectMarketsInfoData,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { CodecUiHelper, GMX_DATA_ACTION_HASH, MultichainActionType } from "domain/multichain/codecs/CodecUiHelper";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import {
  RawCreateDepositParams,
  RawCreateGlvDepositParams,
  RawCreateGlvWithdrawalParams,
  RawCreateWithdrawalParams,
} from "domain/synthetics/markets/types";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { getTokenAddressByMarket } from "sdk/configs/markets";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { WithdrawalAmounts } from "sdk/types/trade";
import { nowInSeconds } from "sdk/utils/time";
import { applySlippageToMinOut } from "sdk/utils/trade/trade";

import { selectDepositWithdrawalAmounts } from "./selectDepositWithdrawalAmounts";

type PoolsDetailsParams =
  | RawCreateDepositParams
  | RawCreateGlvDepositParams
  | RawCreateWithdrawalParams
  | RawCreateGlvWithdrawalParams
  | undefined;

export const selectPoolsDetailsParams = createSelector((q): PoolsDetailsParams => {
  const account = q(selectAccount);

  // Early return if no account
  if (!account) {
    return undefined;
  }

  const chainId = q(selectChainId);
  const srcChainId = q(selectSrcChainId);

  const paySource = q(selectPoolsDetailsPaySource);
  // If paySource is sourceChain but no srcChainId, abort early
  if (paySource === "sourceChain" && srcChainId === undefined) {
    return undefined;
  }

  const glvTokenAddress = q(selectPoolsDetailsGlvTokenAddress);
  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);
  const longTokenAmount = q(selectPoolsDetailsLongTokenAmount);
  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);
  const shortTokenAmount = q(selectPoolsDetailsShortTokenAmount);

  const glvAndMarketsInfoData = q(selectGlvAndMarketsInfoData);
  const marketsInfoData = q(selectMarketsInfoData);

  const marketOrGlvTokenAddress = q(selectPoolsDetailsGlvOrMarketAddress);
  const selectedMarketForGlv = q(selectPoolsDetailsSelectedMarketAddressForGlv);

  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  const { isDeposit, isWithdrawal } = q(selectPoolsDetailsFlags);
  const isMarketTokenDeposit = q(selectPoolsDetailsIsMarketTokenDeposit);

  const marketOrGlvTokenAmount = q(selectPoolsDetailsMarketOrGlvTokenAmount);

  const amounts = q(selectDepositWithdrawalAmounts);
  const withdrawalReceiveTokenAddress = q(selectPoolsDetailsWithdrawalReceiveTokenAddress);

  /**
   * When buy/sell GM - marketInfo is GM market, glvInfo is undefined
   * When buy/sell GLV - marketInfo is corresponding GM market, glvInfo is selected GLV
   */
  const glvOrMarketInfo = glvTokenAddress ? getByKey(glvAndMarketsInfoData, glvTokenAddress) : undefined;
  const isGlv = glvOrMarketInfo && isGlvInfo(glvOrMarketInfo);

  // If we have a GLV but no selected market, this is a weird state
  if (isGlv && !selectedMarketForGlv) {
    return undefined;
  }

  const marketInfo = isGlv
    ? selectedMarketForGlv
      ? marketsInfoData?.[selectedMarketForGlv]
      : undefined
    : glvOrMarketInfo;

  const glvInfo = isGlv ? glvOrMarketInfo : undefined;

  const wrappedNativeTokenAddress = getWrappedToken(chainId);

  const shouldUnwrapNativeToken =
    paySource === "settlementChain" &&
    (firstTokenAddress === zeroAddress || secondTokenAddress === zeroAddress) &&
    (longTokenAddress === wrappedNativeTokenAddress.address || shortTokenAddress === wrappedNativeTokenAddress.address);

  //#region GM Deposit
  if (isDeposit && !isGlv) {
    // Raw GM Deposit Params
    if (!marketOrGlvTokenAddress || marketOrGlvTokenAmount === undefined) {
      return undefined;
    }

    const slippage = paySource === "sourceChain" ? CROSS_CHAIN_SLIPPAGE_AMOUNT : DEFAULT_SLIPPAGE_AMOUNT;
    const minMarketTokens = applySlippageToMinOut(slippage, marketOrGlvTokenAmount);

    let dataList: string[] = EMPTY_ARRAY;

    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const multichainTokenConfig = getMultichainTokenId(chainId, marketOrGlvTokenAddress);

      if (!multichainTokenConfig) {
        return undefined;
      }

      const actionHash = CodecUiHelper.encodeMultichainBridgeOutActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: multichainTokenConfig.stargate,
          providerData: numberToHex(CHAIN_ID_TO_ENDPOINT_ID[srcChainId], { size: 32 }),
          minAmountOut: minMarketTokens,
          secondaryProvider: zeroAddress,
          secondaryProviderData: "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash);
      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    return {
      addresses: {
        receiver: account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        market: marketOrGlvTokenAddress,
        initialLongToken: getTokenAddressByMarket(chainId, marketOrGlvTokenAddress, "long"),
        initialShortToken: getTokenAddressByMarket(chainId, marketOrGlvTokenAddress, "short"),
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
      },
      minMarketTokens,
      shouldUnwrapNativeToken,
      callbackGasLimit: 0n,
      dataList,
    } satisfies RawCreateDepositParams;
  }
  //#endregion

  //#region GLV Deposit
  if (isDeposit && isGlv) {
    // Raw GLV Deposit Params
    if (!marketInfo || !glvTokenAddress || !selectedMarketForGlv || marketOrGlvTokenAmount === undefined) {
      return undefined;
    }

    const slippage = paySource === "sourceChain" ? CROSS_CHAIN_SLIPPAGE_AMOUNT : DEFAULT_SLIPPAGE_AMOUNT;
    const minGlvTokens = applySlippageToMinOut(slippage, marketOrGlvTokenAmount);

    let dataList: string[] = EMPTY_ARRAY;
    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const tokenId = getMultichainTokenId(chainId, glvTokenAddress);

      if (!tokenId) {
        return undefined;
      }

      const actionHash = CodecUiHelper.encodeMultichainBridgeOutActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          minAmountOut: minGlvTokens,
          provider: tokenId.stargate,
          providerData: numberToHex(CHAIN_ID_TO_ENDPOINT_ID[srcChainId], { size: 32 }),
          secondaryProvider: zeroAddress,
          secondaryProviderData: "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash);

      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    return {
      addresses: {
        glv: glvInfo!.glvTokenAddress,
        market: selectedMarketForGlv,
        receiver: glvInfo!.glvToken.totalSupply === 0n ? numberToHex(1, { size: 20 }) : account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        initialLongToken: isMarketTokenDeposit
          ? zeroAddress
          : getTokenAddressByMarket(chainId, selectedMarketForGlv, "long"),
        initialShortToken: isMarketTokenDeposit
          ? zeroAddress
          : getTokenAddressByMarket(chainId, selectedMarketForGlv, "short"),
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
      },
      minGlvTokens,
      callbackGasLimit: 0n,
      shouldUnwrapNativeToken,
      isMarketTokenDeposit: Boolean(isMarketTokenDeposit),
      dataList,
    } satisfies RawCreateGlvDepositParams;
  }
  //#endregion

  //#region GM Withdrawal
  if (isWithdrawal && !isGlv) {
    // Raw GM Withdrawal Params
    if (!longTokenAddress || !shortTokenAddress || !amounts) {
      return undefined;
    }
    const withdrawalAmounts = amounts as WithdrawalAmounts;

    let dataList: string[] = EMPTY_ARRAY;

    const slippage = paySource === "sourceChain" ? CROSS_CHAIN_SLIPPAGE_AMOUNT : DEFAULT_SLIPPAGE_AMOUNT;

    let minLongTokenOutputAmount = 0n;
    let minShortTokenOutputAmount = 0n;

    if (!withdrawalReceiveTokenAddress) {
      minLongTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.longTokenBeforeSwapAmount);
      minShortTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.shortTokenBeforeSwapAmount);
    } else {
      if (withdrawalAmounts.longTokenSwapPathStats) {
        minLongTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.longTokenSwapPathStats.amountOut);
      } else {
        minLongTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.longTokenBeforeSwapAmount);
      }

      if (withdrawalAmounts.shortTokenSwapPathStats) {
        minShortTokenOutputAmount = applySlippageToMinOut(
          slippage,
          withdrawalAmounts.shortTokenSwapPathStats.amountOut
        );
      } else {
        minShortTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.shortTokenBeforeSwapAmount);
      }
    }

    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const longOftProvider = getStargatePoolAddress(chainId, convertTokenAddress(chainId, longTokenAddress, "native"));
      const shortOftProvider = getStargatePoolAddress(
        chainId,
        convertTokenAddress(chainId, shortTokenAddress, "native")
      );

      const provider = longTokenAmount > 0n ? longOftProvider : shortTokenAmount > 0n ? shortOftProvider : undefined;

      if (!provider) {
        return undefined;
      }

      const secondaryProvider =
        provider === shortOftProvider ? undefined : shortTokenAmount > 0n ? shortOftProvider : undefined;

      const dstEid = getLayerZeroEndpointId(srcChainId);
      if (!dstEid) {
        return undefined;
      }

      const providerData = numberToHex(dstEid, { size: 32 });

      const actionHash = CodecUiHelper.encodeMultichainBridgeOutActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: provider,
          providerData: providerData,
          minAmountOut: 0n,
          secondaryProvider: secondaryProvider ?? zeroAddress,
          secondaryProviderData: secondaryProvider ? providerData : "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash);
      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    let shouldUnwrapNativeTokenForGm = false;
    if (paySource === "settlementChain") {
      shouldUnwrapNativeTokenForGm =
        firstTokenAddress === zeroAddress || secondTokenAddress === zeroAddress ? true : false;
    }

    return {
      addresses: {
        market: marketOrGlvTokenAddress!,
        receiver: account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        longTokenSwapPath: withdrawalAmounts.longTokenSwapPathStats?.swapPath ?? [],
        shortTokenSwapPath: withdrawalAmounts.shortTokenSwapPathStats?.swapPath ?? [],
      },
      minLongTokenAmount: minLongTokenOutputAmount,
      minShortTokenAmount: minShortTokenOutputAmount,
      shouldUnwrapNativeToken: shouldUnwrapNativeTokenForGm,
      callbackGasLimit: 0n,
      dataList,
    } satisfies RawCreateWithdrawalParams;
  }
  //#endregion

  //#region GLV Withdrawal
  if (isWithdrawal && isGlv) {
    if (!longTokenAddress || !shortTokenAddress || !amounts) {
      return undefined;
    }

    const { glvTokenAddress: glvTokenAddress, glvToken } = glvInfo!;

    const withdrawalAmounts = amounts as WithdrawalAmounts;

    const slippage = paySource === "sourceChain" ? CROSS_CHAIN_SLIPPAGE_AMOUNT : DEFAULT_SLIPPAGE_AMOUNT;

    let minLongTokenOutputAmount = 0n;
    let minShortTokenOutputAmount = 0n;

    if (!withdrawalReceiveTokenAddress) {
      minLongTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.longTokenBeforeSwapAmount);
      minShortTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.shortTokenBeforeSwapAmount);
    } else {
      if (withdrawalAmounts.longTokenSwapPathStats) {
        minLongTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.longTokenSwapPathStats.amountOut);
      } else {
        minLongTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.longTokenBeforeSwapAmount);
      }

      if (withdrawalAmounts.shortTokenSwapPathStats) {
        minShortTokenOutputAmount = applySlippageToMinOut(
          slippage,
          withdrawalAmounts.shortTokenSwapPathStats.amountOut
        );
      } else {
        minShortTokenOutputAmount = applySlippageToMinOut(slippage, withdrawalAmounts.shortTokenBeforeSwapAmount);
      }
    }

    let dataList: string[] = EMPTY_ARRAY;
    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const longTokenAmount = withdrawalAmounts.longTokenAmount;
      const shortTokenAmount = withdrawalAmounts.shortTokenAmount;

      const longOftProvider = getStargatePoolAddress(chainId, convertTokenAddress(chainId, longTokenAddress, "native"));
      const shortOftProvider = getStargatePoolAddress(
        chainId,
        convertTokenAddress(chainId, shortTokenAddress, "native")
      );

      const provider = longTokenAmount > 0n ? longOftProvider : shortTokenAmount > 0n ? shortOftProvider : undefined;

      if (!provider) {
        return undefined;
      }

      const secondaryProvider =
        provider === shortOftProvider ? undefined : shortTokenAmount > 0n ? shortOftProvider : undefined;

      const dstEid = getLayerZeroEndpointId(srcChainId);

      if (!dstEid) {
        return undefined;
      }

      const providerData = numberToHex(dstEid, { size: 32 });

      const actionHash = CodecUiHelper.encodeMultichainBridgeOutActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: provider,
          providerData: providerData,
          minAmountOut: 0n,
          secondaryProvider: secondaryProvider ?? zeroAddress,
          secondaryProviderData: secondaryProvider ? providerData : "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash);

      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    let shouldUnwrapNativeTokenForGlv = false;
    if (paySource === "settlementChain") {
      shouldUnwrapNativeTokenForGlv =
        firstTokenAddress === zeroAddress || secondTokenAddress === zeroAddress ? true : false;
    }

    return {
      addresses: {
        glv: glvTokenAddress,
        market: selectedMarketForGlv!,
        receiver: glvToken.totalSupply === 0n ? numberToHex(1, { size: 20 }) : account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        longTokenSwapPath: withdrawalAmounts.longTokenSwapPathStats?.swapPath ?? [],
        shortTokenSwapPath: withdrawalAmounts.shortTokenSwapPathStats?.swapPath ?? [],
      },
      minLongTokenAmount: minLongTokenOutputAmount,
      minShortTokenAmount: minShortTokenOutputAmount,
      callbackGasLimit: 0n,
      shouldUnwrapNativeToken: shouldUnwrapNativeTokenForGlv,
      dataList,
    } satisfies RawCreateGlvWithdrawalParams;
  }
  //#endregion

  return undefined;
});

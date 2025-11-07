import chunk from "lodash/chunk";
import { bytesToHex, Hex, hexToBytes, numberToHex, zeroAddress } from "viem";

import { DEFAULT_SLIPPAGE_AMOUNT } from "config/factors";
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
  selectPoolsDetailsGlvTokenAddress,
  selectPoolsDetailsGlvOrMarketAddress,
  selectPoolsDetailsIsMarketTokenDeposit,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsLongTokenAmount,
  selectPoolsDetailsMarketOrGlvTokenAmount,
  selectPoolsDetailsPaySource,
  selectPoolsDetailsSecondTokenAddress,
  selectPoolsDetailsSelectedMarketForGlv,
  selectPoolsDetailsShortTokenAddress,
  selectPoolsDetailsShortTokenAmount,
} from "context/PoolsDetailsContext/selectors";
import {
  selectGlvAndMarketsInfoData,
  selectMarketsInfoData,
  selectChainId,
  selectAccount,
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
import { ERC20Address } from "domain/tokens";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION } from "sdk/configs/express";
import { MARKETS } from "sdk/configs/markets";
import { convertTokenAddress, getWrappedToken } from "sdk/configs/tokens";
import { WithdrawalAmounts } from "sdk/types/trade";
import { nowInSeconds } from "sdk/utils/time";
import { applySlippageToMinOut } from "sdk/utils/trade/trade";

import { selectDepositWithdrawalAmounts } from "../selectDepositWithdrawalAmounts";

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
  const selectedMarketForGlv = q(selectPoolsDetailsSelectedMarketForGlv);

  const firstTokenAddress = q(selectPoolsDetailsFirstTokenAddress);
  const secondTokenAddress = q(selectPoolsDetailsSecondTokenAddress);
  const { isDeposit, isWithdrawal } = q(selectPoolsDetailsFlags);
  const isMarketTokenDeposit = q(selectPoolsDetailsIsMarketTokenDeposit);

  const marketOrGlvTokenAmount = q(selectPoolsDetailsMarketOrGlvTokenAmount);

  const amounts = q(selectDepositWithdrawalAmounts);

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

  const wrappedTokenAddress = getWrappedToken(chainId);

  const shouldUnwrapNativeToken =
    paySource === "settlementChain"
      ? (longTokenAmount > 0n && longTokenAddress === wrappedTokenAddress.address) ||
        (shortTokenAmount > 0n && shortTokenAddress === wrappedTokenAddress.address)
        ? true
        : false
      : false;

  //#region GM Deposit
  if (isDeposit && !isGlv) {
    // Raw GM Deposit Params
    if (!marketOrGlvTokenAddress || marketOrGlvTokenAmount === undefined) {
      return undefined;
    }

    const minMarketTokens = applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, marketOrGlvTokenAmount);

    let dataList: string[] = EMPTY_ARRAY;

    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const multichainTokenConfig = getMultichainTokenId(chainId, marketOrGlvTokenAddress);

      if (!multichainTokenConfig) {
        return undefined;
      }

      const actionHash = CodecUiHelper.encodeMultichainActionData({
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
      const bytes = hexToBytes(actionHash as Hex);
      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    return {
      addresses: {
        receiver: account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        market: marketOrGlvTokenAddress!,
        initialLongToken: MARKETS[chainId][marketOrGlvTokenAddress!].longTokenAddress as ERC20Address,
        initialShortToken: MARKETS[chainId][marketOrGlvTokenAddress!].shortTokenAddress as ERC20Address,
        longTokenSwapPath: [],
        shortTokenSwapPath: [],
      },
      minMarketTokens,
      shouldUnwrapNativeToken: false,
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

    // TODO MLTCH: do not forget to apply slippage here
    // const minGlvTokens = applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, marketOrGlvTokenAmount);
    const minGlvTokens = 0n; //applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, marketOrGlvTokenAmount);

    let dataList: string[] = EMPTY_ARRAY;
    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const tokenId = getMultichainTokenId(chainId, glvTokenAddress);

      if (!tokenId) {
        return undefined;
      }

      const actionHash = CodecUiHelper.encodeMultichainActionData({
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
      const bytes = hexToBytes(actionHash as Hex);

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
          : (MARKETS[chainId][selectedMarketForGlv].longTokenAddress as ERC20Address),
        initialShortToken: isMarketTokenDeposit
          ? zeroAddress
          : (MARKETS[chainId][selectedMarketForGlv].shortTokenAddress as ERC20Address),
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
    if (!longTokenAddress || !shortTokenAddress) {
      return undefined;
    }

    let dataList: string[] = EMPTY_ARRAY;

    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const withdrawalAmounts = amounts as WithdrawalAmounts;
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

      const actionHash = CodecUiHelper.encodeMultichainActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: provider,
          providerData: providerData,
          // TODO MLTCH apply some slippage
          minAmountOut: 0n,
          // TODO MLTCH put secondary provider and data
          secondaryProvider: secondaryProvider ?? zeroAddress,
          secondaryProviderData: secondaryProvider ? providerData : "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash as Hex);
      const bytes32array = chunk(bytes, 32).map((b) => bytesToHex(Uint8Array.from(b)));

      dataList = [GMX_DATA_ACTION_HASH, ...bytes32array];
    }

    let shouldUnwrapNativeTokenForGm = false;
    if (paySource === "settlementChain") {
      shouldUnwrapNativeTokenForGm =
        longTokenAddress === zeroAddress || shortTokenAddress === zeroAddress ? true : false;
    }

    return {
      addresses: {
        market: marketOrGlvTokenAddress!,
        receiver: account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        longTokenSwapPath: (amounts as WithdrawalAmounts)?.longTokenSwapPathStats?.swapPath ?? [],
        shortTokenSwapPath: (amounts as WithdrawalAmounts)?.shortTokenSwapPathStats?.swapPath ?? [],
      },
      // TODO MLTCH: do not forget to apply slippage here
      // minLongTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, longTokenAmount ?? 0n),
      minLongTokenAmount: 0n,
      // TODO MLTCH: do not forget to apply slippage
      // minShortTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, shortTokenAmount ?? 0n),
      minShortTokenAmount: 0n,
      shouldUnwrapNativeToken: shouldUnwrapNativeTokenForGm,
      callbackGasLimit: 0n,
      dataList,
    } satisfies RawCreateWithdrawalParams;
  }
  //#endregion

  //#region GLV Withdrawal
  if (isWithdrawal && isGlv) {
    if (!longTokenAddress || !shortTokenAddress) {
      return undefined;
    }

    const { glvTokenAddress: glvTokenAddress, glvToken } = glvInfo!;

    let dataList: string[] = EMPTY_ARRAY;
    if (paySource === "sourceChain") {
      if (!srcChainId) {
        return undefined;
      }

      const withdrawalAmounts = amounts as WithdrawalAmounts;
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

      const actionHash = CodecUiHelper.encodeMultichainActionData({
        actionType: MultichainActionType.BridgeOut,
        actionData: {
          deadline: BigInt(nowInSeconds() + DEFAULT_EXPRESS_ORDER_DEADLINE_DURATION),
          desChainId: chainId,
          provider: provider,
          providerData: providerData,
          // TODO MLTCH apply some slippage
          minAmountOut: 0n,
          secondaryProvider: secondaryProvider ?? zeroAddress,
          secondaryProviderData: secondaryProvider ? providerData : "0x",
          secondaryMinAmountOut: 0n,
        },
      });
      const bytes = hexToBytes(actionHash as Hex);

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
        glv: glvTokenAddress!,
        market: selectedMarketForGlv!,
        receiver: glvToken.totalSupply === 0n ? numberToHex(1, { size: 20 }) : account,
        callbackContract: zeroAddress,
        uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT ?? zeroAddress,
        longTokenSwapPath: (amounts as WithdrawalAmounts)?.longTokenSwapPathStats?.swapPath ?? [],
        shortTokenSwapPath: (amounts as WithdrawalAmounts)?.shortTokenSwapPathStats?.swapPath ?? [],
      },
      // minLongTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, longTokenAmount ?? 0n),
      minLongTokenAmount: 0n,
      // minShortTokenAmount: applySlippageToMinOut(DEFAULT_SLIPPAGE_AMOUNT, shortTokenAmount ?? 0n),
      minShortTokenAmount: 0n,
      callbackGasLimit: 0n,
      shouldUnwrapNativeToken: shouldUnwrapNativeTokenForGlv,
      dataList,
    } satisfies RawCreateGlvWithdrawalParams;
  }
  //#endregion

  return undefined;
});

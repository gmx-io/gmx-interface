import {
  getSolanaAcceptableComparator,
  getSolanaOrderCategory,
  getSolanaOrderTypeLabel,
  getSolanaTriggerThreshold,
  isIncreaseKind,
  isMarketKind,
} from "./orderRules";
import { SOLANA_FOREX_PRECISION_MINTS, SOLANA_ORDER_KIND } from "./solanaOrderConstants";
import { formatBigintDivision, formatSolanaRatioAmount } from "./solanaOrderFormatters";
import type {
  RawSolanaOrder,
  SolanaCollateralOrderViewModel,
  SolanaOrderViewModel,
  SolanaPositionOrderViewModel,
  SolanaSwapOrderViewModel,
} from "./types";
import { getSolanaTokenConfig, type SolanaTokenConfig } from "../../config/solanaProgram";
import type { SolanaMarketInfo, SolanaTicker } from "../../markets/solanaMarketSocketStore";
import { shortenAddress, toGmxUsd, unitPriceToTokenPrice } from "../positions/solanaPositionAdapter";

export type SolanaOrderAdapterContext = {
  marketInfo?: SolanaMarketInfo;
  tokenPriceByMint: ReadonlyMap<string, SolanaTicker>;
};

function tokenLabel(config: SolanaTokenConfig | undefined): string | undefined {
  return config?.displaySymbol ?? config?.symbol;
}

function marketFields(raw: RawSolanaOrder, indexTokenAddress: string | undefined) {
  const indexToken = getSolanaTokenConfig(indexTokenAddress);
  const collateralToken = getSolanaTokenConfig(raw.initialCollateralToken);
  const targetCollateralToken = getSolanaTokenConfig(raw.collateralToken);
  const symbol = tokenLabel(indexToken) ?? shortenAddress(raw.marketToken);
  return {
    indexToken,
    symbol,
    displayMarketName: indexToken?.displayMarketName ?? (indexToken ? `${symbol}/USD` : shortenAddress(raw.marketToken)),
    collateralSymbol: tokenLabel(collateralToken) ?? shortenAddress(raw.initialCollateralToken),
    collateralDecimals: collateralToken?.decimals,
    targetCollateralTokenAddress: raw.collateralToken,
    targetCollateralSymbol: tokenLabel(targetCollateralToken) ?? shortenAddress(raw.collateralToken),
  };
}

function base(raw: RawSolanaOrder) {
  return {
    key: raw.pubkey,
    orderAddress: raw.pubkey,
    ownerAddress: raw.owner,
    marketTokenAddress: raw.marketToken,
    positionAddress: raw.positionAddress,
    kind: raw.kind,
    typeLabel: getSolanaOrderTypeLabel(raw),
    updatedAt: raw.updatedAt,
    errors: [],
  };
}

/**
 * Source: gmx-solana-interface OrderItem swap ratio (`triggerTokenList`). The token with the larger
 * human-readable amount is the numerator, so the rate reads "A per 1 B" and is >= 1.
 */
export function deriveSwapRatio(input: {
  fromAmount: bigint;
  fromDecimals?: number;
  fromSymbol?: string;
  fromPrice?: bigint;
  toMinAmount: bigint;
  toDecimals?: number;
  toSymbol?: string;
  toPrice?: bigint;
}): Pick<SolanaSwapOrderViewModel, "ratioLabel" | "triggerRatioText" | "markRatioText"> {
  if (input.fromDecimals === undefined || input.toDecimals === undefined || !input.fromSymbol || !input.toSymbol) return {};
  const from = {
    symbol: input.fromSymbol,
    decimals: input.fromDecimals,
    scaled: input.fromAmount * 10n ** BigInt(input.toDecimals),
    price: input.fromPrice,
  };
  const to = {
    symbol: input.toSymbol,
    decimals: input.toDecimals,
    scaled: input.toMinAmount * 10n ** BigInt(input.fromDecimals),
    price: input.toPrice,
  };
  const [big, small] = from.scaled > to.scaled ? [from, to] : [to, from];
  const result: Pick<SolanaSwapOrderViewModel, "ratioLabel" | "triggerRatioText" | "markRatioText"> = {
    ratioLabel: `${big.symbol} / ${small.symbol}`,
    triggerRatioText: small.scaled === 0n ? undefined : formatBigintDivision(big.scaled, small.scaled),
  };
  if (big.price !== undefined && small.price !== undefined && big.price > 0n) {
    // price[small] / price[big], expressed with `small.decimals` so formatAmount renders it as a plain ratio.
    const ratio = (10n ** BigInt(small.decimals) * small.price) / big.price;
    result.markRatioText = formatSolanaRatioAmount(ratio, small.decimals);
  }
  return result;
}

export function toSolanaOrderViewModel(raw: RawSolanaOrder, ctx: SolanaOrderAdapterContext): SolanaOrderViewModel {
  const category = getSolanaOrderCategory(raw);

  if (category === "swap") {
    const fromToken = getSolanaTokenConfig(raw.initialCollateralToken);
    const toToken = getSolanaTokenConfig(raw.finalOutputToken);
    const fromSymbol = tokenLabel(fromToken);
    const toSymbol = tokenLabel(toToken);
    const model: SolanaSwapOrderViewModel = {
      ...base(raw),
      category,
      fromTokenAddress: raw.initialCollateralToken,
      toTokenAddress: raw.finalOutputToken,
      fromSymbol,
      toSymbol,
      fromAmount: raw.initialCollateralDeltaAmount,
      fromDecimals: fromToken?.decimals,
      toMinAmount: raw.minOutputAmount,
      toDecimals: toToken?.decimals,
      ...deriveSwapRatio({
        fromAmount: raw.initialCollateralDeltaAmount,
        fromDecimals: fromToken?.decimals,
        fromSymbol,
        fromPrice: ctx.tokenPriceByMint.get(raw.initialCollateralToken)?.price,
        toMinAmount: raw.minOutputAmount,
        toDecimals: toToken?.decimals,
        toSymbol,
        toPrice: raw.finalOutputToken ? ctx.tokenPriceByMint.get(raw.finalOutputToken)?.price : undefined,
      }),
    };
    return model;
  }

  const indexTokenAddress = ctx.marketInfo?.indexToken;
  const fields = marketFields(raw, indexTokenAddress);
  const ticker = indexTokenAddress ? ctx.tokenPriceByMint.get(indexTokenAddress) : undefined;
  const markPrice = ticker?.price !== undefined ? toGmxUsd(ticker.price) : undefined;

  if (category === "collateral") {
    const model: SolanaCollateralOrderViewModel = {
      ...base(raw),
      category,
      isDeposit: raw.kind === SOLANA_ORDER_KIND.MarketIncrease,
      isLong: raw.isLong,
      symbol: fields.symbol,
      displayMarketName: fields.displayMarketName,
      collateralDeltaAmount: raw.initialCollateralDeltaAmount,
      collateralSymbol: fields.collateralSymbol,
      collateralDecimals: fields.collateralDecimals,
      targetCollateralTokenAddress: fields.targetCollateralTokenAddress,
      targetCollateralSymbol: fields.targetCollateralSymbol,
    };
    return model;
  }

  const isIncrease = isIncreaseKind(raw.kind);
  const toPrice = (unitPrice: bigint) =>
    fields.indexToken && unitPrice > 0n ? unitPriceToTokenPrice(unitPrice, fields.indexToken.decimals) : undefined;
  const model: SolanaPositionOrderViewModel = {
    ...base(raw),
    category,
    isLong: raw.isLong,
    symbol: fields.symbol,
    displayMarketName: fields.displayMarketName,
    indexTokenAddress,
    isForexPrecision: indexTokenAddress !== undefined && SOLANA_FOREX_PRECISION_MINTS.has(indexTokenAddress),
    sizeDeltaUsd: toGmxUsd(raw.sizeDeltaUsd) * (isIncrease ? 1n : -1n),
    isIncrease,
    isMarketOrder: isMarketKind(raw.kind),
    triggerThreshold: getSolanaTriggerThreshold(raw.kind, raw.isLong),
    triggerPrice: toPrice(raw.triggerPrice),
    acceptablePrice: toPrice(raw.acceptablePrice),
    acceptableComparator: getSolanaAcceptableComparator(raw.kind, raw.isLong),
    noAcceptableLimit: raw.kind === SOLANA_ORDER_KIND.StopLossDecrease,
    markPrice,
    collateralDeltaAmount: raw.initialCollateralDeltaAmount,
    collateralSymbol: fields.collateralSymbol,
    collateralDecimals: fields.collateralDecimals,
    targetCollateralTokenAddress: fields.targetCollateralTokenAddress,
    targetCollateralSymbol: fields.targetCollateralSymbol,
  };
  return model;
}

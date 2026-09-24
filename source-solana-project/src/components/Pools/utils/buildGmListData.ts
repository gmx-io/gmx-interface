import { BN } from '@coral-xyz/anchor';
import { BN_ZERO } from '@solana/spl-governance';
import { USD_DECIMALS } from '@/config/constants';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { IS_DEVELOPMENT } from '@/config/env';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import {
  formatBNToKMB,
  formatRatePercentage,
  formatToKMBWithoutUsd,
} from '@/utils/legacy/format';
import { getGlvMarketMaxCappedUsd } from '@/utils/glv/getGlvMarketMaxCappedUsd';
import { getNormalizedTokenSymbolGMX } from '@/utils/token/getNormalizedTokenSymbolGMX';
import { findGlvMarketForMarketToken } from '@/components/Pools/utils/getGlvMarketForMarketToken';
import { getGmw330Enabled } from '@/config/featureFlagEnable';

interface BuildGmListDataParams {
  allMarketInfos: any[];
  glvs: Record<string, any>;
  marketInfosMap: Map<string, any>;
  tokenPriceMap: Record<string, any>;
  balanceMap?: Map<string, BN>;
  connected: boolean;
}

const toSafeBn = (value: unknown) => {
  if (value instanceof BN) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return BN_ZERO;
  }

  const raw =
    typeof value === 'number'
      ? Number.isFinite(value)
        ? Math.trunc(value).toString()
        : ''
      : typeof value === 'string'
        ? value
        : typeof (value as { toString?: () => string }).toString === 'function'
          ? (value as { toString: () => string }).toString()
          : '';
  const normalized = raw.trim();

  return /^-?\d+$/.test(normalized) ? new BN(normalized) : BN_ZERO;
};

const toSafeDecimals = (value: unknown) => {
  const decimals = Number(value ?? 0);

  return Number.isFinite(decimals) && decimals > 0 ? Math.trunc(decimals) : 0;
};

const toGmw330Bn = (value: unknown) =>
  getGmw330Enabled() ? toSafeBn(value) : new BN((value as any) || 0);

const toGmw330RequiredBn = (value: unknown) =>
  getGmw330Enabled() ? toSafeBn(value) : new BN(value as any);

const toGmw330Decimals = (value: unknown) =>
  getGmw330Enabled() ? toSafeDecimals(value) : value as number;

const getGmMarketCapUsd = (item: any, tokenPriceMap: Record<string, any>) => {
  const tvlUsd = toGmw330Bn(item?.tvl);
  const longDepositCapacityAmount = toGmw330Bn(item?.longDepositCapacityAmount);
  const shortDepositCapacityAmount = toGmw330Bn(item?.shortDepositCapacityAmount);
  const longUnitPrice = toGmw330Bn(tokenPriceMap[item?.longToken || '']?.unitPrice);
  const shortUnitPrice = toGmw330Bn(tokenPriceMap[item?.shortToken || '']?.unitPrice);
  const buyableUsd = longDepositCapacityAmount
    .mul(longUnitPrice)
    .add(shortDepositCapacityAmount.mul(shortUnitPrice));

  if (buyableUsd.gt(BN_ZERO)) {
    return tvlUsd.add(buyableUsd);
  }

  const longPoolValueCap = toGmw330Bn(item?.maxPoolValueForDepositForLongToken);
  const shortPoolValueCap = toGmw330Bn(item?.maxPoolValueForDepositForShortToken);
  const poolValueCap = longPoolValueCap.add(shortPoolValueCap);

  return poolValueCap.gt(BN_ZERO) ? poolValueCap : tvlUsd;
};

export const buildGmListData = ({
  allMarketInfos,
  glvs,
  marketInfosMap,
  tokenPriceMap,
  balanceMap,
  connected,
}: BuildGmListDataParams) => {
  const gmList = allMarketInfos.map((item) => {
    const marketToken = item?.marketToken;
    const relation = findGlvMarketForMarketToken(
      glvs,
      typeof marketToken === 'string' ? marketToken : marketToken?.toString()
    );

    const poolName = GMX_SOLANA_TOKENS_RAW[item?.indexToken]?.symbol;
    const longAmount = item?.longTokenAmount;
    const shortAmount = item?.shortTokenAmount;
    const longUsd = toGmw330Bn(longAmount).mul(
      toGmw330Bn(tokenPriceMap[item?.longToken || '']?.unitPrice)
    );
    const shortUsd = toGmw330Bn(shortAmount).mul(
      toGmw330Bn(tokenPriceMap[item?.shortToken || '']?.unitPrice)
    );
    const allUsd = longUsd.add(shortUsd);
    const longRate = allUsd.gt(BN_ZERO)
      ? longUsd.mul(new BN(10).pow(new BN(USD_DECIMALS))).div(allUsd)
      : BN_ZERO;
    const shortRate = allUsd.gt(BN_ZERO)
      ? shortUsd.mul(new BN(10).pow(new BN(USD_DECIMALS))).div(allUsd)
      : BN_ZERO;
    const longRateStr = formatRatePercentage(longRate, 2, {
      signed: false,
      percentages: false,
    });
    const shortRateStr = formatRatePercentage(shortRate, 2, {
      signed: false,
      percentages: false,
    });
    const marketInfo = marketInfosMap?.get(item?.marketToken || '');
    const capUsd = relation?.market
      ? getGlvMarketMaxCappedUsd(relation?.market, marketInfo as any)
      : IS_DEVELOPMENT
        ? getGmMarketCapUsd(item, tokenPriceMap)
        : BN_ZERO;
    const marketDecimals = toGmw330Decimals(item?.marketDecimals || 0);
    const supply = toGmw330RequiredBn(item?.supply);
    const marketPrice = toGmw330RequiredBn(item?.marketPrice);
    const tvlUsdBn = supply
      .mul(marketPrice)
      .div(new BN(10).pow(new BN(marketDecimals)));
    const markets = [
      {
        ...item,
        marketTokenName: formatMarketName(item?.indexToken),
        tvlUsd: formatBNToKMB(tvlUsdBn),
        tvlUsdBn,
        cap: formatBNToKMB(capUsd),
        capUsdBn: capUsd,
        composition: 100,
      },
    ];

    return {
      ...item,
      poolName,
      markets,
      supply: item?.supply,
      marketToken: item?.marketToken,
      longToken: item?.longToken,
      shortToken: item?.shortToken,
      marketPrice: item?.marketPrice,
      decimals: item?.marketDecimals,
      longRate: longRateStr,
      shortRate: shortRateStr,
      glvOwner: relation?.glvToken,
      glvMarket: relation?.market,
      tvlUsdBn: toGmw330RequiredBn(item?.tvl),
      tvlUsd: formatBNToKMB(toGmw330RequiredBn(item?.tvl)),
      tvlUsdBnStr: item?.tvl,
      tvlNum: `(${formatToKMBWithoutUsd(supply, marketDecimals)} GM)`,
      name:
        getNormalizedTokenSymbolGMX(GMX_SOLANA_TOKENS_RAW[item?.longToken]?.symbol) +
        '-' +
        GMX_SOLANA_TOKENS_RAW[item?.shortToken]?.symbol,
      walletUsd:
        connected &&
        '$' +
          formatToKMBWithoutUsd(
            convertTokenAmountToUsd(
              balanceMap?.get(item?.marketToken) || BN_ZERO,
              marketDecimals,
              marketPrice
            ),
            20
          ),
      walletNum: `(${connected && formatToKMBWithoutUsd(balanceMap?.get(item?.marketToken) || BN_ZERO, marketDecimals)} GM)`,
    };
  });

  return [...gmList].sort((a: any, b: any) => {
    const aUsd = toGmw330Bn(a?.supply)
      .mul(toGmw330Bn(a?.marketPrice))
      .div(new BN(10).pow(new BN(toGmw330Decimals(a?.marketDecimals || 0))));
    const bUsd = toGmw330Bn(b?.supply)
      .mul(toGmw330Bn(b?.marketPrice))
      .div(new BN(10).pow(new BN(toGmw330Decimals(b?.marketDecimals || 0))));
    return bUsd.cmp(aUsd);
  });
};

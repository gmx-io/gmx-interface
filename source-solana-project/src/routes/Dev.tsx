import DataFetcher from '@/components/DataFetcher/DataFetcher';
import Footer from '@/components/Footer/Footer';
import PageTitle from '@/components/Common/PageTitle/PageTitle';
import { BN_ZERO, CHART_PERIODS } from '@/config/constants';
import { useComputeUnits } from '@/hooks/utilsHooks/useComputeUnits';
import { selectMarkets } from '@/selectors/market/baseSelectors';
import { Market } from '@/selectors/market/types';
import { selectPrices } from '@/selectors/token/baseSelectors';
import { applyFactor } from '@/utils/legacy/factor';
import { formatRatePercentage, formatUsd } from '@/utils/legacy/format';
import { getByKey } from '@/utils/lib/object';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';
import {
  createAppStoreSelector,
  RootState,
  useAppStore,
} from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { useSubscribeLinguiLocale } from '@/utils/lib/i18n';
import { useEffect, useState } from 'react';

export function Dev() {
  useSubscribeLinguiLocale();

  return (
    <div className="App">
      <div className="App-content">
        <div className="default-container Governance-layout">
          <PageTitle
            title={t`Dev`}
            isTop
            subtitle={
              <div>
                <Trans>For developer</Trans>
              </div>
            }
          />
          <div>
            <Play />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const Play = () => (
  <>
    <DataFetcher />
    <PriceTracker />
    <ComputeUnitsTracker />
    <br />
    <Dashboard />
    <br />
  </>
);

const PriceTracker = () => {
  const [count, setCount] = useState(0);
  const prices = useAppStore(selectPrices);

  useEffect(() => {
    setCount((count) => count + 1);
  }, [prices]);

  return <div>Updated: {count}</div>;
};

const ComputeUnitsTracker = () => {
  const [count, setCount] = useState(0);
  const { computeUnits, computeUnitPrice } = useComputeUnits();

  useEffect(() => {
    setCount((count) => count + 1);
  }, [computeUnitPrice]);

  return (
    <div>
      <div>Compute Units Updated: {count}</div>
      <div>Compute Units: {computeUnits}</div>
      <div>Compute Unit Price: {computeUnitPrice}</div>
    </div>
  );
};

const Dashboard = () => {
  const markets = useAppStore(selectMarkets);
  return (
    <div>
      {Object.entries(markets).map(([key, market]) => (
        <div key={key}>
          <Card market={market} />
          <br />
        </div>
      ))}
    </div>
  );
};

const selectIndexPrice = createAppStoreSelector(
  [
    (state, market: Market) =>
      getByKey(state.tokenState.prices, market.indexTokenAddress.toBase58()),
  ],
  (price) => {
    return price ? getMarketMidPrice(price) : BN_ZERO;
  }
);

const selectMarketStatus = (state: RootState, market: Market) =>
  getByKey(state.markets.marketsStatus, market.marketTokenAddress.toBase58());

const selectMarketState = (state: RootState, market: Market) =>
  getByKey(state.markets.marketsState, market.marketTokenAddress.toBase58());

const selectIsLong = (_state: RootState, _market: Market, isLong: boolean) =>
  isLong;

const selectBorrowingRates = createAppStoreSelector(
  [selectMarketStatus],
  (status) => {
    if (!status) return;
    return {
      borrowingRateLong: status.borrowingFactorPerSecondForLong.neg(),
      borrowingRateShort: status.borrowingFactorPerSecondForShort.neg(),
    };
  }
);

const selectReserveValue = createAppStoreSelector(
  [selectMarketStatus, selectIsLong],
  (status, isLong) =>
    isLong ? status?.reserveValueForLong : status?.reserveValueForShort
);

const selectPoolValueWithoutPnL = createAppStoreSelector(
  [selectMarketStatus, selectIsLong],
  (status, isLong) =>
    isLong
      ? status?.poolValueWithoutPnlForLong
      : status?.poolValueWithoutPnlForShort
);

const selectReserveFactor = createAppStoreSelector(
  [selectMarketState],
  (state) => {
    if (!state) return;
    return state.openInterestReserveFactor.lt(state.reserveFactor)
      ? state.openInterestReserveFactor
      : state.reserveFactor;
  }
);

const selectAvailableLiquidity = createAppStoreSelector(
  [selectReserveFactor, selectReserveValue, selectPoolValueWithoutPnL],
  (reserveFactor, reserveValue, poolValue) => {
    if (!reserveValue || !poolValue || !reserveFactor) return;
    const maxReserveValue = applyFactor(poolValue, reserveFactor);
    return maxReserveValue.gt(reserveValue)
      ? maxReserveValue.sub(reserveValue)
      : BN_ZERO;
  }
);

const selectFundingFactor = createAppStoreSelector(
  [selectMarketStatus],
  (status) => status?.fundingFactorPerSecond
);

const selectOpenInterest = createAppStoreSelector(
  [selectMarketState],
  (state) => state?.openInterest
);

const selectFundingRates = createAppStoreSelector(
  [selectFundingFactor, selectOpenInterest],
  (funding, openInterest) => {
    if (!funding || !openInterest) return;
    if (openInterest.long.isZero() || openInterest.short.isZero())
      return { fundingRateLong: BN_ZERO, fundingRateShort: BN_ZERO };
    const longPayShort = funding.gte(BN_ZERO);
    const fundingValue = longPayShort
      ? funding.mul(openInterest.long).abs()
      : funding.mul(openInterest.short).abs();
    const fundingRateLong = (
      longPayShort ? fundingValue.neg() : fundingValue
    ).div(openInterest.long);
    const fundingRateShort = (
      longPayShort ? fundingValue : fundingValue.neg()
    ).div(openInterest.short);
    return {
      fundingRateLong,
      fundingRateShort,
    };
  }
);

const selectNetRates = createAppStoreSelector(
  [selectBorrowingRates, selectFundingRates],
  (borrowingRates, fundingRates) => {
    if (!borrowingRates || !fundingRates) return;
    return {
      netRateLong: borrowingRates.borrowingRateLong.add(
        fundingRates.fundingRateLong
      ),
      netRateShort: borrowingRates.borrowingRateShort.add(
        fundingRates.fundingRateShort
      ),
    };
  }
);

const DURATION = CHART_PERIODS['1h'];

const Card = ({ market }: { market: Market }) => {
  const [priceUpdated, setPriceUpdated] = useState(0);
  const [marketUpdated, setMarketUpdated] = useState(0);
  const [borrowingUpdated, setBorrowingUpdated] = useState(0);
  const [fundingUpdated, setFundingUpdated] = useState(0);
  const [availableLiquidityUpdated, setAvailableLiquidityUpdated] = useState(0);

  const price = useAppStore((state) => selectIndexPrice(state, market));
  const borrowingRates = useAppStore((state) =>
    selectBorrowingRates(state, market)
  );
  const reserveValueLong = useAppStore((state) =>
    selectReserveValue(state, market, true)
  );
  const reserveValueShort = useAppStore((state) =>
    selectReserveValue(state, market, false)
  );
  const availableLiquidityLong = useAppStore((state) =>
    selectAvailableLiquidity(state, market, true)
  );
  const availableLiquidityShort = useAppStore((state) =>
    selectAvailableLiquidity(state, market, false)
  );
  const fundingFactor = useAppStore((state) =>
    selectFundingFactor(state, market)
  );
  const openInterest = useAppStore((state) =>
    selectOpenInterest(state, market)
  );
  const fundingRates = useAppStore((state) =>
    selectFundingRates(state, market)
  );
  const netRates = useAppStore((state) => selectNetRates(state, market));

  useEffect(() => {
    setPriceUpdated((count) => count + 1);
  }, [price]);

  useEffect(() => {
    setMarketUpdated((count) => count + 1);
  }, [market]);

  useEffect(() => {
    setBorrowingUpdated((count) => count + 1);
  }, [borrowingRates]);

  useEffect(() => {
    setFundingUpdated((count) => count + 1);
  }, [fundingRates]);

  useEffect(() => {
    setAvailableLiquidityUpdated((count) => count + 1);
  }, [availableLiquidityLong, availableLiquidityShort]);

  return (
    <div>
      <div>Market Updated: {marketUpdated}</div>
      <div>Price Updated: {priceUpdated}</div>
      <div>Borrowing Updated: {borrowingUpdated}</div>
      <div>Funding Updated: {fundingUpdated}</div>
      <div>Available Liquidity Updated: {availableLiquidityUpdated}</div>
      <div>Address: {market.marketTokenAddress.toBase58()}</div>
      <div>Index: {formatUsd(price)}</div>
      <div>
        Open Interest: {formatUsd(openInterest?.long)},{' '}
        {formatUsd(openInterest?.short)}
      </div>
      <div>
        Reserve Value: {formatUsd(reserveValueLong)},{' '}
        {formatUsd(reserveValueShort)}
      </div>
      <div>
        Available Liquidity: {formatUsd(availableLiquidityLong)},{' '}
        {formatUsd(availableLiquidityShort)}
      </div>
      <div>
        Borrowing:{' '}
        {formatRatePercentage(
          borrowingRates?.borrowingRateLong?.muln(DURATION)
        )}
        ,{' '}
        {formatRatePercentage(
          borrowingRates?.borrowingRateShort?.muln(DURATION)
        )}
      </div>
      {/* <div>
        Funding Factor: {formatRatePercentage(fundingFactor?.muln(CHART_PERIODS['1h']))}
      </div> */}
      <div>
        Funding Rates:{' '}
        {formatRatePercentage(fundingRates?.fundingRateLong?.muln(DURATION))},{' '}
        {formatRatePercentage(fundingRates?.fundingRateShort?.muln(DURATION))}{' '}
        (factor: {formatRatePercentage(fundingFactor?.muln(DURATION))})
      </div>
      <div>
        Net Rates: {formatRatePercentage(netRates?.netRateLong?.muln(DURATION))}
        , {formatRatePercentage(netRates?.netRateShort?.muln(DURATION))}
      </div>
    </div>
  );
};

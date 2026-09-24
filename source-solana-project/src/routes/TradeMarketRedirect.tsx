import { Navigate, useLocation } from 'react-router-dom';
import { getGmw422Enabled } from '@/config/featureFlagEnable';
import { DEFAULT_TRADE_MARKET_SLUG } from '@/utils/market/marketSlug';
import { resolveBareTradeRedirectPath } from '@/utils/market/selectedIndexToken';

export default function TradeMarketRedirect() {
  const location = useLocation();

  const to = getGmw422Enabled()
    ? resolveBareTradeRedirectPath(location.search)
    : `/trade/${DEFAULT_TRADE_MARKET_SLUG}${location.search}`;

  return (
    <Navigate
      to={to}
      replace
      state={location.state}
    />
  );
}

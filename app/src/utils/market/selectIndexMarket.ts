import { NavigateFunction } from 'react-router-dom';
import { getGmw235Enabled, getGmw422Enabled } from '@/config/featureFlagEnable';
import { useAppStore } from '@/zustand/useAppStore';
import { getCanonicalTradePath, indexTokenToSlug } from './marketSlug';
import { setSelectedIndexToken } from './selectedIndexToken';

type SelectIndexMarketParams = {
  indexToken: string;
  tokenData?: unknown;
  search?: string;
};

export function selectIndexMarket(
  navigate: NavigateFunction,
  {
    indexToken,
    tokenData,
    search = '',
  }: SelectIndexMarketParams
) {
  const {
    setIndexToken,
    setIndexTokenData,
    setHasIndexTokenChange,
  } = useAppStore.getState().indexTokens;

  setHasIndexTokenChange(true);
  setIndexToken(indexToken);
  if (getGmw422Enabled()) {
    setSelectedIndexToken(indexToken);
  } else {
    sessionStorage.setItem('selectedIndexToken', indexToken);
  }

  if (tokenData) {
    setIndexTokenData(tokenData);
  }

  if (!getGmw235Enabled()) {
    return;
  }

  const slug = indexTokenToSlug(indexToken);
  if (!slug) {
    return;
  }

  navigate(`${getCanonicalTradePath(slug)}${search}`);
}

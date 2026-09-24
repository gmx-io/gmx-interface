import { useLayoutEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getGmw235Enabled, getGmw422Enabled } from '@/config/featureFlagEnable';
import useSocketStore from '@/zustand/socketStore';
import { useAppStore } from '@/zustand/useAppStore';
import {
  buildSlugToIndexTokenMap,
  DEFAULT_TRADE_MARKET_SLUG,
  getCanonicalTradePath,
  indexTokenToSlug,
  normalizeSlug,
  resolveSlugToIndexToken,
} from '@/utils/market/marketSlug';
import { setSelectedIndexToken } from '@/utils/market/selectedIndexToken';

export function useTradeMarketRoute() {
  const enabled = getGmw235Enabled();
  const { marketSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const indexTokens = useSocketStore((state) => state.indexTokens);
  const { setIndexToken, setIndexTokenData, setHasIndexTokenChange } =
    useAppStore((state) => state.indexTokens);

  const slugMap = useMemo(() => {
    if (!enabled || !Array.isArray(indexTokens) || indexTokens.length === 0) {
      return null;
    }

    return buildSlugToIndexTokenMap(indexTokens);
  }, [enabled, indexTokens]);

  // URL → store only. Do not depend on indexToken (avoids overwriting optimistic
  // selectIndexMarket updates before navigate applies the new slug).
  useLayoutEffect(() => {
    if (!enabled || !marketSlug) {
      return;
    }

    const resolvedMint = resolveSlugToIndexToken(marketSlug, slugMap ?? undefined);
    if (!resolvedMint) {
      navigate(
        `${getCanonicalTradePath(DEFAULT_TRADE_MARKET_SLUG)}${location.search}`,
        { replace: true }
      );
      return;
    }

    const canonicalSlug = indexTokenToSlug(resolvedMint);
    if (canonicalSlug && normalizeSlug(marketSlug) !== canonicalSlug) {
      navigate(`${getCanonicalTradePath(canonicalSlug)}${location.search}`, {
        replace: true,
      });
      return;
    }

    const currentIndexToken = useAppStore.getState().indexTokens.indexToken;

    if (resolvedMint === currentIndexToken) {
      if (Array.isArray(indexTokens)) {
        const tokenData = indexTokens.find(
          (token) => token.indexToken === resolvedMint
        );
        if (tokenData) {
          setIndexTokenData(tokenData);
        }
      }
      return;
    }

    setHasIndexTokenChange(true);
    setIndexToken(resolvedMint);
    if (getGmw422Enabled()) {
      setSelectedIndexToken(resolvedMint);
    } else {
      sessionStorage.setItem('selectedIndexToken', resolvedMint);
    }

    if (Array.isArray(indexTokens)) {
      const tokenData = indexTokens.find(
        (token) => token.indexToken === resolvedMint
      );
      if (tokenData) {
        setIndexTokenData(tokenData);
      }
    }
  }, [
    enabled,
    indexTokens,
    location.search,
    marketSlug,
    navigate,
    setHasIndexTokenChange,
    setIndexToken,
    setIndexTokenData,
    slugMap,
  ]);
}

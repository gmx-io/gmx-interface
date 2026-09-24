import GlvDetail from '@/components/Pools/components/GlvDetail';
import Header from '@/components/NewHeader/Header';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BlockUsIpModal } from '@/components/BlockUsIpModal';
import { normalizePoolDetailRouteType } from '@/components/Pools/utils/poolDetailRoute';
import { buildGmListData } from '@/components/Pools/utils/buildGmListData';
import { useMarkets } from '@/components/Pools/Hooks/useMarkets';
import { useGlvMarkets } from '@/components/Pools/Hooks/useGlvMarkets';
import { useTokenPriceMap } from '@/components/Pools/Hooks/useTokenPriceMap';
import { getBalanceMap } from '@/components/Pools/utils/getBalanceMap';
import { GMX_SOLANA_GLV_TOKENS } from '@/config/program';
import { IS_DEVELOPMENT } from '@/config/env';

type PoolType = 'GLV' | 'GM';
type PoolInfo = {
    marketToken?: string;
    glvToken?: string;
    operationType?: string;
    [key: string]: unknown;
};

const isPoolInfo = (pool: unknown): pool is PoolInfo => (
    typeof pool === 'object' && pool !== null
);

const hasRenderablePoolInfo = (linkInfo: {
    poolType?: string;
    poolAddress?: string;
    poolInfo?: unknown;
}) => {
    if (!linkInfo.poolType || !linkInfo.poolAddress || !isPoolInfo(linkInfo.poolInfo)) {
        return false;
    }

    if (linkInfo.poolType === 'GLV') {
        return Boolean(linkInfo.poolInfo.glvToken || linkInfo.poolInfo.marketToken);
    }

    if (linkInfo.poolType === 'GM') {
        return Boolean(linkInfo.poolInfo.marketToken);
    }

    return false;
};

const decodePoolAddress = (poolAddress?: string) => {
    if (!poolAddress) {
        return '';
    }

    try {
        return decodeURIComponent(poolAddress);
    } catch {
        return poolAddress;
    }
};

const getPoolInfoVersion = (poolInfo?: PoolInfo) => {
    if (!poolInfo) {
        return '';
    }
    const data = poolInfo as any;

    return [
        data.marketToken,
        data.glvToken,
        data.operationType,
        data.tvlUsdBn?.toString?.() || data.tvlUsdBn,
        data.tvlUsdBnStr,
        Array.isArray(data.markets)
            ? data.markets
                .map((market: any) =>
                    [
                        market?.marketToken,
                        market?.tvlUsdBn?.toString?.() || market?.tvlUsdBn,
                        market?.capUsdBn?.toString?.() || market?.capUsdBn,
                        market?.composition,
                    ].join(':')
                )
                .join('|')
            : '',
    ].join('::');
};

const GlvDetailCom = () => {
    const {
        linkInfo,
        glvListData,
        gmListData,
        setLinkInfo,
    } = useAppStore(state => state.pools);
    const navigate = useNavigate();
    const {
        poolType: routePoolTypeParam,
        poolAddress: routePoolAddressParam,
    } = useParams();
    const { marketInfosMap, allMarketInfos } = useMarkets();
    const { glvs } = useGlvMarkets(GMX_SOLANA_GLV_TOKENS);
    const { tokenPriceMap } = useTokenPriceMap();
    const { balanceMap, connected } = getBalanceMap();
    const routePoolType = normalizePoolDetailRouteType(routePoolTypeParam);
    const hasRouteParams = Boolean(routePoolTypeParam || routePoolAddressParam);
    const routePoolAddress = useMemo(
        () => decodePoolAddress(routePoolAddressParam),
        [routePoolAddressParam]
    );
    const liveGmListData = useMemo(() => {
        if (!allMarketInfos?.length) {
            return [];
        }

        return buildGmListData({
            allMarketInfos,
            glvs,
            marketInfosMap,
            tokenPriceMap,
            balanceMap,
            connected,
        });
    }, [allMarketInfos, balanceMap, connected, glvs, marketInfosMap, tokenPriceMap]);
    const routeLinkInfo = useMemo(() => {
        if (!routePoolType || !routePoolAddress) {
            return undefined;
        }

        const sourceList = routePoolType === 'GLV'
            ? glvListData
            : IS_DEVELOPMENT
                ? [...liveGmListData, ...gmListData]
                : [...gmListData, ...liveGmListData];
        const matchedPool = (sourceList as unknown[])?.find((pool): pool is PoolInfo => {
            if (!isPoolInfo(pool)) {
                return false;
            }

            if (routePoolType === 'GLV') {
                return pool.marketToken === routePoolAddress || pool.glvToken === routePoolAddress;
            }

            return pool.marketToken === routePoolAddress;
        });

        if (!matchedPool) {
            return undefined;
        }

        const currentPoolInfo = isPoolInfo(linkInfo.poolInfo) ? linkInfo.poolInfo : {};
        const isSameRoutePool =
            linkInfo.poolType === routePoolType &&
            (
                linkInfo.poolAddress === routePoolAddress ||
                currentPoolInfo.marketToken === routePoolAddress ||
                currentPoolInfo.glvToken === routePoolAddress ||
                currentPoolInfo.marketToken === matchedPool.marketToken ||
                currentPoolInfo.glvToken === matchedPool.glvToken
            );
        const shouldKeepOperation = isSameRoutePool && currentPoolInfo.operationType;
        const poolAddress = matchedPool.marketToken || matchedPool.glvToken || routePoolAddress;

        return {
            poolType: routePoolType,
            poolAddress,
            poolInfo: {
                ...matchedPool,
                operationType: shouldKeepOperation ? currentPoolInfo.operationType : 'buy',
            },
        };
    }, [glvListData, gmListData, linkInfo, liveGmListData, routePoolAddress, routePoolType]);

    useEffect(() => {
        if (!routeLinkInfo) {
            return;
        }

        const currentPoolInfo = isPoolInfo(linkInfo.poolInfo) ? linkInfo.poolInfo : {};

        if (
            linkInfo.poolType === routeLinkInfo.poolType &&
            linkInfo.poolAddress === routeLinkInfo.poolAddress &&
            currentPoolInfo.marketToken === routeLinkInfo.poolInfo.marketToken &&
            (
                !IS_DEVELOPMENT ||
                getPoolInfoVersion(currentPoolInfo) === getPoolInfoVersion(routeLinkInfo.poolInfo)
            )
        ) {
            return;
        }

        setLinkInfo(routeLinkInfo);
        sessionStorage.setItem('linkInfo', JSON.stringify(routeLinkInfo));
    }, [linkInfo, routeLinkInfo, setLinkInfo]);

    const shouldRedirectToPools =
        (hasRouteParams && (!routePoolType || !routePoolAddress)) ||
        (!hasRouteParams && !hasRenderablePoolInfo(linkInfo));

    const fallbackRouteLinkInfo = useMemo(() => {
        if (!routePoolType || !routePoolAddress) {
            return undefined;
        }

        return {
            poolType: routePoolType,
            poolAddress: routePoolAddress,
            poolInfo: {
                marketToken: routePoolAddress,
                ...(routePoolType === 'GLV' ? { glvToken: routePoolAddress } : {}),
                operationType: 'buy',
            },
        };
    }, [routePoolAddress, routePoolType]);

    useEffect(() => {
        if (shouldRedirectToPools) {
            navigate('/pools', { replace: true });
        }
    }, [navigate, shouldRedirectToPools]);

    const currentPoolInfo = isPoolInfo(linkInfo.poolInfo) ? linkInfo.poolInfo : {};
    const isRouteLinkInfoCurrent =
        routePoolType &&
        routePoolAddress &&
        linkInfo.poolType === routePoolType &&
        linkInfo.poolAddress === routePoolAddress &&
        currentPoolInfo.marketToken;
    const effectiveLinkInfo = routeLinkInfo
        || (isRouteLinkInfoCurrent ? linkInfo : undefined)
        || fallbackRouteLinkInfo
        || (!hasRouteParams && hasRenderablePoolInfo(linkInfo) ? linkInfo : undefined);

    if (!effectiveLinkInfo || shouldRedirectToPools) {
        return (
            <div className="pools">
                <div className="header">
                    <Header isPools={true} />
                </div>
                <BlockUsIpModal />
            </div>
        );
    }

    return (
        <div className="pools">
            <div className="header">
                <Header isPools={true} />
            </div>
            <BlockUsIpModal />
            <GlvDetail
                poolType={effectiveLinkInfo.poolType as PoolType}
                poolAddress={effectiveLinkInfo.poolAddress}
                poolData={isPoolInfo(effectiveLinkInfo.poolInfo) ? effectiveLinkInfo.poolInfo : {}}
                onClose={() => {
                    navigate(-1);
                }}
            />
        </div>
    )
}

export default GlvDetailCom;

import {
  getGmw235Enabled,
  getGmw329Enabled,
  getGmw35Enabled,
  getGmw403Enabled,
  getGmw430Enabled,
  getGmw431Enabled,
} from '@/config/featureFlagEnable';
import { LANGUAGE_LOCALSTORAGE_KEY } from '@/config/localStorage';

import { AnchorStateContext, AnchorStateProvider } from '@/contexts/anchor';
import ClusterGuard from '@/routes/ClusterGuard';
import Pools from '@/routes/Pools';
import Stake from '@/routes/Stake';
import Exchange from '@/routes/Exchange';
import TradeMarketRedirect from '@/routes/TradeMarketRedirect';
import GtBoard from '@/routes/GtBoard';
import Landing from '@/routes/Landing';
import NewLanding from '@/routes/NewLanding';
import PoolsDetail from '@/routes/PoolsDetail';
import GlvDataProvider from '@/components/Pools/GlvDataProvider';
import PoolsOverview from '@/components/Pools/Overview';
import Root from '@/routes/Root';
import Stats from '@/routes/Stats';
import { defaultLocale, dynamicActivate } from '@/utils/lib/i18n';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import {
  Component,
  ComponentType,
  Fragment,
  LazyExoticComponent,
  ReactNode,
  Suspense,
  lazy,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  Navigate,
  RouteObject,
  RouterProvider,
} from 'react-router-dom';
import { createBrowserRouter } from '@datadog/browser-rum-react/react-router-v6';
import { SWRConfig, SWRConfiguration } from 'swr';
import ComingSoonPage from './routes/ComingSoonPage';
import NotFoundPage from './routes/NotFoundPage';
import NewReferral from './routes/NewReferral';
import Referrals from './routes/Referrals';
import ReferralLink from './routes/ReferralLink';
import { getApyData as fetchApyData } from '@/components/Pools/utils/getApyData';
import AppRouteErrorBoundary from '@/components/ErrorBoundary/AppRouteErrorBoundary';

const lazyRoutePreloaders: Array<() => Promise<unknown>> = [];

function lazyWithPreload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(factory) as LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>;
  };

  LazyComponent.preload = factory;
  lazyRoutePreloaders.push(() => LazyComponent.preload());

  return LazyComponent;
}

const Portfolio = lazyWithPreload(() => import('@/routes/Portfolio'));
const CommunityBoard = lazyWithPreload(() => import('@/routes/CommunityBoard'));
const Competition = lazyWithPreload(() => import('@/routes/Competition'));
const Dev = lazyWithPreload(() =>
  import('@/routes/Dev').then((module) => ({ default: module.Dev }))
);

function withRouteSuspense(node: ReactNode) {
  return <Suspense fallback={null}>{node}</Suspense>;
}

function TradeExchangeRoute() {
  return getGmw329Enabled() ? (
    <Gmw329TradeRouteGuard>
      <Gmw329TradeRouteRecoveryBoundary>
        <Exchange />
      </Gmw329TradeRouteRecoveryBoundary>
    </Gmw329TradeRouteGuard>
  ) : (
    <Exchange />
  );
}

function Gmw329TradeRouteGuard({ children }: { children: ReactNode }) {
  const anchorState = useContext(AnchorStateContext);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(Boolean(anchorState));
  }, [anchorState]);

  if (!anchorState || !isReady) {
    return null;
  }

  return <>{children}</>;
}

type Gmw329RecoveryProps = { children: ReactNode };
type Gmw329RecoveryState = {
  failed: boolean;
  retryKey: number;
  error: Error | null;
};

// Scoped recovery boundary for the /trade route under FEATURE_NIGHTLY_GMW_329.
// During initial render and route switches the subtree can momentarily read a
// not-yet-ready zustand store, which surfaces as
// "Cannot read properties of null (reading 'getSnapshot')". Rather than letting
// that transient error escalate to the global AppErrorBoundary (full-page crash
// + APP_CRASH report), remount the subtree a bounded number of times so it can
// settle. Only a persistent error is rethrown to the global boundary.
class Gmw329TradeRouteRecoveryBoundary extends Component<
  Gmw329RecoveryProps,
  Gmw329RecoveryState
> {
  private static MAX_RETRIES = 2;
  private attempts = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  state: Gmw329RecoveryState = { failed: false, retryKey: 0, error: null };

  static getDerivedStateFromError(error: Error): Partial<Gmw329RecoveryState> {
    return { failed: true, error };
  }

  componentDidCatch() {
    if (this.attempts >= Gmw329TradeRouteRecoveryBoundary.MAX_RETRIES) {
      return;
    }
    this.attempts += 1;
    this.retryTimer = setTimeout(() => {
      this.setState((prev) => ({
        failed: false,
        error: null,
        retryKey: prev.retryKey + 1,
      }));
    }, 0);
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    if (this.state.failed) {
      if (
        this.attempts >= Gmw329TradeRouteRecoveryBoundary.MAX_RETRIES &&
        this.state.error
      ) {
        // Retries exhausted: rethrow so the global AppErrorBoundary handles it.
        throw this.state.error;
      }
      // Between catch and the scheduled retry: render nothing.
      return null;
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
  }
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <ClusterGuard />,
    children: [
      {
        path: '/',
        element: <Root />,
        errorElement: <AppRouteErrorBoundary />,
        children: [
          {
            path: '',
            element: <NewLanding />,
          },
          {
            path: 'new-landing',
            element: <Navigate to="/" replace />,
          },
          {
            path: 'old-landing',
            element: <Landing />,
          },
          {
            path: 'dashboard',
            element: <ComingSoonPage />,
          },
          {
            path: 'stats',
            element: <Stats />,
            // element: <ComingSoonPage />,
          },
          {
            path: 'earn',
            element: <ComingSoonPage />,
          },
          {
            path: 'pools',
            element: (
              <GlvDataProvider>
                <Pools />
              </GlvDataProvider>
            ),
            children: [
              {
                index: true,
                element: <PoolsOverview />,
              },
              {
                path: 'list',
                element: <PoolsOverview />,
              },
            ],
          },
          {
            path: 'pools/poolDetail',
            element: (
              <GlvDataProvider>
                <PoolsDetail />
              </GlvDataProvider>
            ),
          },
          {
            path: 'pools/poolDetail/:poolType/:poolAddress',
            element: (
              <GlvDataProvider>
                <PoolsDetail />
              </GlvDataProvider>
            ),
          },
          // {
          //   path: 'pools',
          //   // element: <ComingSoonPage />,
          //   element: <Pools />,
          // },
          // {
          //   path: 'pools/poolDetail',
          //   // element: <ComingSoonPage />,
          //   element: <PoolsDetail />,
          // },
          // {
          //   path: 'stake',
          //   element: <ComingSoonPage />,
          // },
          getGmw235Enabled()
            ? {
              path: 'trade',
              children: [
                {
                  index: true,
                  element: <TradeMarketRedirect />,
                },
                {
                  path: ':marketSlug',
                  element: <TradeExchangeRoute />,
                },
              ],
            }
            : {
              path: 'trade',
              element: <TradeExchangeRoute />,
            },
          getGmw431Enabled()
            ? {
              path: 'gt',
              children: [
                {
                  index: true,
                  element: <Navigate to="my" replace />,
                },
                {
                  path: ':tab',
                  element: <GtBoard />,
                },
              ],
            }
            : {
              path: 'gt',
              element: <GtBoard />,
            },
          {
            path: 'leaderboard',
            element: <ComingSoonPage />,
          },
          {
            path: 'competitions',
            element: <ComingSoonPage />,
          },
          {
            path: 'referrals',
            element:
              getGmw403Enabled() && getGmw430Enabled() ? (
                <NewReferral />
              ) : (
                <Referrals />
              ),
          },
          {
            path: 'portfolio',
            element: withRouteSuspense(<Portfolio />),
          },
          {
            path: 'community',
            element: withRouteSuspense(<CommunityBoard />),
          },
          {
            path: 'competition',
            element: withRouteSuspense(<Competition />),
          },
          {
            path: 'stake',
            element: <Stake />,
          },
          ...(getGmw35Enabled()
            ? ([
              {
                path: 'r',
                element: <ReferralLink />,
              },
              {
                path: 'r/:code',
                element: <ReferralLink />,
              },
            ] satisfies RouteObject[])
            : []),
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
      {
        path: '/dev',
        element: withRouteSuspense(<Dev />),
      },
    ],
  },
]);

const swrConfig = {
  // TODO: Remove this once the issue with `useSWR` for debugging
  revalidateOnFocus: false,
  revalidateIfStale: false,
  dedupingInterval: 10000,
  keepPreviousData: true,
  revalidateOnReconnect: true,
  onError: (error) => {
    // Ignore expected errors
    if (
      error instanceof Error &&
      (error.name === 'AbortError' ||
        error.message.includes('cancelled') ||
        error.message.includes('rate limit') ||
        error.message.includes('Account does not exist'))
    ) {
      return;
    }

    // Handle network errors
    if (error instanceof Error && error.message.includes('network')) {
      console.warn('[SWR] Network error:', {
        type: 'network',
        message: error.message,
        // Avoid logging full stack trace
        stack: error.stack?.split('\n')[0],
      });
      return;
    }

    // Handle API errors
    if (error instanceof Error && error.message.includes('API')) {
      console.warn('[SWR] API error:', {
        type: 'api',
        message: error.message,
        stack: error.stack?.split('\n')[0],
      });
      return;
    }

    // Other errors
    console.warn('[SWR] Unexpected error:', {
      message: error instanceof Error ? error.message : String(error),
    });
  },
  errorRetryCount: 3,
  shouldRetryOnError: (error) => {
    // Don't retry on account not exist errors
    if (
      error instanceof Error &&
      error.message.includes('Account does not exist')
    ) {
      return false;
    }
    // Only retry on network errors
    return error instanceof Error && error.message.includes('network');
  },
} satisfies SWRConfiguration;

export function App() {
  useEffect(() => {
    const preloadRoutes = () => {
      void Promise.allSettled(
        lazyRoutePreloaders.map((preloadRoute) => preloadRoute())
      );
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(
        () => {
          preloadRoutes();
        },
        { timeout: 2000 }
      );

      return () => {
        idleWindow.cancelIdleCallback?.(idleId);
      };
    }

    const preloadTimer = window.setTimeout(() => {
      preloadRoutes();
    }, 800);

    return () => {
      window.clearTimeout(preloadTimer);
    };
  }, []);

  useEffect(() => {
    const supportedLanguages = [
      'de',
      'en',
      'es',
      'fr',
      'ja',
      'ko',
      'pseudo',
      'ru',
      'zh',
      'zh_TW',
      'pt',
    ];

    const savedLanguage = localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY);
    const browserLanguage = navigator.language.split('-')[0];

    const selectedLanguage =
      savedLanguage && supportedLanguages.includes(savedLanguage)
        ? savedLanguage
        : supportedLanguages.includes(browserLanguage)
          ? browserLanguage
          : defaultLocale;

    void dynamicActivate(selectedLanguage);
  }, []);

  useEffect(() => {
    void fetchApyData();
  }, []);

  // useEffect(() => {
  //   if (referrer === undefined) return;

  //   const urlParams = new URLSearchParams(window.location.search);
  //   const refCode = urlParams.get('ref');

  //   if (refCode) {
  //     if (referrer) {
  //       window.history.replaceState({}, '', window.location.pathname);
  //     } else if (!window.location.pathname.includes('/referrals')) {
  //       window.history.pushState({}, '', `/r/${refCode}`);
  //     }
  //     sessionStorage.setItem('pending_referral_code', refCode);
  //   }
  // }, [referrer]);

  return (
    <I18nProvider i18n={i18n}>
      <SWRConfig value={swrConfig}>
        <AnchorStateProvider>
          <RouterProvider router={router} />
        </AnchorStateProvider>
      </SWRConfig>
    </I18nProvider>
  );
}

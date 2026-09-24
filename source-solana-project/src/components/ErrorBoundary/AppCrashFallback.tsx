import StatusPage from '@/components/StatusPage/StatusPage';
import imgOops from '@/img/error/oops.png';
import { t } from '@lingui/macro';
import { MouseEvent, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getGmw235Enabled } from '@/config/featureFlagEnable';
import { isTradePathname } from '@/utils/market/marketSlug';
const TRADE_ROUTE_CRASH_BODY_CLASS = 'trade-route-crash';

type AppCrashFallbackProps = {
  errorCode?: string;
  showMobileHeader?: boolean;
  onReset?: () => void;
};

export default function AppCrashFallback({
  errorCode,
  showMobileHeader = true,
  onReset,
}: AppCrashFallbackProps) {
  const location = useLocation();

  useEffect(() => {
    const isTradeRoute = getGmw235Enabled()
      ? isTradePathname(location.pathname)
      : location.pathname === '/trade';
    if (!isTradeRoute) {
      return;
    }

    document.body.classList.add(TRADE_ROUTE_CRASH_BODY_CLASS);

    return () => {
      document.body.classList.remove(TRADE_ROUTE_CRASH_BODY_CLASS);
    };
  }, [location.pathname]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    onReset?.();
    window.location.assign('/trade');
  };

  return (
    <StatusPage
      illustrationSrc={imgOops}
      illustrationAlt="Error"
      illustrationVariant="oops"
      title={t`Oops! Something went wrong.`}
      subtitle={t`Please try again or go back to the homepage.`}
      errorReference={
        errorCode ? t`Error Reference: ${errorCode}` : undefined
      }
      actions={[
        {
          label: t`Reload`,
          onClick: handleReload,
        },
        {
          label: t`Go to homepage`,
          to: '/trade',
          onClick: handleGoHome,
        },
      ]}
      showMobileHeader={showMobileHeader}
      onLogoClick={handleGoHome}
    />
  );
}

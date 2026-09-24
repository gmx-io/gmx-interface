import 'react-toastify/dist/ReactToastify.css';

import { TOAST_AUTO_CLOSE_TIME } from '@/config/ui';
import { PendingStateProvider } from '@/contexts/pending';
import { SorterContextProvider } from '@/contexts/sorter/SorterContextProvider';
import { useLocation } from 'react-router-dom';
import {
  getGmw235Enabled,
  getGmw404Enabled,
} from '@/config/featureFlagEnable';
import { isTradePathname } from '@/utils/market/marketSlug';
import { isNewLandingRoute } from '@/utils/routes/isNewLandingRoute';
import { LinguiLocaleOutlet } from '@/components/Common/LinguiLocaleOutlet';
import AppCrashSnapshotSync from '@/components/ErrorBoundary/AppCrashSnapshotSync';
import AppErrorBoundary from '@/components/ErrorBoundary/AppErrorBoundary';
import { useSubscribeLinguiLocale } from '@/utils/lib/i18n';
import { cssTransition, ToastContainer } from 'react-toastify';
import NoticeWindow from '@/components/NoticeWindow';
import DataFetcher from '@/components/DataFetcher/DataFetcher';
import { NoticeContainer } from '@/components/NoticeContainer';
import { useMedia } from 'react-use';
import BottomNavigation from '@/components/BottomNavigation/BottomNavigation';
import BottomPop from '@/components/BottomNavigation/BottomPop/BottomPop';
import RightNavigation from '@/components/RightNavigation/RightNavigation';
import LanguageSelector from '@/components/SideNav/LanguageNav';
import ReferralModalHost from '@/components/Referrals/Referral/ReferralModalHost';

import { useState } from 'react';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useSupportChat } from '@/domain/supportChat/useSupportChat';
const Zoom = cssTransition({
  enter: 'zoom-in',
  exit: 'zoom-out',
  appendPosition: false,
  collapse: true,
  collapseDuration: 200,
});

export default function Root() {
  useSubscribeLinguiLocale();
  useSupportChat();
  const location = useLocation();
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isMobile = useMedia('(max-width: 768px)');
  const [isBottomPopOpen, setIsBottomPopOpen] = useState(false);

  const isTradeRoute = getGmw235Enabled()
    ? isTradePathname(location.pathname)
    : location.pathname === '/trade';
  const isLandingPage = location.pathname === '/';
  const hideAppChrome = isLandingPage || isNewLandingRoute(location.pathname);

  const {
    isRightNavigationOpen,
    setIsRightNavigationOpen,
    isOpenLanguage,
    setIsOpenLanguage,
  } = useAppStore(
    useShallow((state) => ({
      isRightNavigationOpen: state.settings.isRightNavigationOpen,
      setIsRightNavigationOpen: state.settings.setIsRightNavigationOpen,
      isOpenLanguage: state.settings.isOpenLanguage,
      setIsOpenLanguage: state.settings.setIsOpenLanguage,
    }))
  );

  const handleToggleBottomPop = (isOpen: boolean) => {
    setIsBottomPopOpen(isOpen);
  };

  const handleCloseBottomPop = () => {
    setIsBottomPopOpen(false);
  };

  const handleCloseRightNavigation = () => {
    setIsRightNavigationOpen(false);
  };

  return (
    <PendingStateProvider enabled={!hideAppChrome}>
      <SorterContextProvider>
        <div className="App">
          <div
            className={`App-content ${isMobile ? '' : 'h-screen'} overflow-hidden ${isScreen1024 && isTradeRoute ? 'has-bottom-nav' : ''}`}
          >
            <AppErrorBoundary
              resetKey={location.key}
              withAppChrome
              hideAppChrome={hideAppChrome}
              showFooter={!hideAppChrome && !isScreen1024}
            >
              <DataFetcher />
              <AppCrashSnapshotSync />
              <LinguiLocaleOutlet />
              {isScreen1024 && isTradeRoute && (
                <>
                  {!isBottomPopOpen && (
                    <BottomNavigation
                      onTogglePop={handleToggleBottomPop}
                      isPopOpen={isBottomPopOpen}
                    />
                  )}
                  <BottomPop
                    isOpen={isBottomPopOpen}
                    onClose={handleCloseBottomPop}
                  />
                </>
              )}

              <ToastContainer
                limit={1}
                theme="dark"
                transition={Zoom}
                position="bottom-right"
                autoClose={TOAST_AUTO_CLOSE_TIME}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick={false}
                draggable={false}
                pauseOnHover
              />

              <NoticeWindow />
              <NoticeContainer />
              {getGmw404Enabled() && <ReferralModalHost />}
            </AppErrorBoundary>

            {isOpenLanguage && (
              <LanguageSelector
                isVisible={isOpenLanguage}
                setIsVisible={setIsOpenLanguage}
                onClose={() => handleCloseRightNavigation()}
              />
            )}

            {isScreen1024 && (
              <RightNavigation
                isOpen={isRightNavigationOpen}
                onClose={handleCloseRightNavigation}
              />
            )}
          </div>
        </div>
      </SorterContextProvider>
    </PendingStateProvider>
  );
}

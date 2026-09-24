import { Link } from 'react-router-dom';
// import logo_new from '@/img/logo_new.svg';
// import logo_gmx_solana_24 from '@/img/logo_gmx_solana_24.svg';
import { ResponsiveLogo } from '@/components/Common/ResponsiveLogo';
import { AppHeaderUser } from '../Header/AppHeaderUser';
import './Header.scss';
import { useAppStore } from '@/zustand/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useGtUserDetails } from '@/hooks/fetchHooks/useGtUserDetails';
import { useEffect } from 'react';
import TradeHeader from '../TradeHeader/Header';
import { useMedia } from 'react-use';
import HeaderLeft from '../Pools/HeaderLeft/HeaderLeft';
import cx from 'classnames';
// import GTHeader from '../GT/GTHeader';
import { useLocation } from 'react-router-dom';
import { getGmw235Enabled, getGmw430Enabled } from '@/config/featureFlagEnable';
import { isTradePathname } from '@/utils/market/marketSlug';
const Header = ({
  children,
  isPools: isPools = false,
  isTrade: isTrade = false,
  isStats: isStats = false,
  isReferral: isReferral = false,
  isGt: isGt = false,
}: {
  children?: React.ReactNode;
  isPools?: boolean;
  isStats?: boolean;
  isReferral?: boolean;
  isTrade?: boolean;
  isGt?: boolean;
}) => {
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const isScreen870 = useMedia('(max-width: 870px)');
  const isMobile = useMedia('(max-width: 768px)');
  const isMaxScreen = useMedia('(min-width: 1025px)');
  useFetchGtUserDetails();
  const location = useLocation();
  const isTradeRoute = getGmw235Enabled()
    ? isTradePathname(location.pathname)
    : location.pathname === '/trade';
  const isGmw430Referral = isReferral && getGmw430Enabled();
  return (
    <header
      data-qa="header"
      className="App-header-container App-header-top-container"
      style={isGmw430Referral ? { height: 'auto' } : undefined}
    >
      <div
        className={cx(
          'App-header flex gap-8',
          isGmw430Referral && isScreen1024 && !isScreen870
            ? 'pr-[20px]'
            : isGmw430Referral
              ? 'pr-[8px]'
              : 'pr-[0.8rem]'
        )}
        style={{
          paddingLeft:
            isScreen1024 && isGmw430Referral && !isScreen870
              ? '20px'
              : isScreen1024
                ? isGmw430Referral
                  ? '8px'
                  : '0.8rem'
                : '',
          paddingTop: isGmw430Referral ? '6.94px' : '',
          paddingBottom: isGmw430Referral ? '6.94px' : '0.8rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {isTrade && (
          <div className="App-header-container-left h-[4rem] min-w-0 flex-1">
            {(isScreen1024 || isMobile) && <ResponsiveLogo />}
            {children}
          </div>
        )}
        {isPools && (
          <div className="App-header-container-left min-w-0 flex-1">
            {(isScreen1024 || isMobile) && <ResponsiveLogo className="mr-4" />}
            {!isMobile && <HeaderLeft isShowSign={false} />}
          </div>
        )}
        {isStats && (
          <div className="App-header-container-left  h-[3.2rem] min-w-0 flex-1">
            {(isScreen1024 || isMobile) && <ResponsiveLogo className="mr-4" />}
            {/* {!isMobile && <HeaderLeft />} */}
          </div>
        )}
        {isReferral && (
          <div
            className={`App-header-container-left min-w-0 flex-1 ${isGmw430Referral ? 'h-auto' : 'h-[3.2rem]'}`}
          >
            {(isScreen1024 || isMobile) && <ResponsiveLogo className="mr-4" />}
            {/* {!isMobile && <HeaderLeft />} */}
          </div>
        )}
        {isGt && (
          <div className="App-header-container-left  h-[3.2rem] min-w-0 flex-1">
            {(isScreen1024 || isMobile) && <ResponsiveLogo className="mr-4" />}
            {/* {!isMobile && <GTHeader />} */}
          </div>
        )}
        <div className="App-header-container-right App-header-container-other relative z-[20] flex">
          {/* <GtBalanceDisplay /> */}
          <AppHeaderUser />
          {/* <ConnectWalletButton
            small={small}
            onConnect={openConnectModal}
            onCancel={disconnectAccountAndCloseSettings}
            connecting={connecting}
            disconnecting={disconnecting}
          /> */}
        </div>
      </div>
      {isScreen1024 && isTradeRoute && (
        <div className="responsive-margin">
          <TradeHeader />
        </div>
      )}
    </header>
  );
};

export default Header;

const useFetchGtUserDetails = () => {
  const { setUserDetails, setIsLoading } = useAppStore(
    useShallow((state) => ({
      setUserDetails: state.gtState.setUserDetails,
      setIsLoading: state.gtState.setIsLoading,
    }))
  );

  const { gtDetails, isLoading } = useGtUserDetails();

  useEffect(() => {
    setIsLoading(isLoading);
    setUserDetails(gtDetails ?? null);
  }, [isLoading, gtDetails, setIsLoading, setUserDetails]);
};

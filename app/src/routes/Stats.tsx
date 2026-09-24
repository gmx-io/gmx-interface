import './stats.scss';
import { t } from '@lingui/macro';
import StatsCard from '@/components/Stats/StatsCard/StatsCard';
import Version from '@/img/stats/version.svg';
import OverviewCard from '@/components/Stats/OverviewCard/OverviewCard';
import MarketList from '@/components/Stats/MarketList/MarketList';
import { useRef } from 'react';
import { useMedia } from 'react-use';
import Header from '@/components/NewHeader/Header';
import { BlockUsIpModal } from '@/components/BlockUsIpModal';

export default function Stats({
  isShowHeader = true,
}: {
  isShowHeader?: boolean;
  isTrade?: boolean;
}) {
  const marketListRef = useRef<any>(null);
  const isMobile = useMedia('(max-width: 768px)');
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const closeChildMenu = () => {
    marketListRef.current?.closeMenu();
  };

  const openLink = () => {
    // window.open('https://dune.com/gmx_solana/gmxsol-analytics', 'analytics');
    window.open('https://dune.com/gmtrade/gmtrade-analytics', 'analytics');
  };

  return (
    <div className="stats" onClick={() => closeChildMenu()}>
      {/* <div className="flex items-center justify-between gap-[1rem] leading-[3.2rem]">
        <div className='flex items-center gap-[0.8rem]'>
          {(isScreen1024 || isMobile) && <ResponsiveLogo className="mr-4" />}
          {!isMobile && <div className="head-tag flex items-center gap-[0.8rem]   pl-[0.8rem] pr-[1.6rem]">
            <img src={solana} alt="Solana Logo" width={20} height={20} />
            <span className='text-[1.3rem] font-[500]'>Solana Data</span>
          </div>}
        </div>
        
        {isShowHeader && (
          <div>
            <AppHeaderUser />       
          </div>
        )}
      </div> */}
      <Header isStats={true} />
      <BlockUsIpModal />
      <div className="stats-content m-[auto] max-w-[172.8rem] px-[0.8rem]">
        {/* {isMobile && <div className="solana-logo ">
          <img src={solana} alt="Solana Logo" width={20} height={20} />
          <span className='text-[1.3rem] font-[500]'>Solana Data</span>
        </div>} */}
        <div className={`stats-title text-[3.2rem] font-[500] ${isMobile || isScreen1024 ? 'mt-[2rem]' : ''}`}>{t`Total Stats`}</div>
        <div className={`stats-title mt-[0.6rem] flex  flex-wrap items-center gap-[0.6rem] font-[500] text-[#A3A3A3] ${isMobile ? 'text-[1.2rem]' : 'text-[1.4rem]'}`}>
          <span>{t`For detailed stats`}</span>
          <div
            className="version flex cursor-pointer items-center gap-[0.6rem]"
            onClick={() => openLink()}
          >
            <img src={Version} height={isMobile ? 12 : 16} width={isMobile ? 12 : 16} />
            <span className={`${isMobile ? 'text-[1.2rem]' : 'text-[1.4rem]'}`}>{t`Analytics`}</span>
          </div>
          {/* <img src={Version} height={16} width={16} />
        <span>{t`Analytics`}</span> */}
        </div>
        <div className="flex-max-900 mt-[2rem] flex flex-wrap gap-[0.8rem]">
          <OverviewCard />
          <StatsCard />
        </div>
        <MarketList ref={marketListRef} />
      </div>
    </div>
  );
}

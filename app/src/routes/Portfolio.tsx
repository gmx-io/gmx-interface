import './Portfolio.scss';

import PageTitle from '@/components/Common/PageTitle/PageTitle';
import { PortfolioPerformanceCard } from '@/components/Portfolio/PortfolioPerformanceCard';
import { PortfolioPnLChart } from '@/components/Portfolio/PortfolioPnLChart';
import userPhoto from '@/img/gt/user.svg';
import { t, Trans } from '@lingui/macro';
import React from 'react';
import Header from '@/components/NewHeader/Header';
import ExchangeNewCom from '@/components/ExchangeNew/index';
import { useWallet } from '@solana/wallet-adapter-react';

const Portfolio: React.FC = () => {
  const { publicKey } = useWallet()

  return (
    <div className="page-layout portfolio">
      <Header isPools={true} />
      <PageTitle
        title={t`GMX Solana Account`}
        subtitle={
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Trans>GMX Solana information for account</Trans>
            <img src={userPhoto} alt="" />
            <Trans>You</Trans>
            <span>{publicKey?.toBase58()}</span>
          </div>
        }
      />

      <div className="Portfolio-content">
        <div className="Portfolio-cards">
          <div className="Portfolio-charts-wrapper">
            <div className="Portfolio-charts-container">
              <PortfolioPerformanceCard />
            </div>
          </div>
          <div className="Portfolio-charts-wrapper">
            <div className="Portfolio-charts-container">
              <PortfolioPnLChart />
            </div>
          </div>
        </div>
      </div>

      <div className="Portfolio-lists">
        <ExchangeNewCom />
      </div>
    </div >
  );
};

export default Portfolio;

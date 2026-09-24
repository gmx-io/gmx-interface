import './Overview.scss';
import {
  selectGtGlobalDetailsDecimals,
  selectGtGlobalDetailsGrowStepAmount,
  selectGtGlobalDetailsGrowSteps,
  selectGtGlobalDetailsTotalMintedAmount,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { formatAmount, formatUsd } from '@/utils/legacy/format';
import { selectGtCycleRemainderAmount } from '@/selectors/gt/selectGtCycleRemainderAmount';
import { selectGtMintingCost } from '@/selectors/gt/selectGtMintingCost';
import OverviewImg1 from "@/img/gt/earn-trading-icon.png";
import OverviewImg2 from "@/img/gt/earn-staking-icon.png";
import OverviewImg3 from "@/img/gt/earn-referral-icon.png";
import GtPriceCard from "@/components/GT/GtChart";
import Button from '@/components/Common/Button/Button';
import ArrowRight from "@/img/ArrowRight.svg";
import Trading from '@/img/gt/trading.png'
import Staking from '@/img/gt/staking.png'
import Referral from '@/img/gt/referral.png'
import { useNavigate } from 'react-router-dom';
import { Trans } from '@lingui/macro';

function Overview() {
  const navigate = useNavigate();
  const gtDecimals = useAppStore(selectGtGlobalDetailsDecimals);
  const mintingCost = useAppStore(selectGtMintingCost);
  const totalMintedGt = useAppStore(selectGtGlobalDetailsTotalMintedAmount);
  const cycle = useAppStore(selectGtGlobalDetailsGrowSteps);
  const remainder = useAppStore(selectGtCycleRemainderAmount);
  const growStepAmount = useAppStore(selectGtGlobalDetailsGrowStepAmount);

  return (
    <div className="overview">
      <div className="overview-container">
        {/* GT Wallet Section */}
        <div className="gt-wallet-section">
          <div className="wallet-header">
            <h2><Trans>GT Stats</Trans></h2>
          </div>

          <div className="wallet-stats" style={{ gridTemplateRows: 'none' }}>
            <div className="stat-item">
              <div className="stat-label"><Trans>Current Minting Price</Trans></div>
              <div className="stat-value">
                {formatUsd(mintingCost, { displayDecimals: 4 })}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label"><Trans>Minting Cycle</Trans></div>
              <div className="stat-value">{cycle?.toString()}</div>
              {/* <span className="!text-[#A3A3A3]">/ 1,000</span> */}
            </div>
            <div className="stat-item">
              <div className="stat-label"><Trans>Current Cycle Progress</Trans></div>
              <div className="stat-value">
                {formatAmount(remainder, gtDecimals, 0, true)} GT
                <span className="!text-[#A3A3A3]">/{' '}
                  {formatAmount(growStepAmount, gtDecimals, 0, true)} GT
                </span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label"><Trans>Total Minted</Trans></div>
              <div className="stat-value">
                {formatAmount(totalMintedGt, gtDecimals, 0, true)} GT
                {/* (
                {formatUsd(totalMintedGt.mul(mintingCostRaw))}) */}
              </div>
            </div>

            {/* <div className="stat-item">
              <div className="stat-label"><Trans>Treasury Buyback Volume</Trans></div>
              <div className="stat-value">
                {formatAmount(gtVaultAmount, gtDecimals, 0, true)} GT
              </div>
            </div> */}

            {/* <div className="stat-item">
              <div className="stat-label"><Trans>User-held GT Supply</Trans></div>
              <div className="stat-value">
                {formatAmount(
                  totalMintedGt.sub(gtVaultAmount),
                  gtDecimals,
                  0,
                  true
                )}{' '}
                GT
              </div>
            </div> */}
          </div>
        </div>

        <GtPriceCard yValue="MINTING PRICE ($)" />

        {/* Action Cards */}
        <div className="action-cards">
          {/* Earn GT Via Trading */}
          <div className="action-card trading flex flex-col justify-between">
            <div className="card-header !gap-[1rem]">
              <img src={OverviewImg1} width={22} height={22} />
              <h3><Trans>Earn GT via Trading</Trans></h3>
            </div>
            <p className="card-description">
              <Trans>
                Every time you trade, the order fees and borrowing fees you pay
                will earn you the same amount of GT rewards — calculated based on
                the current GT minting price.
              </Trans>
            </p>
            <Button
              variant="ghost"
              className="card-button w-fit !rounded-[0.8rem] !bg-[#FA7B4E] !p-[1.2rem] !text-[1.3rem] !font-[500] !text-white hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E]"
              onClick={() => navigate('/trade')}
            >
              <Trans>Trade</Trans>
              <img src={ArrowRight} width={16} height={16} />
            </Button>
            <img className="absolute bottom-0 right-0" src={Trading} height={134} width={134}></img>
          </div>

          {/* Earn GT Via Staking */}
          <div className="action-card staking flex flex-col justify-between">
            <div className="card-header !gap-[1rem]">
              <img src={OverviewImg2} width={22} height={22} />
              <h3><Trans>Earn GT via Staking</Trans></h3>
            </div>
            <p className="card-description">
              <Trans>
                Stake your GLV/GM tokens to earn GT rewards. The longer you stake,
                the higher your GT reward APY becomes.
              </Trans>
            </p>
            <Button
              variant="ghost"
              className="card-button w-fit !rounded-[0.8rem] !bg-[#FA7B4E] !p-[1.2rem] !text-[1.3rem] !font-[500] !text-white hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E]"
              onClick={() => navigate("/stake")}
            >
              <Trans>Stake</Trans>
              <img src={ArrowRight} width={16} height={16} />
            </Button>
            <img className="absolute bottom-0 right-0" src={Staking} height={134} width={134}></img>
          </div>

          {/* Earn GT Via Trading (Referral) */}
          <div className="action-card referral flex flex-col justify-between">
            <div className="card-header !gap-[1rem]">
              <img src={OverviewImg3} width={22} height={22} />
              <h3><Trans>Earn GT via Referral</Trans></h3>
            </div>
            <p className="card-description">
              <Trans>
                {`When your friends set you as their referrer, you'll earn at least
                50% of the GT rewards they receive from trading.`}
              </Trans>
            </p>
            <Button
              variant="ghost"
              className="card-button w-fit !rounded-[0.8rem] !bg-[#FA7B4E] !p-[1.2rem] !text-[1.3rem] !font-[500] !text-white hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E]"
              onClick={() => navigate('/referrals')}
            >
              <Trans>Referral</Trans>
              <img src={ArrowRight} width={16} height={16} />
            </Button>
            <img className="absolute bottom-0 right-0" src={Referral} height={134} width={134}></img>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Overview;

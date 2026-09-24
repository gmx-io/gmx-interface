import './Buyback.scss';
import Button from '@/components/Common/Button/Button';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import classNames from 'classnames';
import timeSvg from '@/img/gt/time.svg';
import { selectGtExchangeVaultAmount } from '@/selectors/gt/gtExchangeVaultSelectors';
import { DepositGtConfirmationBox } from './DepositGtConfirmationBox';
import { t, Trans } from '@lingui/macro';
import { selectGtExchangeUserPendingClaimableValue } from '@/selectors/gt/selectGtExchangeUserPendingClaimableValue';
import { selectGtExchangeUserAccountAmount } from '@/selectors/gt/gtUserAccountSelectors';
import GtPriceCard from "@/components/GT/GtChart";
import { selectGtSetDepositInputValue } from '@/selectors/gt/selectGtDepositAmount';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { formatAmount, formatUsd, getUnit } from '@/utils/legacy';
import { BN_ZERO, USD_DECIMALS } from '@/config/constants';
import { useStoreAccount } from '@/hooks/fetchHooks';
import { useAppStore } from '@/zustand/useAppStore';
import { selectGtBankMaxBuybackValue } from '@/selectors/gt/selectGtBankMaxBuybackValue';
import { selectGtBankBuybackPrice } from '@/selectors/gt/selectGtBankBuybackPrice';
import { selectGtMintingCost } from '@/selectors/gt/selectGtMintingCost';
import { useEffect, useMemo, useState } from 'react';
import { selectSkipPreflight } from '@/selectors/setting/baseSelectors';
import { selectGtBankEstBuybackValue } from '@/selectors/gt/selectGtBankEstBuybackValue';
import { BN } from '@coral-xyz/anchor';
import { useMedia } from 'react-use';
function Buyback({ claimableValue, claimRewards, isClaimingRewards, progress }: { claimableValue: BN, claimRewards: any, isClaimingRewards: boolean, progress: any }) {
  const { store } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const gtDecimals = useMemo(() => store?.gt?.decimals, [store?.gt?.decimals]);
  const maxBuybackValue = useAppStore(selectGtBankMaxBuybackValue);
  // console.log('maxBuybackValue', maxBuybackValue?.toString())
  const mintingCost = useAppStore(selectGtMintingCost);
  const skipPreflight = useAppStore(selectSkipPreflight);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  // const userGtAmount = useAppStore(selectGtUserDetailsAmount);
  const userDepositedGTAmount = useAppStore(selectGtExchangeUserAccountAmount);
  const totalDepositedGTAmount = useAppStore(selectGtExchangeVaultAmount);
  const pendingRewards = useAppStore(selectGtExchangeUserPendingClaimableValue);
  const setDepositInputValue = useAppStore(selectGtSetDepositInputValue);
  const recommendedDepositedAmount = useMemo(() =>
    mintingCost.isZero() ? BN_ZERO : maxBuybackValue.mul(getUnit(gtDecimals)).div(mintingCost), [maxBuybackValue, gtDecimals, mintingCost]);
  const buybackPrice = useAppStore(selectGtBankBuybackPrice);
  const estBuybackValue = useAppStore(selectGtBankEstBuybackValue);
  const [countdown, setCountdown] = useState<string>('00h00m');
  const isMobile = useMedia('(max-width: 768px)');
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const nextMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
      const diffMs = nextMidnightUtc.getTime() - now.getTime();
      const clamped = Math.max(0, diffMs);
      const hours = Math.floor(clamped / 3600000);
      const minutes = Math.floor((clamped % 3600000) / 60000);
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      setCountdown(`${pad(hours)} h ${pad(minutes)} m`);
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="gt-buyback">
      {/* Top Section - Buyback Info */}
      <div className="buyback-top-section">
        {/* Daily Buyback Countdown */}

        <div className="buyback-countdown">
          <div className="countdown-header">
            <h3><Trans>Daily Buyback Countdown</Trans></h3>
            <span className='flex items-center'>
              <img src={timeSvg} alt="time" />
              <span className='ml-6 timeStr'>{countdown}</span>
            </span>
          </div>

          <div className="countdown-stats">
            <div className="stat-item">
              <div className="stat-label">
                <Trans>Est. Buyback Value</Trans>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  renderContent={() => (
                    <>
                      <div>
                        <p><Trans>Total USDC value to be distributed.</Trans></p>
                        <p><Trans>Updated daily at UTC 07:50 / 15:50 / 23:50</Trans></p>
                      </div>
                      <br />
                      <div>
                        <p><Trans>This value is the lowest among:</Trans></p>
                        <p><Trans>• 60% of the Treasury’sdaily fee income</Trans></p>
                        <p><Trans>• 4% of the total Treasury value</Trans></p>
                        <p><Trans>• Total Submitted GT × Current Minting Price</Trans></p>
                      </div>
                    </>
                  )}
                />
              </div>
              <div className="stat-value">
                {formatAmount(estBuybackValue, USD_DECIMALS, 0, true)} USDC
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">
                <Trans>Recommended Sell Amount</Trans>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  renderContent={() => (
                    <div>
                      <Trans>Maximum GT amount that can be bought back at Current Minting Price. Exceeding this amount will trigger a discount.</Trans>
                    </div>
                  )}
                />
              </div>
              <div className="stat-value">
                ≤ {formatAmount(recommendedDepositedAmount, gtDecimals, 2, true)} GT
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">
                <Trans>Current GT Queued for Sell</Trans>
              </div>
              <div className="stat-value">
                {formatAmount(totalDepositedGTAmount, gtDecimals, 2, true)} GT
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">
                <Trans>Est. Buyback Price</Trans>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  renderContent={() => (
                    <div>
                      <p><Trans>Estimated buyback price, calculated as:</Trans></p>
                      <p><Trans>Est. Buyback Value ÷ Current GT Queued for Sell.</Trans></p>
                      <br />
                      <p><Trans>The final price may differ at the time of buyback.</Trans></p>
                    </div>
                  )}
                />
              </div>
              <div className="stat-value">{formatUsd(buybackPrice, { displayDecimals: 4 })} / GT</div>
            </div>
          </div>
        </div>

        {/* My Buyback Participation */}
        <div className="buyback-participation">
          <div className="participation-header">
            <h3><Trans>My Buyback Participation</Trans></h3>
          </div>

          <div className="participation-stats">
            <div className="stat-item">
              <div className="stat-label"><Trans>My GT Queued for Sell</Trans></div>
              <div className="stat-value">
                {formatAmount(
                  userDepositedGTAmount || new BN(0),
                  gtDecimals,
                  2,
                  true
                )} GT
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label">
                <Trans>Est. Sell Proceeds</Trans>
                <TooltipWithPortal
                  handle={<img src={InfoSvg} alt="info" />}
                  position="bottom"
                  renderContent={() => (
                    <div>
                      <p>
                        <Trans>Estimated using the current Buyback Value and your share of the total GT queued for sell.</Trans>
                      </p>
                      <p>
                        <Trans>Final proceeds may change if queued GT or the buyback value updates before execution.</Trans>
                      </p>
                    </div>
                  )}
                />
              </div>
              <div className="stat-value">
                {formatAmount(pendingRewards, USD_DECIMALS, 4, true)} USDC
              </div>
            </div>

            <div className="stat-item">
              <div className="stat-label"><Trans>Claimable Proceeds</Trans></div>
              <div className="stat-value">{formatAmount(claimableValue, 14, 4, true)} USDC</div>
            </div>
          </div>

          <div className="participation-actions">
            <Button
              variant="secondary"
              disabled
              // disabled={!userGtAmount || userGtAmount.isZero()}
              // sell-btn
              className="action-btn"
              onClick={(() => setIsConfirmationVisible(true))}>
              <Trans>Sell GT</Trans>
            </Button>

            <Button
              variant="secondary"
              className={classNames("action-btn", {
                "claim-btn": !(!claimableValue || claimableValue.isZero() || isClaimingRewards),
              })}
              onClick={() => void claimRewards({ skipPreflight })}
              disabled={
                !claimableValue || claimableValue.isZero() || isClaimingRewards
              }
            >
              {isClaimingRewards ? (
                <Trans>
                  Claiming... ({progress.current}/{progress.total})
                </Trans>
              ) : (
                <Trans>Claim USDC</Trans>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* GT Chart Section */}
      <GtPriceCard yValue="MINTING PRICE" />
      <DepositGtConfirmationBox
        buybackPrice={buybackPrice}
        estBuybackValue={estBuybackValue}
        maxBuybackValue={maxBuybackValue}
        totalDepositedGTAmount={totalDepositedGTAmount}
        recommendedDepositedAmount={recommendedDepositedAmount}
        isVisible={isConfirmationVisible}
        onClose={() => {
          setDepositInputValue('');
          setIsConfirmationVisible(false);
        }}
      />
    </div>
  );
}

export default Buyback;

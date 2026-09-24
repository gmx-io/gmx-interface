import './VipTiers.scss';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import InfoSvg from '@/components/TradeBoxNew/assets/Info.svg';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import vip0 from '@/img/batch_0_novice.svg';
import vip1 from '@/img/batch_1_herald.svg';
import vip2 from '@/img/batch_2_guardian.svg';
import vip3 from '@/img/batch_3_crusader.svg';
import vip4 from '@/img/batch_4_archon.svg';
import vip5 from '@/img/batch_5_legend.svg';
import vip6 from '@/img/batch_6_ancient.svg';
import vip7 from '@/img/batch_7_divine.svg';
import vip8 from '@/img/batch_8_immortal.svg';
import vip9 from '@/img/batch_9_celestial.svg';
import {
  selectGtGlobalDetailsOrderFeeDiscountFactors,
  selectGtGlobalDetailsRanks,
  selectGtGlobalDetailsReferralRewardFactors,
} from '@/selectors/gt/gtGlobalDetailsSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { useEffect, useState } from 'react';
import { formatToKMBWithoutUsd, formatAmount } from '@/utils/legacy';
import { Trans, t } from '@lingui/macro';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import { useMedia } from 'react-use';
import { getGmw213Enabled } from '@/config/featureFlagEnable';

const KMB_UPPER = getGmw213Enabled();
const tierGt = (qty: string) =>
  `${KMB_UPPER ? qty : qty.toLowerCase()} GT or more`;
interface VipTier {
  id: number;
  name: React.ReactNode;
  icon: string;
  gtHoldings: string;
  feeDiscount: string;
  referralRewards: string;
}

const vipTiersData: VipTier[] = [
  {
    id: 0,
    name: (
      <>
        VIP 0 <Trans>Novice</Trans>
      </>
    ),
    icon: vip0,
    gtHoldings: 'Less than 600 GT',
    feeDiscount: '1%',
    referralRewards: '50%',
  },
  {
    id: 1,
    name: (
      <>
        VIP 1 <Trans>Herald</Trans>
      </>
    ),
    icon: vip1,
    gtHoldings: '600 GT or more',
    feeDiscount: '2%',
    referralRewards: '50%',
  },
  {
    id: 2,
    name: (
      <>
        VIP 2 <Trans>Guardian</Trans>
      </>
    ),
    icon: vip2,
    gtHoldings: tierGt('2K'),
    feeDiscount: '3%',
    referralRewards: '50%',
  },
  {
    id: 3,
    name: (
      <>
        VIP 3 <Trans>Crusader</Trans>
      </>
    ),
    icon: vip3,
    gtHoldings: tierGt('6K'),
    feeDiscount: '4%',
    referralRewards: '50%',
  },
  {
    id: 4,
    name: (
      <>
        VIP 4 <Trans>Archon</Trans>
      </>
    ),
    icon: vip4,
    gtHoldings: tierGt('20K'),
    feeDiscount: '5%',
    referralRewards: '50%',
  },
  {
    id: 5,
    name: (
      <>
        VIP 5 <Trans>Legend</Trans>
      </>
    ),
    icon: vip5,
    gtHoldings: tierGt('60K'),
    feeDiscount: '6%',
    referralRewards: '50%',
  },
  {
    id: 6,
    name: (
      <>
        VIP 6 <Trans>Ancient</Trans>
      </>
    ),
    icon: vip6,
    gtHoldings: tierGt('200K'),
    feeDiscount: '7%',
    referralRewards: '50%',
  },
  {
    id: 7,
    name: (
      <>
        VIP 7 <Trans>Divine</Trans>
      </>
    ),
    icon: vip7,
    gtHoldings: tierGt('600K'),
    feeDiscount: '8%',
    referralRewards: '50%',
  },
  {
    id: 8,
    name: (
      <>
        VIP 8 <Trans>Immortal</Trans>
      </>
    ),
    icon: vip8,
    gtHoldings: tierGt('2M'),
    feeDiscount: '9%',
    referralRewards: '50%',
  },
  {
    id: 9,
    name: (
      <>
        VIP 9 <Trans>Celestial</Trans>
      </>
    ),
    icon: vip9,
    gtHoldings: tierGt('6M'),
    feeDiscount: '10%',
    referralRewards: '50%',
  },
];

interface VipTiersProps {
  isVisible: boolean;
  onClose: () => void;
}

function VipTiers({ isVisible, onClose }: VipTiersProps) {
  const isMobile = useMedia('(max-width: 768px)');
  const [dataList, setDataList] = useState<VipTier[]>([]);
  const ranks = useAppStore(selectGtGlobalDetailsRanks);
  const orderFeeDiscountFactors = useAppStore(
    selectGtGlobalDetailsOrderFeeDiscountFactors
  );
  const referralRewardFactors = useAppStore(
    selectGtGlobalDetailsReferralRewardFactors
  );
  useEffect(() => {
    if (!ranks?.length) return;
    const new_arry = vipTiersData.map((item, index) => {
      if (index === 0) {
        return {
          ...item,
          gtHoldings: <Trans>{`Less than ${formatToKMBWithoutUsd(ranks[index], 7, { displayDecimals: 0 })} GT`}</Trans>,
          feeDiscount: orderFeeDiscountFactors &&
            orderFeeDiscountFactors[index]
            ? formatAmount(
              orderFeeDiscountFactors[index].muln(100),
              20,
              0,
              true
            ) : '0',
          referralRewards: referralRewardFactors && referralRewardFactors[index]
            ? formatAmount(
              referralRewardFactors[index].muln(100),
              20,
              0,
              true
            )
            : '0'
        }
      }
      if (index >= 1) {
        return {
          ...item,
          gtHoldings: <Trans>{`${formatToKMBWithoutUsd(ranks[index - 1], 7, { displayDecimals: 0 })} GT or more`}</Trans>,
          feeDiscount: orderFeeDiscountFactors &&
            orderFeeDiscountFactors[index]
            ? formatAmount(
              orderFeeDiscountFactors[index].muln(100),
              20,
              0,
              true
            ) : '0',
          referralRewards: referralRewardFactors && referralRewardFactors[index]
            ? formatAmount(
              referralRewardFactors[index].muln(100),
              20,
              0,
              true
            )
            : '0'
        }
      }
    });
    setDataList(new_arry);
  }, [ranks]);

  if (!isVisible) return null;
  return (
    <div className={`vip-tiers-overlay ${isMobile ? 'mobile' : ''}`} onClick={onClose}>
      <div className={`vip-tiers-modal ${isMobile ? 'mobile' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="vip-tiers-header">
          <h2><Trans>GT VIP Tiers</Trans></h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="vip-tiers-body">
          <TableScrollFadeContainer>
            <Table className="vip-tiers-table">
              <TableTheadTr>
                <TableTh className="header-cell tier" style={{ fontSize: '1.1rem' }}>
                  <Trans>TIER</Trans>
                </TableTh>
                <TableTh className="header-cell holdings" style={{ fontSize: '1.1rem' }}>
                  <Trans>GT HOLDINGS</Trans>
                </TableTh>
                <TableTh className="header-cell discount" style={{ fontSize: '1.1rem' }}>
                  <div className="header-content">
                    <Trans>FEE DISCOUNT</Trans>
                    <TooltipWithPortal
                      handle={<img src={InfoSvg} alt="info" />}
                      position="bottom"
                      renderContent={() => (
                        <div>
                          <Trans>This discount applies to your order fees, and it stacks with
                            the fee discount you get from setting a referrer.</Trans>
                        </div>
                      )}
                    />
                  </div>
                </TableTh>
                <TableTh className="header-cell rewards">
                  <div className="header-content" style={{ fontSize: '1.1rem' }}>
                    <Trans>REFERRAL REWARDS</Trans>
                    <TooltipWithPortal
                      handle={<img src={InfoSvg} alt="info" />}
                      position="bottom"
                      renderContent={() => (
                        <div>
                          <Trans>When your friends set you as their referrer, you'll earn
                            50%–100% of the GT rewards they receive from trading,
                            depending on your GT VIP Tier.</Trans>
                        </div>
                      )}
                    />
                  </div>
                </TableTh>
              </TableTheadTr>

              {dataList.map((tier) => (
                <TableTr key={tier.id} className="table-row" bordered={false}>
                  <TableTd className="cell tier">
                    <div className="tier-info">
                      <div className="tier-icon">
                        <img src={tier.icon} alt={`VIP ${tier.id}`} />
                      </div>
                      <span className="tier-name">{tier.name}</span>
                    </div>
                  </TableTd>
                  <TableTd className="cell holdings">{tier.gtHoldings}</TableTd>
                  <TableTd className="cell discount">{tier.feeDiscount}%</TableTd>
                  <TableTd className="cell rewards">{tier.referralRewards}%</TableTd>
                </TableTr>
              ))}
            </Table>
          </TableScrollFadeContainer>
        </div>
      </div>
    </div>
  );
}

export default VipTiers;

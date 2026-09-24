import './Overview.scss';
import { useWallet } from '@solana/wallet-adapter-react';
import { t, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useEffect, useState, useMemo } from 'react';
import { formatLiquidationPrice } from '@/utils/legacy';
import { formatUsd, formatAmount } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { isRestrictedArea } from '@/components/Pools/utils/getApyData';
import TooltipWithPortal from '@/components/Common/Tooltip/TooltipWithPortal';
import Button from '@/components/Common/Button/Button';
import WarnIcon from '@/img/gray-info.svg';

interface TierItem {
  key: string;
  label: string;
  value: string;
  index: number;
}

interface OverviewItem {
  key: string;
  label: string;
  value: string;
}

interface OverviewProps {
  stakeGloablState: any;
  onStake?: () => void;
  onBuy?: () => void;
  walletBalance: BN;
  stakeValue: BN;
  unclaimedGTFromStake: BN;
  stakeGtAccount: BN;
  isPositionsListLoading: boolean;
}

const getBaseAprTiers = (): TierItem[] => [
  { key: 'title', label: t`STAKE DURATION (Weeks)`, value: t`APR`, index: -1 },
  { key: 'zero', label: '<1', value: '0%', index: -2 },
  { key: 'first', label: '1-4', value: '0%', index: 3 },
  { key: 'third', label: '5-12', value: '0%', index: 11 },
  { key: 'fourth', label: '13-24', value: '0%', index: 23 },
  { key: 'fifth', label: '25-48', value: '0%', index: 47 },
  { key: 'sixth', label: '>48', value: '0%', index: 48 },
];

const getBaseOverview = (): OverviewItem[] => [
  { key: 'wallet', label: t`Wallet Value`, value: '$0' },
  { key: 'stake', label: t`Stake Value`, value: '$0' },
  { key: 'claimed', label: t`Claimed GT from Stake`, value: '0 GT' },
  { key: 'unclaimed', label: t`Unclaimed GT from Stake`, value: '0 GT' },
];

export default function Overview({
  stakeGloablState,
  onStake,
  onBuy,
  walletBalance,
  stakeValue,
  unclaimedGTFromStake,
  stakeGtAccount,
  isPositionsListLoading,
}: OverviewProps) {
  const { connected } = useWallet();
  const { i18n } = useLingui();

  const { store: userStore } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const { decimals } = userStore?.gt || {};

  const initialAprTiers = useMemo(() => getBaseAprTiers(), [i18n._locale]);
  const initialOverview = useMemo(() => getBaseOverview(), [i18n._locale]);

  const [aprTiersData, setAprTiersData] = useState<TierItem[]>(initialAprTiers);
  const [overviewData, setOverviewData] =
    useState<OverviewItem[]>(initialOverview);

  const gtDecimals = useMemo(
    () => userStore?.gt?.decimals,
    [userStore?.gt?.decimals]
  );
  const isUs = isRestrictedArea();
  useEffect(() => {
    const newAprTiers = getBaseAprTiers();
    setAprTiersData((prev) => {
      return newAprTiers.map((newItem, index) => ({
        ...prev[index],
        label: newItem.label,
        value: newItem.value,
      }));
    });

    const newOverview = getBaseOverview();
    setOverviewData((prev) => {
      return prev.map((oldItem, index) => ({
        ...oldItem,
        label: newOverview[index].label,
      }));
    });
  }, [i18n._locale]);

  useEffect(() => {
    setOverviewData((prev) => {
      const newOverviewData = [...prev];

      let shouldUpdate = false;

      if (walletBalance && walletBalance.gte(new BN(0))) {
        const newValue = `${formatUsd(walletBalance)}`;
        if (newOverviewData[0].value !== newValue) {
          newOverviewData[0] = { ...newOverviewData[0], value: newValue };
          shouldUpdate = true;
        }
      }

      if (stakeValue && stakeValue.gte(new BN(0))) {
        const newValue = `${formatUsd(stakeValue)}`;
        if (newOverviewData[1].value !== newValue) {
          newOverviewData[1] = { ...newOverviewData[1], value: newValue };
          shouldUpdate = true;
        }
      }

      if (stakeGtAccount && stakeGtAccount.gte(new BN(0))) {
        const newValue = `${formatAmount(stakeGtAccount, gtDecimals, 2)} GT`;
        if (newOverviewData[2].value !== newValue) {
          newOverviewData[2] = { ...newOverviewData[2], value: newValue };
          shouldUpdate = true;
        }
      }

      if (unclaimedGTFromStake && unclaimedGTFromStake.gte(new BN(0))) {
        const newValue = `${formatAmount(unclaimedGTFromStake, decimals, 2)} GT`;
        if (newOverviewData[3].value !== newValue) {
          newOverviewData[3] = { ...newOverviewData[3], value: newValue };
          shouldUpdate = true;
        }
      }

      return shouldUpdate ? newOverviewData : prev;
    });
  }, [
    walletBalance,
    stakeValue,
    unclaimedGTFromStake,
    stakeGtAccount,
    decimals,
  ]);

  useEffect(() => {
    if (stakeGloablState?.apyGradient?.length) {
      setAprTiersData((prevState) => {
        return prevState?.map((cItem) => {
          if (cItem.index > 0) {
            const index = cItem.index;
            const apyLength = stakeGloablState?.apyGradient?.length;
            const apyValue =
              stakeGloablState?.apyGradient[
              index >= 48 ? apyLength - 1 : index
              ];
            const currentAprValue = apyValue.gt(new BN('0'))
              ? formatLiquidationPrice(apyValue.muln(100), {
                displayDecimals: 2,
                showDollarSign: false,
                useCommas: false,
              })
              : '0.00';

            return {
              ...cItem,
              value: `${Number(currentAprValue).toFixed(2)}%`,
            };
          }
          return cItem;
        });
      });
    }
  }, [stakeGloablState, i18n._locale]);

  return (
    <div className="overview-view">
      <div className="left public">
        <div className="title">
          <Trans>GLV/GM Staking Overview</Trans>
        </div>
        <div className="content">
          <div className="wallet-info">
            {overviewData &&
              overviewData.map((item) => {
                return (
                  <div key={item.key} className="list">
                    <p>{item.label}</p>
                    <p>{item.value}</p>
                  </div>
                );
              })}
          </div>
          <div className="button-box">
            <Button
              variant="ghost"
              disabled={!connected || isUs}
              className={`btn ${!connected || isUs ? 'disabled-button' : 'active-button'} !rounded-[0.8rem] !px-[1.2rem] !py-[0.8rem] !bg-[#FA7B4E] hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E] disabled:!bg-[#1F1F1F] disabled:!text-[#535353]`}
              onClick={onStake}
            >
              <Trans>Stake</Trans>
            </Button>
            <Button
              variant="ghost"
              disabled={!connected}
              className={`btn ${!connected ? 'disabled-button' : 'active-button'} !rounded-[0.8rem] !px-[1.2rem] !py-[0.8rem] !bg-[#FA7B4E] hover:!bg-[#FA7B4E] active:!bg-[#FA7B4E] disabled:!bg-[#1F1F1F] disabled:!text-[#535353]`}
              onClick={onBuy}
            >
              <Trans>Buy</Trans>
            </Button>
          </div>
        </div>
      </div>
      <div className="right public">
        <div className="title title-with-tooltip">
          <Trans>APR Tiers</Trans>
          <TooltipWithPortal
            handle={
              <img
                className="title-tooltip-icon"
                src={WarnIcon}
                alt="warning"
              />
            }
            position="bottom"
            maxAllowedWidth={288}
            renderContent={() => (
              <p>
                {t`GT rewards are calculated using AVG APR when claimed. To receive rewards matching the APR tiers, claim once when unstaking. Frequent claims may result in less total GT.`}
              </p>
            )}
          />
        </div>
        <div className="content">
          <div className="wallet-info">
            {aprTiersData &&
              aprTiersData.map((item) => {
                return (
                  <div key={item.key} className="list">
                    <p>{item.label}</p>
                    <p>{item.value}</p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { t, Trans } from "@lingui/macro";

import { formatUsd } from "lib/numbers";

import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { AnimatedRewardsTable } from "./AnimatedRewardsTable";
import { ClaimRewardRow } from "./ClaimRewardRow";
import { OutOfTokenErrorAlert } from "./OutOfTokenErrorAlert";
import { useClaimAffiliatesModalState } from "./useClaimAffiliatesModalState";

type Props = {
  onClose: () => void;
};

export function ClaimAffiliatesModal({ onClose }: Props) {
  const state = useClaimAffiliatesModalState({ onClose });

  return (
    <ModalWithPortal
      contentClassName="w-[400px] overflow-y-auto"
      isVisible={true}
      setIsVisible={onClose}
      label={t`Confirm claim`}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-12">
        <div className="text-center text-20 font-medium">
          <Trans>Claim {formatUsd(state.totalClaimableFundingUsd)}</Trans>
        </div>

        <Table>
          <thead>
            <TableTheadTr>
              <TableTh className="w-[20px] !pl-0">
                <Checkbox
                  isChecked={state.isAllChecked}
                  setIsChecked={state.handleToggleSelectAll}
                  isPartialChecked={state.selectedMarketAddressesSet.size > 0 && !state.isAllChecked}
                />
              </TableTh>
              <TableTh>
                <Trans>MARKET</Trans>
              </TableTh>
              <TableTh className="!pr-0">
                <Trans>REWARDS</Trans>
              </TableTh>
            </TableTheadTr>
          </thead>
          <tbody>
            {state.previewMainRewards.map(({ reward, usd }) => (
              <ClaimRewardRow
                key={reward.marketAddress}
                reward={reward}
                rewardUsd={usd}
                marketsInfoData={state.marketsInfoData}
                isSelected={state.selectedMarketAddressesSet.has(reward.marketAddress)}
                onToggleSelect={state.handleToggleSelect}
              />
            ))}
          </tbody>
        </Table>

        {state.hiddenMainRewards.length > 0 && (
          <Button
            variant="ghost"
            className="w-full text-13 text-typography-secondary"
            onClick={() => state.setShowOtherMainRewards((v) => !v)}
          >
            {state.showOtherMainRewards ? (
              <Trans>Hide other assets</Trans>
            ) : (
              <Trans>Show other assets ({state.hiddenMainRewards.length})</Trans>
            )}
          </Button>
        )}

        {state.hiddenMainRewards.length > 0 && (
          <AnimatedRewardsTable
            isVisible={state.showOtherMainRewards}
            rewards={state.hiddenMainRewards}
            marketsInfoData={state.marketsInfoData}
            selectedMarketAddressesSet={state.selectedMarketAddressesSet}
            onToggleSelect={state.handleToggleSelect}
          />
        )}

        {state.smallRewardsWithUsd.length > 0 && state.shouldShowSmallRewardsToggle && (
          <Button
            variant="ghost"
            className="w-full text-13 text-typography-secondary"
            onClick={() => state.setShowSmallRewards((v) => !v)}
          >
            {state.showSmallRewards ? (
              <Trans>Hide assets with small value</Trans>
            ) : (
              <Trans>Show assets with small value ({state.smallRewardsWithUsd.length})</Trans>
            )}
          </Button>
        )}

        {state.smallRewardsWithUsd.length > 0 && state.shouldShowSmallRewardsToggle && (
          <AnimatedRewardsTable
            isVisible={state.showSmallRewards}
            rewards={state.smallRewardsWithUsd}
            marketsInfoData={state.marketsInfoData}
            selectedMarketAddressesSet={state.selectedMarketAddressesSet}
            onToggleSelect={state.handleToggleSelect}
          />
        )}

        <SyntheticsInfoRow
          label={<Trans>Network fee</Trans>}
          value={
            state.networkFeeInfo.isLoading ? (
              "..."
            ) : state.networkFeeInfo.amount === undefined ? (
              "-"
            ) : (
              <AmountWithUsdBalance
                amount={state.networkFeeInfo.amount}
                decimals={state.networkFeeInfo.decimals}
                usd={state.networkFeeInfo.amountUsd}
                symbol={state.networkFeeInfo.symbol}
                isStable={state.networkFeeInfo.isStable}
              />
            )
          }
        />

        <OutOfTokenErrorAlert errors={state.errors} token={state.isOutOfTokenErrorToken} onClose={onClose} />

        <Button
          className="w-full"
          variant="primary-action"
          onClick={state.handleSubmit}
          disabled={state.submitButtonState.disabled}
        >
          {state.submitButtonState.text}
          {state.submitButtonState.showSpinner && <SpinnerIcon className="ml-4 animate-spin" />}
        </Button>
      </div>
    </ModalWithPortal>
  );
}

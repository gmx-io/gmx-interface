import { t, Trans } from "@lingui/macro";
import { AnimatePresence, motion } from "framer-motion";

import { CLAIM_AFFILIATE_FIXED_SLIPPAGE_BPS } from "domain/synthetics/referrals/useClaimAffiliateSwapRoutes";
import { formatPercentageDisplay, formatUsd } from "lib/numbers";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";

import SpinnerIcon from "img/ic_spinner.svg?react";

import { AnimatedRewardsTable, COLLAPSE_ANIMATION } from "./AnimatedRewardsTable";
import { ClaimRewardRow } from "./ClaimRewardRow";
import { ClaimSwapTargetTokenSelector } from "./ClaimSwapTargetTokenSelector";
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
                {!state.isSelectionLimitedBySwapMultichain && (
                  <Checkbox
                    isChecked={state.isAllChecked}
                    setIsChecked={state.handleToggleSelectAll}
                    isPartialChecked={state.selectedMarketAddressesSet.size > 0 && !state.isAllChecked}
                  />
                )}
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
                isSelectionDisabled={
                  state.isSelectionLimitedBySwapMultichain &&
                  !state.selectedMarketAddressesSet.has(reward.marketAddress) &&
                  !state.canSelectMore
                }
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
            canSelectMore={state.canSelectMore}
            isSelectionLimited={state.isSelectionLimitedBySwapMultichain}
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
            canSelectMore={state.canSelectMore}
            isSelectionLimited={state.isSelectionLimitedBySwapMultichain}
          />
        )}

        {state.swapTargetTokenOptions.length > 0 && (
          <div>
            <ToggleSwitch
              isChecked={state.isSwapEnabled}
              setIsChecked={state.setIsSwapEnabled}
              textClassName="text-body-medium font-medium text-typography-secondary"
            >
              <Trans>Swap all rewards into one asset</Trans>
            </ToggleSwitch>

            <AnimatePresence initial={false}>
              {state.isSwapEnabled && (
                <motion.div
                  key="swap-options"
                  className="mt-12 flex flex-col gap-8 overflow-hidden"
                  {...COLLAPSE_ANIMATION}
                >
                  <SyntheticsInfoRow
                    label={<Trans>Swap to</Trans>}
                    value={
                      <ClaimSwapTargetTokenSelector
                        options={state.swapTargetTokenOptions}
                        value={state.swapTargetTokenAddress}
                        onSelect={state.setSwapTargetTokenAddress}
                      />
                    }
                  />
                  <SyntheticsInfoRow
                    label={<Trans>Total value of assets</Trans>}
                    value={formatUsd(state.selectedClaimTokensUsd)}
                  />
                  <SyntheticsInfoRow
                    label={<Trans>Slippage</Trans>}
                    value={formatPercentageDisplay(CLAIM_AFFILIATE_FIXED_SLIPPAGE_BPS / 100)}
                  />
                  <SyntheticsInfoRow
                    label={<Trans>You'll receive</Trans>}
                    value={
                      !state.swapTargetToken || state.toReceiveAmount === 0n ? (
                        "-"
                      ) : state.isSwapRouteLoadingForSubmit ? (
                        "..."
                      ) : (
                        <AmountWithUsdBalance
                          amount={state.toReceiveAmount}
                          decimals={state.swapTargetToken.decimals}
                          usd={state.toReceiveUsd}
                          symbol={state.swapTargetToken.symbol}
                          isStable={state.swapTargetToken.isStable}
                        />
                      )
                    }
                  />

                  {state.hasSwapRouteErrorForSubmit && (
                    <AlertInfoCard type="warning" hideClose>
                      {state.failedSwapTokenSymbols ? (
                        <Trans>Swap route unavailable for: {state.failedSwapTokenSymbols}</Trans>
                      ) : (
                        <Trans>Unable to fetch swap route. Please try again.</Trans>
                      )}
                    </AlertInfoCard>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

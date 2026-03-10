import { t, Trans } from "@lingui/macro";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { useAccount } from "wagmi";

import { useGmxAccountDepositViewTokenAddress, useGmxAccountModalOpen } from "context/GmxAccountContext/hooks";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import {
  ArbitraryExpressError,
  useArbitraryError,
  useArbitraryRelayParamsAndPayload,
} from "domain/multichain/arbitraryRelayParams";
import { ExpressTransactionBuilder, ExpressTxnParams } from "domain/synthetics/express/types";
import {
  getMarketIndexName,
  getMarketPoolName,
  MarketsInfoData,
  useMarketsInfoRequest,
} from "domain/synthetics/markets";
import {
  claimAffiliateRewardsTxn,
  simulateAndClaimAffiliateRewardsAndSwapTxn,
} from "domain/synthetics/referrals/claimAffiliateRewardsTxn";
import {
  buildAndSignMultichainClaimAffiliateRewardsTxn,
  simulateAndCreateMultichainClaimAffiliateRewardsTxn,
} from "domain/synthetics/referrals/createMultichainClaimAffiliateRewardsTxn";
import { AffiliateReward } from "domain/synthetics/referrals/types";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { convertToUsd, useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { WalletTxnResult } from "lib/transactions/sendWalletTransaction";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import type { AsyncResult } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import { convertTokenAddress, getToken, getWrappedToken } from "sdk/configs/tokens";
import type { TokenData } from "sdk/utils/tokens/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { DropdownSelector } from "components/DropdownSelector/DropdownSelector";
import ModalWithPortal from "components/Modal/ModalWithPortal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { Table, TableTd, TableTh, TableTheadTr } from "components/Table/Table";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenIcon from "components/TokenIcon/TokenIcon";
import Tooltip from "components/Tooltip/Tooltip";

import SpinnerIcon from "img/ic_spinner.svg?react";

import {
  getRewardUsd,
  type RewardsParams,
  useClaimAffiliateRewardsSelection,
} from "./useClaimAffiliateRewardsSelection";
import { type SwapTargetTokenOption, useClaimAffiliateSwapRoutes } from "./useClaimAffiliateSwapRoutes";

const SWAP_OPTIONS_ANIMATION = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2 },
} as const;

type Props = {
  onClose: () => void;
};

function useMultichainClaimAffiliateRewardsExpressTransactionBuilder({
  rewardsParams,
}: {
  rewardsParams: RewardsParams | undefined;
}): ExpressTransactionBuilder | undefined {
  const { chainId, srcChainId } = useChainId();
  const { address: account } = useAccount();

  return useMemo((): ExpressTransactionBuilder | undefined => {
    const areValidRewardsParams =
      rewardsParams && rewardsParams.marketAddresses.length > 0 && rewardsParams.tokenAddresses.length > 0;
    if (!account || !areValidRewardsParams) {
      return undefined;
    }

    const expressTransactionBuilder: ExpressTransactionBuilder = async ({ gasPaymentParams, relayParams }) => ({
      txnData: await buildAndSignMultichainClaimAffiliateRewardsTxn({
        account,
        marketAddresses: rewardsParams.marketAddresses,
        tokenAddresses: rewardsParams.tokenAddresses,
        chainId,
        srcChainId,
        relayerFeeAmount: gasPaymentParams.relayerFeeAmount,
        relayerFeeTokenAddress: gasPaymentParams.relayerFeeTokenAddress,
        relayParams,
        signer: undefined,
        emptySignature: true,
      }),
    });

    return expressTransactionBuilder;
  }, [account, chainId, rewardsParams, srcChainId]);
}

function NetworkFee({
  errors,
  expressTxnParamsAsyncResult,
}: {
  errors: ArbitraryExpressError | undefined;
  expressTxnParamsAsyncResult: AsyncResult<ExpressTxnParams>;
}) {
  const { srcChainId } = useChainId();
  const gasPaymentToken = useSelector(selectGasPaymentToken);

  if (srcChainId === undefined) {
    return null;
  }

  let gasPaymentTokenAmount: bigint | undefined;

  if (errors?.isOutOfTokenError?.isGasPaymentToken && errors.isOutOfTokenError.requiredAmount !== undefined) {
    gasPaymentTokenAmount = errors.isOutOfTokenError.requiredAmount;
  } else if (expressTxnParamsAsyncResult.data?.gasPaymentParams.gasPaymentTokenAmount !== undefined) {
    gasPaymentTokenAmount = expressTxnParamsAsyncResult.data.gasPaymentParams.gasPaymentTokenAmount;
  }

  const networkFeeFormatted =
    gasPaymentTokenAmount === undefined || !gasPaymentToken ? (
      "-"
    ) : (
      <AmountWithUsdBalance
        amount={gasPaymentTokenAmount}
        decimals={gasPaymentToken.decimals}
        usd={convertToUsd(gasPaymentTokenAmount, gasPaymentToken.decimals, gasPaymentToken.prices.minPrice)}
        symbol={gasPaymentToken.symbol}
        isStable={gasPaymentToken.isStable}
      />
    );

  return <SyntheticsInfoRow label={t`Network fee`} value={networkFeeFormatted} />;
}

function OutOfTokenErrorAlert({
  errors,
  token,
  onClose,
}: {
  errors: ArbitraryExpressError | undefined;
  token: TokenData | undefined;
  onClose: () => void;
}) {
  const history = useHistory();
  const { chainId } = useChainId();
  const [, setDepositViewTokenAddress] = useGmxAccountDepositViewTokenAddress();
  const [, setGmxAccountModalOpen] = useGmxAccountModalOpen();

  if (!errors?.isOutOfTokenError || !token) {
    return null;
  }

  return (
    <AlertInfoCard type="error" hideClose>
      <div>
        <Trans>
          Claiming requires{" "}
          <Amount
            amount={errors.isOutOfTokenError.requiredAmount ?? 0n}
            decimals={token.decimals}
            isStable={token.isStable}
            symbol={token.symbol}
            showZero
          />{" "}
          while you have{" "}
          <Amount
            amount={token.gmxAccountBalance ?? 0n}
            decimals={token.decimals}
            isStable={token.isStable}
            symbol={token.symbol}
            showZero
          />
          .{" "}
          <span
            className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
            onClick={() => {
              onClose();
              history.push(`/trade/swap?to=${token.symbol}`);
            }}
          >
            Swap
          </span>{" "}
          or{" "}
          <span
            className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
            onClick={() => {
              onClose();
              setDepositViewTokenAddress(convertTokenAddress(chainId, token.address, "native"));
              setGmxAccountModalOpen("deposit");
            }}
          >
            deposit
          </span>{" "}
          more {token.symbol} to your GMX Account.
        </Trans>
      </div>
    </AlertInfoCard>
  );
}

export function ClaimAffiliatesModal(p: Props) {
  const { onClose } = p;
  const { account, signer } = useWallet();
  const { chainId, srcChainId } = useChainId();
  const hasOutdatedUi = useHasOutdatedUi();

  const { tokensData } = useTokensDataRequest(chainId, srcChainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });
  const { affiliateRewardsData } = useAffiliateRewards(chainId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rewards = useMemo(() => Object.values(affiliateRewardsData || {}), [affiliateRewardsData]);

  const {
    mainRewards,
    smallRewards,
    showSmallRewards,
    setShowSmallRewards,
    selectedMarketAddresses,
    handleToggleSelect,
    rewardsParams,
    selectedClaimTokenAmountsByToken,
    selectedClaimTokensUsd,
    selectableRewards,
    isAllChecked,
    handleToggleSelectAll,
  } = useClaimAffiliateRewardsSelection({
    chainId,
    rewards,
    marketsInfoData,
  });

  const totalClaimableFundingUsd =
    marketsInfoData && affiliateRewardsData
      ? getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData)
      : 0n;

  const {
    swapTargetTokenOptions,
    isSwapEnabled,
    setIsSwapEnabled,
    swapTargetTokenAddress,
    setSwapTargetTokenAddress,
    swapTargetToken,
    tokensToSwap,
    hasSwapRouteError,
    isSwapRouteLoading,
    isSwapRouteReady,
    settlementSwapExternalCalls,
    multichainSwapExternalCalls,
    toReceiveAmount,
    toReceiveUsd,
    swapEstimatedNetworkFeeAmount,
    failedSwapTokenSymbols,
  } = useClaimAffiliateSwapRoutes({
    account,
    chainId,
    selectedClaimTokenAmountsByToken,
    tokensData,
  });

  const wrappedToken = getByKey(tokensData, getWrappedToken(chainId).address);
  const swapEstimatedNetworkFeeUsd =
    wrappedToken && swapEstimatedNetworkFeeAmount > 0n
      ? convertToUsd(swapEstimatedNetworkFeeAmount, wrappedToken.decimals, wrappedToken.prices.minPrice)
      : undefined;

  const handleSubmitSettlementChain = async () => {
    if (!account || !signer || !affiliateRewardsData || !marketsInfoData || srcChainId !== undefined || !rewardsParams)
      return;
    if (isSwapEnabled && tokensToSwap.length > 0 && !settlementSwapExternalCalls) {
      helperToast.error(t`Swap route unavailable`);
      return;
    }

    setIsSubmitting(true);

    try {
      let tx: WalletTxnResult;
      if (isSwapEnabled && tokensToSwap.length > 0) {
        const swapExternalCalls = settlementSwapExternalCalls;
        if (!swapExternalCalls) {
          throw new Error("Swap external calls are unavailable");
        }

        tx = await simulateAndClaimAffiliateRewardsAndSwapTxn(chainId, signer, {
          account,
          rewardsParams,
          externalCalls: {
            externalCallTargets: swapExternalCalls.externalCallTargets,
            externalCallDataList: swapExternalCalls.externalCallDataList,
            refundTokens: swapExternalCalls.refundTokens,
            refundReceivers: swapExternalCalls.refundReceivers,
          },
        });
      } else {
        tx = await claimAffiliateRewardsTxn(chainId, signer, {
          account,
          rewardsParams,
        });
      }

      const receipt = await tx.wait();
      if (receipt?.status === "success") {
        helperToast.success(t`Affiliate rewards claimed`);
        onClose();
      } else {
        throw new Error("Transaction receipt status is failed");
      }
    } catch (error) {
      metrics.pushError(error, "expressClaimAffiliateRewards");
      helperToast.error(t`Failed to claim affiliate rewards`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const expressTransactionBuilder = useMultichainClaimAffiliateRewardsExpressTransactionBuilder({
    rewardsParams,
  });

  const expressTxnParamsAsyncResult = useArbitraryRelayParamsAndPayload({
    isGmxAccount: true,
    enabled: srcChainId !== undefined,
    expressTransactionBuilder,
    transactionExternalCalls:
      isSwapEnabled && isSwapRouteReady && tokensToSwap.length > 0 ? multichainSwapExternalCalls : undefined,
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error);
  const isExpressParamsLoading =
    srcChainId !== undefined &&
    expressTxnParamsAsyncResult.data === undefined &&
    expressTxnParamsAsyncResult.error === undefined;

  const isOutOfTokenErrorToken = useMemo(() => {
    if (errors?.isOutOfTokenError?.tokenAddress) {
      return getByKey(tokensData, errors.isOutOfTokenError.tokenAddress);
    }
  }, [errors, tokensData]);

  const handleSubmitMultichain = async () => {
    if (isSwapEnabled && tokensToSwap.length > 0 && !isSwapRouteReady) {
      helperToast.error(t`Swap route unavailable`);
      return;
    }

    setIsSubmitting(true);

    try {
      const expressTxnParams = await expressTxnParamsAsyncResult.promise;
      if (!expressTxnParams || !account || !signer) {
        helperToast.error(t`Claim parameters unavailable. Retry in a few seconds`);
        metrics.pushError(new Error("No necessary params to claim"), "expressClaimAffiliateRewards");
        return;
      }

      const result = await simulateAndCreateMultichainClaimAffiliateRewardsTxn({
        account,
        marketAddresses: rewardsParams.marketAddresses,
        tokenAddresses: rewardsParams.tokenAddresses,
        chainId,
        srcChainId,
        signer,
        expressTxnParams,
      });

      const receipt = await result.wait();
      if (receipt?.status === "failed") {
        throw new Error("Transaction receipt status is failed");
      }

      helperToast.success(t`Claim successful`);
      onClose();
    } catch (error) {
      helperToast.error(t`Claiming affiliate rewards failed`);
      metrics.pushError(error, "expressClaimAffiliateRewards");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (hasOutdatedUi) {
      return;
    }
    if (srcChainId === undefined) {
      handleSubmitSettlementChain();
    } else {
      handleSubmitMultichain();
    }
  };

  const submitButtonState = useMemo(() => {
    if (hasOutdatedUi) {
      return {
        text: getPageOutdatedError(),
        disabled: true,
      };
    } else if (isSubmitting) {
      return {
        text: t`Claiming...`,
        disabled: true,
      };
    } else if (selectedMarketAddresses.length === 0) {
      return {
        text: t`No rewards selected`,
        disabled: true,
      };
    } else if (isSwapEnabled && !swapTargetTokenAddress) {
      return {
        text: t`Swap token unavailable`,
        disabled: true,
      };
    } else if (isSwapEnabled && tokensToSwap.length > 0 && isSwapRouteLoading) {
      return {
        text: t`Fetching swap route...`,
        disabled: true,
      };
    } else if (isSwapEnabled && tokensToSwap.length > 0 && hasSwapRouteError) {
      return {
        text: t`Swap route unavailable`,
        disabled: true,
      };
    } else if (errors?.isOutOfTokenError) {
      const token = getToken(chainId, errors.isOutOfTokenError.tokenAddress);
      return {
        text: t`Insufficient ${token?.symbol} balance`,
        disabled: true,
      };
    } else if (isExpressParamsLoading) {
      return {
        text: (
          <>
            <Trans>Loading...</Trans>
            <SpinnerIcon className="ml-4 animate-spin" />
          </>
        ),
        disabled: true,
      };
    } else if (srcChainId !== undefined && expressTxnParamsAsyncResult.error) {
      return {
        text: expressTxnParamsAsyncResult.error.name.slice(0, 32) ?? t`Error simulating claim`,
        disabled: true,
      };
    } else {
      return {
        text: isSwapEnabled ? t`Claim & swap` : t`Claim`,
        disabled: false,
      };
    }
  }, [
    hasOutdatedUi,
    isSubmitting,
    selectedMarketAddresses.length,
    isSwapEnabled,
    swapTargetTokenAddress,
    tokensToSwap.length,
    isSwapRouteLoading,
    hasSwapRouteError,
    errors?.isOutOfTokenError,
    isExpressParamsLoading,
    srcChainId,
    expressTxnParamsAsyncResult.error,
    chainId,
  ]);

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
          <Trans>Claim {formatUsd(totalClaimableFundingUsd)}</Trans>
        </div>

        <Table>
          <thead>
            <TableTheadTr>
              <TableTh className="w-[20px] !pl-0">
                <Checkbox
                  isChecked={isAllChecked}
                  setIsChecked={handleToggleSelectAll}
                  isPartialChecked={
                    selectedMarketAddresses.length > 0 && selectedMarketAddresses.length < selectableRewards.length
                  }
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
            {mainRewards.map((reward) => (
              <ClaimRewardRow
                key={reward.marketAddress}
                reward={reward}
                marketsInfoData={marketsInfoData}
                isSelected={selectedMarketAddresses.includes(reward.marketAddress)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
            {smallRewards.length > 0 && (
              <>
                <tr>
                  <TableTd colSpan={3} className="!p-0 !pt-8">
                    <Button
                      variant="ghost"
                      className="w-full text-13 text-typography-secondary"
                      onClick={() => setShowSmallRewards((v) => !v)}
                    >
                      {showSmallRewards ? (
                        <Trans>Hide assets with small value</Trans>
                      ) : (
                        <Trans>Show assets with small value ({smallRewards.length})</Trans>
                      )}
                    </Button>
                  </TableTd>
                </tr>
                {showSmallRewards &&
                  smallRewards.map((reward) => (
                    <ClaimRewardRow
                      key={reward.marketAddress}
                      reward={reward}
                      marketsInfoData={marketsInfoData}
                      isSelected={selectedMarketAddresses.includes(reward.marketAddress)}
                      onToggleSelect={handleToggleSelect}
                    />
                  ))}
              </>
            )}
          </tbody>
        </Table>

        {swapTargetTokenOptions.length > 0 && (
          <div>
            <ToggleSwitch isChecked={isSwapEnabled} setIsChecked={setIsSwapEnabled} textClassName="text-body-medium">
              <Trans>Swap all rewards into one asset</Trans>
            </ToggleSwitch>

            <AnimatePresence initial={false}>
              {isSwapEnabled && (
                <motion.div
                  key="swap-options"
                  className="mt-12 flex flex-col gap-8 overflow-hidden"
                  {...SWAP_OPTIONS_ANIMATION}
                >
                  <SyntheticsInfoRow
                    label={<Trans>Swap to</Trans>}
                    value={
                      <ClaimSwapTargetTokenSelector
                        options={swapTargetTokenOptions}
                        value={swapTargetTokenAddress}
                        onSelect={setSwapTargetTokenAddress}
                      />
                    }
                  />
                  <SyntheticsInfoRow
                    label={<Trans>Total value of assets being swapped</Trans>}
                    value={formatUsd(selectedClaimTokensUsd)}
                  />
                  <SyntheticsInfoRow
                    label={<Trans>Network fee</Trans>}
                    value={
                      tokensToSwap.length === 0 ? (
                        "-"
                      ) : isSwapRouteLoading ? (
                        <Trans>Loading...</Trans>
                      ) : wrappedToken && swapEstimatedNetworkFeeAmount > 0n ? (
                        <AmountWithUsdBalance
                          amount={swapEstimatedNetworkFeeAmount}
                          decimals={wrappedToken.decimals}
                          usd={swapEstimatedNetworkFeeUsd}
                          symbol={wrappedToken.symbol}
                          isStable={wrappedToken.isStable}
                        />
                      ) : (
                        "-"
                      )
                    }
                  />
                  <SyntheticsInfoRow
                    label={<Trans>You'll receive</Trans>}
                    value={
                      !swapTargetToken || toReceiveAmount === 0n ? (
                        "-"
                      ) : isSwapRouteLoading && tokensToSwap.length > 0 ? (
                        <Trans>Loading...</Trans>
                      ) : (
                        <AmountWithUsdBalance
                          amount={toReceiveAmount}
                          decimals={swapTargetToken.decimals}
                          usd={toReceiveUsd}
                          symbol={swapTargetToken.symbol}
                          isStable={swapTargetToken.isStable}
                        />
                      )
                    }
                  />

                  {hasSwapRouteError && (
                    <AlertInfoCard type="warning" hideClose>
                      {failedSwapTokenSymbols ? (
                        <Trans>Swap route unavailable for: {failedSwapTokenSymbols}</Trans>
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

        <OutOfTokenErrorAlert errors={errors} token={isOutOfTokenErrorToken} onClose={onClose} />

        <Button
          className="w-full"
          variant="primary-action"
          onClick={handleSubmit}
          disabled={submitButtonState.disabled}
        >
          {submitButtonState.text}
        </Button>

        <NetworkFee errors={errors} expressTxnParamsAsyncResult={expressTxnParamsAsyncResult} />
      </div>
    </ModalWithPortal>
  );
}

function ClaimSwapTargetTokenSelector({
  options,
  value,
  onSelect,
}: {
  options: SwapTargetTokenOption[];
  value: string | undefined;
  onSelect: (tokenAddress: string) => void;
}) {
  const selectedOption = options.find((option) => option.token.address === value);

  if (!selectedOption) {
    return "-";
  }

  return (
    <DropdownSelector
      value={value}
      onChange={onSelect}
      slim
      variant="ghost"
      button={
        <div className="flex items-center justify-end gap-4">
          <TokenIcon symbol={selectedOption.token.symbol} displaySize={18} />
          <span>{selectedOption.token.symbol}</span>
        </div>
      }
      options={options}
      item={ClaimSwapTargetTokenOption}
      itemKey={swapTargetTokenOptionKey}
    />
  );
}

const swapTargetTokenOptionKey = (option: SwapTargetTokenOption) => option.token.address;

function ClaimSwapTargetTokenOption({ option }: { option: SwapTargetTokenOption }) {
  return (
    <div className="flex items-center gap-4">
      <TokenIcon symbol={option.token.symbol} displaySize={18} />
      <div className="text-typography-secondary">{option.token.symbol}</div>
    </div>
  );
}

function ClaimRewardRow({
  reward,
  marketsInfoData,
  isSelected,
  onToggleSelect,
}: {
  reward: AffiliateReward;
  marketsInfoData: MarketsInfoData | undefined;
  isSelected: boolean;
  onToggleSelect: (marketAddress: string) => void;
}) {
  const handleToggleSelect = useCallback(() => {
    onToggleSelect(reward.marketAddress);
  }, [onToggleSelect, reward.marketAddress]);

  const marketInfo = getByKey(marketsInfoData, reward.marketAddress);
  if (!marketInfo) {
    return null;
  }

  const totalReward = getRewardUsd(reward, marketsInfoData);
  if (totalReward <= 0) {
    return null;
  }

  const { longToken, shortToken, isSameCollaterals } = marketInfo;
  const indexName = getMarketIndexName(marketInfo);
  const poolName = getMarketPoolName(marketInfo);
  const { longTokenAmount, shortTokenAmount } = reward;

  const claimableAmountsItems: string[] = [];

  if (longTokenAmount > 0) {
    claimableAmountsItems.push(
      formatTokenAmount(longTokenAmount, longToken.decimals, longToken.symbol, { isStable: longToken.isStable })!
    );
  }

  if (!isSameCollaterals && shortTokenAmount > 0) {
    claimableAmountsItems.push(
      formatTokenAmount(shortTokenAmount, shortToken.decimals, shortToken.symbol, { isStable: shortToken.isStable })!
    );
  }

  return (
    <tr>
      <TableTd className="!pl-0">
        <Checkbox isChecked={isSelected} setIsChecked={handleToggleSelect} />
      </TableTd>
      <TableTd>
        <div className="flex items-center">
          <span>{indexName}</span>
          <span className="subtext">[{poolName}]</span>
        </div>
      </TableTd>

      <TableTd className="!pr-0">
        <Tooltip
          className="ClaimModal-row-tooltip"
          handle={formatUsd(totalReward)}
          position="top-end"
          content={
            <>
              {claimableAmountsItems.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </>
          }
        />
      </TableTd>
    </tr>
  );
}

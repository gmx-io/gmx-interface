import { t, Trans } from "@lingui/macro";
import partition from "lodash/partition";
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
import { claimAffiliateRewardsTxn } from "domain/synthetics/referrals/claimAffiliateRewardsTxn";
import {
  buildAndSignMultichainClaimAffiliateRewardsTxn,
  createMultichainClaimAffiliateRewardsTxn,
} from "domain/synthetics/referrals/createMultichainClaimAffiliateRewardsTxn";
import { AffiliateReward } from "domain/synthetics/referrals/types";
import { useAffiliateRewards } from "domain/synthetics/referrals/useAffiliateRewards";
import { getTotalClaimableAffiliateRewardsUsd } from "domain/synthetics/referrals/utils";
import { convertToUsd, useTokensDataRequest } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { metrics } from "lib/metrics";
import { expandDecimals, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getPageOutdatedError, useHasOutdatedUi } from "lib/useHasOutdatedUi";
import type { AsyncResult } from "lib/useThrottledAsync";
import useWallet from "lib/wallets/useWallet";
import type { ContractsChainId } from "sdk/configs/chains";
import { getTokenAddressByMarket } from "sdk/configs/markets";
import { convertTokenAddress, getToken } from "sdk/configs/tokens";
import type { TokenData } from "sdk/utils/tokens/types";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import { Amount } from "components/Amount/Amount";
import { AmountWithUsdBalance } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import Modal from "components/Modal/Modal";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import { Table, TableTd, TableTh, TableTheadTr } from "components/Table/Table";
import Tooltip from "components/Tooltip/Tooltip";

type Props = {
  onClose: () => void;
};

type RewardsParams = {
  marketAddresses: string[];
  tokenAddresses: string[];
};

const MIN_REWARD_USD_THRESHOLD = expandDecimals(1, 30); // $1 in USD_DECIMALS

function getRewardUsd(reward: AffiliateReward, marketsInfoData: MarketsInfoData | undefined): bigint {
  const marketInfo = marketsInfoData ? getByKey(marketsInfoData, reward.marketAddress) : undefined;
  if (!marketInfo) {
    return 0n;
  }

  const { longToken, shortToken, isSameCollaterals } = marketInfo;
  const { longTokenAmount, shortTokenAmount } = reward;

  const longRewardUsd = convertToUsd(longTokenAmount, longToken.decimals, longToken.prices.minPrice)!;
  let totalReward = longRewardUsd;

  if (!isSameCollaterals) {
    const shortRewardUsd = convertToUsd(shortTokenAmount, shortToken.decimals, shortToken.prices.minPrice)!;
    totalReward += shortRewardUsd;
  }

  return totalReward;
}

function buildRewardsParams(chainId: ContractsChainId, rewards: AffiliateReward[], selectedMarketAddresses: string[]) {
  const selectedRewards = rewards.filter((reward) => selectedMarketAddresses.includes(reward.marketAddress));
  const marketAddresses: string[] = [];
  const tokenAddresses: string[] = [];

  for (const reward of selectedRewards) {
    if (reward.longTokenAmount > 0) {
      marketAddresses.push(reward.marketAddress);
      tokenAddresses.push(getTokenAddressByMarket(chainId, reward.marketAddress, "long"));
    }

    if (reward.shortTokenAmount > 0) {
      marketAddresses.push(reward.marketAddress);
      tokenAddresses.push(getTokenAddressByMarket(chainId, reward.marketAddress, "short"));
    }
  }

  return {
    marketAddresses,
    tokenAddresses,
  };
}

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

  return <SyntheticsInfoRow label={t`Network Fee`} value={networkFeeFormatted} />;
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
    <AlertInfoCard type="warning" hideClose>
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
          . Please{" "}
          <span
            className="text-body-small cursor-pointer text-13 font-medium text-typography-secondary underline underline-offset-2"
            onClick={() => {
              onClose();
              history.push(`/trade/swap?to=${token.symbol}`);
            }}
          >
            swap
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
          more {token.symbol} to your GMX account.
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

  const visibleRewards = useMemo(
    () => rewards.filter((reward) => reward.longTokenAmount > 0 || reward.shortTokenAmount > 0),
    [rewards]
  );

  const { mainRewards, smallRewards } = useMemo(() => {
    const withUsd = visibleRewards
      .map((reward) => ({ reward, usd: getRewardUsd(reward, marketsInfoData) }))
      .filter(({ usd }) => usd > 0n)
      .sort((a, b) => (a.usd > b.usd ? -1 : a.usd < b.usd ? 1 : 0));

    const [main, small] = partition(withUsd, ({ usd }) => usd > MIN_REWARD_USD_THRESHOLD);
    return {
      mainRewards: main.map(({ reward }) => reward),
      smallRewards: small.map(({ reward }) => reward),
    };
  }, [visibleRewards, marketsInfoData]);

  const [showSmallRewards, setShowSmallRewards] = useState(false);
  const [selectedMarketAddresses, setSelectedMarketAddresses] = useState<string[]>([]);

  const handleToggleSelect = useCallback((marketAddress: string) => {
    setSelectedMarketAddresses((prev) => {
      if (prev.includes(marketAddress)) {
        return prev.filter((address) => address !== marketAddress);
      }
      return [...prev, marketAddress];
    });
  }, []);

  const totalClaimableFundingUsd =
    marketsInfoData && affiliateRewardsData
      ? getTotalClaimableAffiliateRewardsUsd(marketsInfoData, affiliateRewardsData)
      : 0n;

  const rewardsParams = useMemo(
    () => buildRewardsParams(chainId, rewards, selectedMarketAddresses),
    [rewards, selectedMarketAddresses, chainId]
  );

  const handleSubmitSettlementChain = async () => {
    if (!account || !signer || !affiliateRewardsData || !marketsInfoData || srcChainId !== undefined || !rewardsParams)
      return;

    setIsSubmitting(true);

    try {
      const tx = await claimAffiliateRewardsTxn(chainId, signer, {
        account,
        rewardsParams,
      });

      const receipt = await tx.wait();
      if (receipt?.status === "success") {
        onClose();
      }

      helperToast.success(t`Claiming successful.`);
    } catch (error) {
      metrics.pushError(error, "expressClaimAffiliateRewards");
      helperToast.error(t`Claiming failed`);
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
  });

  const errors = useArbitraryError(expressTxnParamsAsyncResult.error);

  const isOutOfTokenErrorToken = useMemo(() => {
    if (errors?.isOutOfTokenError?.tokenAddress) {
      return getByKey(tokensData, errors.isOutOfTokenError.tokenAddress);
    }
  }, [errors, tokensData]);

  const handleSubmitMultichain = async () => {
    setIsSubmitting(true);

    try {
      const expressTxnParams = await expressTxnParamsAsyncResult.promise;
      if (!expressTxnParams || !account || !signer) {
        helperToast.error(t`No necessary params to claim. Retry in a few seconds.`);
        metrics.pushError(new Error("No necessary params to claim"), "expressClaimAffiliateRewards");
        return;
      }

      const result = await createMultichainClaimAffiliateRewardsTxn({
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

      helperToast.success(t`Claiming successful.`);
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

  const selectableRewards = useMemo(
    () => (showSmallRewards ? [...mainRewards, ...smallRewards] : mainRewards),
    [showSmallRewards, mainRewards, smallRewards]
  );

  const isAllChecked =
    selectableRewards.length > 0 &&
    selectableRewards.every((reward) => selectedMarketAddresses.includes(reward.marketAddress));

  const handleToggleSelectAll = useCallback(() => {
    if (isAllChecked) {
      setSelectedMarketAddresses([]);
    } else {
      setSelectedMarketAddresses(selectableRewards.map((reward) => reward.marketAddress));
    }
  }, [isAllChecked, selectableRewards]);

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
    } else if (errors?.isOutOfTokenError) {
      const token = getToken(chainId, errors.isOutOfTokenError.tokenAddress);
      return {
        text: t`Insufficient ${token?.symbol} balance`,
        disabled: true,
      };
    } else {
      return {
        text: t`Claim`,
        disabled: false,
      };
    }
  }, [chainId, errors?.isOutOfTokenError, hasOutdatedUi, isSubmitting, selectedMarketAddresses.length]);

  return (
    <Modal
      contentClassName="w-[400px] overflow-y-auto"
      isVisible={true}
      setIsVisible={onClose}
      label={t`Confirm Claim`}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-12">
        <div className="text-center text-20 font-medium">Claim {formatUsd(totalClaimableFundingUsd)}</div>

        <Table>
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
              <Trans>Market</Trans>
            </TableTh>
            <TableTh className="!pr-0">
              <Trans>Rewards</Trans>
            </TableTh>
          </TableTheadTr>
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
        </Table>

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
    </Modal>
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
          renderContent={() => (
            <>
              {claimableAmountsItems.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </>
          )}
        />
      </TableTd>
    </tr>
  );
}

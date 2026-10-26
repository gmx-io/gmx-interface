import { plural, t, Trans } from "@lingui/macro";
import { useCallback, useState } from "react";

import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { getIsRewardRouterChanged, getRewardRouterContract } from "domain/stake/rewardRouter";
import { sendStakingActionMetric } from "domain/stake/sendStakingActionMetric";
import { getReservedForVestingAmount, getUnstakeRequestStatus } from "domain/stake/unstakeRequests";
import { useRewardRouter } from "domain/stake/useRewardRouter";
import { useSbfGmxBalance } from "domain/stake/useSbfGmxBalance";
import { useUnstakeRequests } from "domain/stake/useUnstakeRequests";
import { useChainId } from "lib/chains";
import { callContract } from "lib/contracts";
import { formatDateTime } from "lib/dates";
import { StakingProcessedData } from "lib/legacy";
import { formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import { showRewardRouterChangedToast, showStakingErrorToast } from "components/Errors/stakingToasts";
import { TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { UnstakeWithdrawModal } from "./UnstakeWithdrawModal";

export function UnstakeRequests({ processedData }: { processedData: StakingProcessedData | undefined }) {
  const { chainId } = useChainId();
  const { account, signer } = useWallet();
  const { setPendingTxns } = usePendingTxns();
  const { rewardRouter, mutateRewardRouter } = useRewardRouter(chainId);
  const { unstakeRequestsData } = useUnstakeRequests(chainId, { rewardRouter, account });
  const sbfGmxBalance = useSbfGmxBalance(chainId, account);
  const [cancellingRequestKey, setCancellingRequestKey] = useState<string>();
  const [isWithdrawModalVisible, setIsWithdrawModalVisible] = useState(false);

  const handleCancel = useCallback(
    async (requestKey: string) => {
      if (!rewardRouter) {
        return;
      }

      setCancellingRequestKey(requestKey);

      try {
        if (await getIsRewardRouterChanged(chainId, rewardRouter)) {
          mutateRewardRouter();
          showRewardRouterChangedToast();
          return;
        }

        await callContract(chainId, getRewardRouterContract(rewardRouter, signer), "cancelUnstake", [requestKey], {
          sentMsg: t`Cancel submitted`,
          failMsg: t`Cancel failed`,
          successMsg: t`Unstake request cancelled`,
          setPendingTxns,
          hideErrorMsg: true,
        });
        sendStakingActionMetric({ action: "unstakeCancel", tokenSymbol: undefined, chainId });
      } catch (error) {
        showStakingErrorToast({ chainId, error, failMsg: t`Cancel failed` });
        sendStakingActionMetric({ action: "unstakeCancel", tokenSymbol: undefined, chainId, error });
      } finally {
        setCancellingRequestKey(undefined);
      }
    },
    [chainId, mutateRewardRouter, rewardRouter, setPendingTxns, signer]
  );

  if (rewardRouter?.version !== "v3" || !unstakeRequestsData?.requests.length) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const gmxInStakedGmx = processedData?.gmxInStakedGmx ?? 0n;
  const esGmxInStakedGmx = processedData?.esGmxInStakedGmx ?? 0n;

  return (
    <section className="flex flex-col rounded-8 bg-slate-900">
      <h2 className="text-body-large p-20 pb-2 font-medium text-typography-primary">
        <Trans>Unstake requests</Trans>
      </h2>

      <TableScrollFadeContainer className="px-8 pb-8">
        <table className="w-full min-w-max">
          <thead>
            <TableTheadTr>
              <TableTh>
                <Trans>Amount</Trans>
              </TableTh>
              <TableTh>
                <Trans>Requested</Trans>
              </TableTh>
              <TableTh>
                <Trans>Available from</Trans>
              </TableTh>
              <TableTh>
                <Trans>Status</Trans>
              </TableTh>
              <TableTh />
            </TableTheadTr>
          </thead>
          <tbody>
            {unstakeRequestsData.requests.map((request) => {
              const status = getUnstakeRequestStatus(request, { unstakeDelay: unstakeRequestsData.unstakeDelay, now });
              const isCancelling = cancellingRequestKey === request.key;

              return (
                <TableTr key={request.key}>
                  <TableTd className="numbers">{formatAmount(request.amount, 18, 2, true)} GMX / esGMX</TableTd>
                  <TableTd>{formatDateTime(request.requestedAt)}</TableTd>
                  <TableTd>{formatDateTime(status.availableAt)}</TableTd>
                  <TableTd>
                    {status.type === "ready" ? (
                      <span className="text-green-500">
                        <Trans>Ready to withdraw</Trans>
                      </span>
                    ) : (
                      t`Waiting (${plural(status.daysLeft, { one: "# day left", other: "# days left" })})`
                    )}
                  </TableTd>
                  <TableTd>
                    <div className="flex justify-end gap-8">
                      {status.type === "ready" && (
                        <Button variant="secondary" onClick={() => setIsWithdrawModalVisible(true)}>
                          <Trans>Withdraw</Trans>
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        disabled={cancellingRequestKey !== undefined}
                        onClick={() => handleCancel(request.key)}
                      >
                        {isCancelling ? <Trans>Cancelling...</Trans> : <Trans>Cancel</Trans>}
                      </Button>
                    </div>
                  </TableTd>
                </TableTr>
              );
            })}
          </tbody>
        </table>
      </TableScrollFadeContainer>

      <UnstakeWithdrawModal
        isVisible={isWithdrawModalVisible}
        setIsVisible={setIsWithdrawModalVisible}
        chainId={chainId}
        signer={signer}
        rewardRouter={rewardRouter}
        mutateRewardRouter={mutateRewardRouter}
        executableAmount={unstakeRequestsData.executableAmount}
        gmxInStakedGmx={gmxInStakedGmx}
        esGmxInStakedGmx={esGmxInStakedGmx}
        sbfGmxBalance={sbfGmxBalance}
        reservedAmount={getReservedForVestingAmount({
          stakedAmount: gmxInStakedGmx + esGmxInStakedGmx,
          sbfGmxBalance,
        })}
        setPendingTxns={setPendingTxns}
      />
    </section>
  );
}

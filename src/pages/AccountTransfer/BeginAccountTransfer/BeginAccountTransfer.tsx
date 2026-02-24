import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import noop from "lodash/noop";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { isAddress, zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { callContract, contractFetcher } from "lib/contracts";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import Modal from "components/Modal/Modal";
import PageTitle from "components/PageTitle/PageTitle";

import CheckIcon from "img/ic_check.svg?react";
import CloseIcon from "img/ic_close.svg?react";

function ValidationRow({ isValid, children }) {
  return (
    <div className="flex items-center gap-4">
      {isValid ? <CheckIcon className="size-16 text-green-500" /> : <CloseIcon className="size-16 text-red-500" />}

      <div>{children}</div>
    </div>
  );
}

export default function BeginAccountTransfer() {
  const { active, signer, account } = useWallet();
  const { chainId } = useChainId();
  const { setPendingTxns } = usePendingTxns();
  const [receiver, setReceiver] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);
  const [isAffiliateVesterSkipValidation, setIsAffiliateVesterSkipValidation] = useState(false);
  let parsedReceiver: string = zeroAddress;
  if (isAddress(receiver, { strict: false })) {
    parsedReceiver = receiver;
  }
  const hasValidReceiver = parsedReceiver !== zeroAddress;

  const gmxAddress = getContract(chainId, "GMX");
  const gmxVesterAddress = getContract(chainId, "GmxVester");
  const glpVesterAddress = getContract(chainId, "GlpVester");
  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const { data: gmxVesterBalance } = useSWR(active && [active, chainId, gmxVesterAddress, "balanceOf", account], {
    fetcher: contractFetcher(signer, "Token"),
  });

  const { data: glpVesterBalance } = useSWR(active && [active, chainId, glpVesterAddress, "balanceOf", account], {
    fetcher: contractFetcher(signer, "Token"),
  });

  const { data: affiliateVesterBalance } = useSWR(
    active && [active, chainId, affiliateVesterAddress, "balanceOf", account],
    {
      fetcher: contractFetcher(signer, "Token"),
    }
  );

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const { data: cumulativeGmxRewards } = useSWR(
    [active, chainId, stakedGmxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, "RewardTracker"),
    }
  );

  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const { data: cumulativeBonusGmxTrackerRewards } = useSWR(
    [active, chainId, bonusGmxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, "RewardTracker"),
    }
  );

  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const { data: cumulativeFeeGlpTrackerRewards } = useSWR(
    [active, chainId, feeGlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, "RewardTracker"),
    }
  );

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const { data: cumulativeGlpRewards } = useSWR(
    [active, chainId, stakedGlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, "RewardTracker"),
    }
  );

  const { data: transferredCumulativeGmxRewards } = useSWR(
    [active, chainId, gmxVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, "Vester"),
    }
  );

  const { data: transferredCumulativeGlpRewards } = useSWR(
    [active, chainId, glpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, "Vester"),
    }
  );

  const { data: pendingReceiver } = useSWR(
    active && [active, chainId, rewardRouterAddress, "pendingReceivers", account],
    {
      fetcher: contractFetcher(signer, "RewardRouter"),
    }
  );

  const { tokensAllowanceData: gmxAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: stakedGmxTrackerAddress,
    tokenAddresses: [gmxAddress],
  });
  const gmxAllowance = gmxAllowanceData?.[gmxAddress];

  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const { tokensAllowanceData: feeGmxAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: parsedReceiver,
    tokenAddresses: [feeGmxTrackerAddress],
  });

  const { data: feeGmxTrackerBalance } = useSWR(
    active && [active, chainId, feeGmxTrackerAddress, "balanceOf", account],
    {
      fetcher: contractFetcher(signer, "Token"),
      refreshInterval: 1000,
    }
  );

  const needFeeGmxTrackerApproval = useMemo(
    () =>
      Boolean(
        hasValidReceiver &&
          feeGmxTrackerBalance !== undefined &&
          feeGmxAllowanceData &&
          getNeedTokenApprove(feeGmxAllowanceData, feeGmxTrackerAddress, feeGmxTrackerBalance, [])
      ),
    [feeGmxTrackerAddress, feeGmxTrackerBalance, hasValidReceiver, feeGmxAllowanceData]
  );

  const { data: gmxStaked } = useSWR(
    active && [active, chainId, stakedGmxTrackerAddress, "depositBalances", account, gmxAddress],
    {
      fetcher: contractFetcher(signer, "RewardTracker"),
    }
  );

  const needApproval = gmxAllowance !== undefined && gmxStaked && gmxStaked > gmxAllowance;

  useEffect(() => {
    if (!needApproval && !needFeeGmxTrackerApproval && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, needApproval, needFeeGmxTrackerApproval]);

  const hasVestedGmx = gmxVesterBalance > 0;
  const hasVestedGlp = glpVesterBalance > 0;
  const hasVestedAffiliate = affiliateVesterBalance > 0;
  const hasStakedGmx =
    (cumulativeGmxRewards && cumulativeGmxRewards > 0) ||
    (transferredCumulativeGmxRewards && transferredCumulativeGmxRewards > 0) ||
    (cumulativeBonusGmxTrackerRewards && cumulativeBonusGmxTrackerRewards > 0);
  const hasStakedGlp =
    (cumulativeGlpRewards && cumulativeGlpRewards > 0) ||
    (transferredCumulativeGlpRewards && transferredCumulativeGlpRewards > 0) ||
    (cumulativeFeeGlpTrackerRewards && cumulativeFeeGlpTrackerRewards > 0);
  const hasPendingReceiver = pendingReceiver && pendingReceiver !== zeroAddress;

  const getError = () => {
    if (!account) {
      return t`Wallet is not connected`;
    }
    if (hasVestedGmx) {
      return t`Vested GMX not withdrawn`;
    }
    if (hasVestedGlp) {
      return t`Vested GLP not withdrawn`;
    }
    if (!receiver || receiver.length === 0) {
      return t`Enter Receiver Address`;
    }
    if (!isAddress(receiver, { strict: false })) {
      return t`Invalid Receiver Address`;
    }

    if (hasVestedAffiliate && !isAffiliateVesterSkipValidation) {
      return t`Vested GMX not withdrawn`;
    }

    if (hasStakedGmx || hasStakedGlp) {
      return t`Receiver has staked GMX/GLP before`;
    }

    if ((parsedReceiver || "").toString().toLowerCase() === (account || "").toString().toLowerCase()) {
      return t`Self-transfer not supported`;
    }

    if (
      (parsedReceiver || "").length > 0 &&
      (parsedReceiver || "").toString().toLowerCase() === (pendingReceiver || "").toString().toLowerCase()
    ) {
      return t`Transfer already initiated`;
    }
  };

  const isReadyForSbfGmxTokenApproval = !(
    hasVestedGlp ||
    hasVestedGmx ||
    (hasVestedAffiliate && !isAffiliateVesterSkipValidation) ||
    hasStakedGmx ||
    hasStakedGlp
  );

  const isPrimaryEnabled = () => {
    const error = getError();
    if (error) {
      return false;
    }
    if (isApproving) {
      return false;
    }
    if (isTransferring) {
      return false;
    }
    if (hasValidReceiver && !feeGmxAllowanceData) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (isApproving) {
      return t`Approving...`;
    }
    if (needApproval) {
      return t`Approve GMX`;
    }
    if (needFeeGmxTrackerApproval) {
      if (!isReadyForSbfGmxTokenApproval) {
        return t`Pending Transfer Approval`;
      }
      return t`Allow all my tokens to be transferred to a new account`;
    }
    if (isTransferring) {
      return t`Transferring`;
    }

    return t`Begin Transfer`;
  };

  const onClickPrimary = () => {
    if (needApproval) {
      setIsApproving(true);
      approveTokens({
        setIsApproving: noop,
        signer,
        tokenAddress: gmxAddress,
        spender: stakedGmxTrackerAddress,
        chainId,
        permitParams: undefined,
        approveAmount: undefined,
        onApproveFail: () => {
          setIsApproving(false);
        },
      });
      return;
    }

    if (needFeeGmxTrackerApproval && isReadyForSbfGmxTokenApproval) {
      setIsApproving(true);
      approveTokens({
        setIsApproving: noop,
        signer,
        tokenAddress: feeGmxTrackerAddress,
        spender: parsedReceiver,
        chainId,
        permitParams: undefined,
        approveAmount: feeGmxTrackerBalance,
        onApproveFail: () => {
          setIsApproving(false);
        },
      });
      return;
    }

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: t`Transfer submitted.`,
      failMsg: t`Transfer failed.`,
      setPendingTxns,
    })
      .then(() => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsTransferring(false);
      });
  };

  const completeTransferLink = `/complete_account_transfer/${account}/${parsedReceiver}`;
  const pendingTransferLink = `/complete_account_transfer/${account}/${pendingReceiver}`;

  return (
    <AppPageLayout>
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label={t`Transfer Submitted`}
      >
        <Trans>Your transfer has been initiated.</Trans>
        <br />
        <br />
        <Link className="App-cta" to={completeTransferLink}>
          <Trans>Continue</Trans>
        </Link>
      </Modal>

      <div className="pb-16">
        <PageTitle
          className="md:pl-8"
          title={t`Transfer Account`}
          subtitle={
            <Trans>
              Please only use this for full account transfers.
              <br />
              This will transfer all your GMX, esGMX, GLP, Multiplier Points and voting power to your new account.
              <br />
              Transfers are only supported if the receiving account has not staked GMX or GLP tokens before.
              <br />
              Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
            </Trans>
          }
        />

        {hasPendingReceiver && (
          <div className="Page-description">
            <Trans>
              You have a <Link to={pendingTransferLink}>pending transfer</Link> to {pendingReceiver}.
            </Trans>
          </div>
        )}
      </div>

      <div className="mx-auto flex max-w-[700px] flex-col gap-20 rounded-8 bg-slate-900 p-20 md:w-[620px]">
        <div className="flex flex-col gap-8">
          <label className="text-16 font-medium">
            <Trans>Receiver Address</Trans>
          </label>
          <div>
            <input type="text" value={receiver} onChange={(e) => setReceiver(e.target.value)} className="text-input" />
          </div>
        </div>
        <div className="flex flex-col gap-8 text-14 font-medium">
          <ValidationRow isValid={!hasVestedGmx}>
            <Trans>Sender has withdrawn all tokens from GMX Vesting Vault</Trans>
          </ValidationRow>
          <ValidationRow isValid={!hasVestedGlp}>
            <Trans>Sender has withdrawn all tokens from GLP Vesting Vault</Trans>
          </ValidationRow>
          <ValidationRow isValid={!hasVestedAffiliate}>
            <Trans>Sender has withdrawn all tokens from Affiliate Vesting Vault</Trans>
          </ValidationRow>
          {hasVestedAffiliate && (
            <>
              <p className="soft-error">
                <Trans>
                  You have esGMX tokens in the Affiliate Vault, you need to withdraw these tokens if you want to
                  transfer them to the new account
                </Trans>
              </p>
              <Checkbox
                className="VestedAffiliate-checkbox"
                isChecked={isAffiliateVesterSkipValidation}
                setIsChecked={setIsAffiliateVesterSkipValidation}
              >
                <span className="text-body-small text-yellow-300">
                  <Trans>I do not want to transfer the Affiliate esGMX tokens</Trans>
                </span>
              </Checkbox>
            </>
          )}

          <ValidationRow isValid={!hasStakedGmx}>
            <Trans>Receiver has not staked GMX tokens before</Trans>
          </ValidationRow>
          <ValidationRow isValid={!hasStakedGlp}>
            <Trans>Receiver has not staked GLP tokens before</Trans>
          </ValidationRow>
        </div>

        <Button
          variant="primary-action"
          className="w-full"
          disabled={!isPrimaryEnabled()}
          onClick={() => onClickPrimary()}
        >
          {getPrimaryText()}
        </Button>
      </div>
    </AppPageLayout>
  );
}

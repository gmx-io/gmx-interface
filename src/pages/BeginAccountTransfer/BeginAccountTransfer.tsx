import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import { getContract } from "config/contracts";
import { ethers } from "ethers";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";

import Footer from "components/Footer/Footer";
import Modal from "components/Modal/Modal";

import RewardRouter from "abis/RewardRouter.json";
import RewardTracker from "abis/RewardTracker.json";
import Token from "abis/Token.json";
import Vester from "abis/Vester.json";

import { FaCheck, FaTimes } from "react-icons/fa";

import { Trans, t } from "@lingui/macro";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { getNeedTokenApprove, useTokenBalances, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { callContract, contractFetcher } from "lib/contracts";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";
import { zeroAddress } from "viem";
import "./BeginAccountTransfer.css";

function ValidationRow({ isValid, children }) {
  return (
    <div className="ValidationRow">
      <div className="ValidationRow-icon-container">
        {isValid && <FaCheck className="ValidationRow-icon" />}
        {!isValid && <FaTimes className="ValidationRow-icon" />}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function BeginAccountTransfer() {
  const { active, signer, account } = useWallet();
  const { chainId } = useChainId();
  const [, setPendingTxns] = usePendingTxns();
  const [receiver, setReceiver] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false);
  const [isAffiliateVesterSkipValidation, setIsAffiliateVesterSkipValidation] = useState(false);
  let parsedReceiver = ethers.ZeroAddress;
  if (ethers.isAddress(receiver)) {
    parsedReceiver = receiver;
  }

  const gmxAddress = getContract(chainId, "GMX");
  const gmxVesterAddress = getContract(chainId, "GmxVester");
  const glpVesterAddress = getContract(chainId, "GlpVester");
  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const rewardRouterAddress = getContract(chainId, "RewardRouter");

  const { data: gmxVesterBalance } = useSWR(active && [active, chainId, gmxVesterAddress, "balanceOf", account], {
    fetcher: contractFetcher(signer, Token),
  });

  const { data: glpVesterBalance } = useSWR(active && [active, chainId, glpVesterAddress, "balanceOf", account], {
    fetcher: contractFetcher(signer, Token),
  });

  const { data: affiliateVesterBalance } = useSWR(
    active && [active, chainId, affiliateVesterAddress, "balanceOf", account],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");
  const { data: cumulativeGmxRewards } = useSWR(
    [active, chainId, stakedGmxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, RewardTracker),
    }
  );

  const bonusGmxTrackerAddress = getContract(chainId, "BonusGmxTracker");
  const { data: cumulativeBonusGmxTrackerRewards } = useSWR(
    [active, chainId, bonusGmxTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, RewardTracker),
    }
  );

  const feeGlpTrackerAddress = getContract(chainId, "FeeGlpTracker");
  const { data: cumulativeFeeGlpTrackerRewards } = useSWR(
    [active, chainId, feeGlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, RewardTracker),
    }
  );

  const stakedGlpTrackerAddress = getContract(chainId, "StakedGlpTracker");
  const { data: cumulativeGlpRewards } = useSWR(
    [active, chainId, stakedGlpTrackerAddress, "cumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, RewardTracker),
    }
  );

  const { data: transferredCumulativeGmxRewards } = useSWR(
    [active, chainId, gmxVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, Vester),
    }
  );

  const { data: transferredCumulativeGlpRewards } = useSWR(
    [active, chainId, glpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
    {
      fetcher: contractFetcher(signer, Vester),
    }
  );

  const { data: pendingReceiver } = useSWR(
    active && [active, chainId, rewardRouterAddress, "pendingReceivers", account],
    {
      fetcher: contractFetcher(signer, RewardRouter),
    }
  );

  const { data: gmxAllowance } = useSWR(
    active && [active, chainId, gmxAddress, "allowance", account, stakedGmxTrackerAddress],
    {
      fetcher: contractFetcher(signer, Token),
    }
  );

  const { data: gmxStaked } = useSWR(
    active && [active, chainId, stakedGmxTrackerAddress, "depositBalances", account, gmxAddress],
    {
      fetcher: contractFetcher(signer, RewardTracker),
    }
  );

  const needApproval = gmxAllowance && gmxStaked && gmxStaked > gmxAllowance;

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
  const hasPendingReceiver = pendingReceiver && pendingReceiver !== ethers.ZeroAddress;

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
    if (!ethers.isAddress(receiver)) {
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

    if (needFeeGmxTrackerApproval) {
      return false;
    }
    return true;
  };

  const getPrimaryText = () => {
    const error = getError();
    if (error) {
      return error;
    }
    if (needApproval) {
      return t`Approve GMX`;
    }
    if (isApproving) {
      return t`Approving...`;
    }
    if (isTransferring) {
      return t`Transferring`;
    }

    if (needFeeGmxTrackerApproval) {
      return t`Pending Transfer Approval`;
    }

    return t`Begin Transfer`;
  };

  const onClickPrimary = () => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: gmxAddress,
        spender: stakedGmxTrackerAddress,
        chainId,
      });
      return;
    }

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, signer);

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: t`Transfer submitted!`,
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

  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: parsedReceiver,
    tokenAddresses: [feeGmxTrackerAddress],
  });
  const { balancesData } = useTokenBalances(chainId, undefined, [{ address: feeGmxTrackerAddress }], 1000);

  const feeGmxTrackerBalance = balancesData?.[feeGmxTrackerAddress];
  const needFeeGmxTrackerApproval = useMemo(
    () =>
      Boolean(
        parsedReceiver &&
          feeGmxTrackerBalance !== undefined &&
          parsedReceiver !== zeroAddress &&
          tokensAllowanceData &&
          getNeedTokenApprove(tokensAllowanceData, feeGmxTrackerAddress, feeGmxTrackerBalance)
      ),
    [feeGmxTrackerAddress, feeGmxTrackerBalance, parsedReceiver, tokensAllowanceData]
  );

  return (
    <div className="BeginAccountTransfer Page page-layout ">
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

      <div className="default-container !m-0 pb-16">
        <div className="Page-title">
          <Trans>Transfer Account</Trans>
        </div>
        <div className="Page-description">
          <Trans>
            Please only use this for full account transfers.
            <br />
            This will transfer all your GMX, esGMX, GLP, Multiplier Points and voting power to your new account.
            <br />
            Transfers are only supported if the receiving account has not staked GMX or GLP tokens before.
            <br />
            Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
          </Trans>
        </div>
        {hasPendingReceiver && (
          <div className="Page-description">
            <Trans>
              You have a <Link to={pendingTransferLink}>pending transfer</Link> to {pendingReceiver}.
            </Trans>
          </div>
        )}
      </div>
      <div className="default-container !m-0">
        <div className="input-form">
          <div className="input-row">
            <label className="input-label">
              <Trans>Receiver Address</Trans>
            </label>
            <div>
              <input
                type="text"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                className="text-input"
              />
            </div>
          </div>
          <div className="BeginAccountTransfer-validations">
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
                  <span className="text-sm text-yellow-500">
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

          {isReadyForSbfGmxTokenApproval && needFeeGmxTrackerApproval && (
            <>
              <ApproveTokenButton
                tokenAddress={feeGmxTrackerAddress}
                tokenSymbol={"sbfGMX"}
                customLabel={t`Allow all my tokens to be transferred to a new account`}
                spenderAddress={parsedReceiver}
                approveAmount={feeGmxTrackerBalance}
              />
              <br />
            </>
          )}
          <div className="input-row">
            <Button
              variant="primary-action"
              className="w-full"
              disabled={!isPrimaryEnabled()}
              onClick={() => onClickPrimary()}
            >
              {getPrimaryText()}
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

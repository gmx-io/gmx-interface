import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ethers } from "ethers";
import React, { useCallback, useMemo, useState } from "react";

import { ARBITRUM, type ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { SetPendingTransactions } from "context/PendingTxnsContext/PendingTxnsContext";
import { useGovTokenAmount } from "domain/synthetics/governance/useGovTokenAmount";
import { useGovTokenDelegates } from "domain/synthetics/governance/useGovTokenDelegates";
import { useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { callContract } from "lib/contracts";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmount } from "lib/numbers";
import { UncheckedJsonRpcSigner } from "lib/rpc/UncheckedJsonRpcSigner";
import { abis } from "sdk/abis";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ExternalLink from "components/ExternalLink/ExternalLink";
import ModalWithPortal from "components/Modal/ModalWithPortal";

import { GMX_DAO_LINKS } from "./constants";

export function ClaimModal(props: {
  isVisible: boolean;
  setIsVisible: (isVisible: boolean) => void;
  rewardRouterAddress: string;
  signer: UncheckedJsonRpcSigner | undefined;
  chainId: ContractsChainId;
  setPendingTxns: SetPendingTransactions;
  totalGmxRewards: bigint | undefined;
  nativeTokenSymbol: string;
  wrappedTokenSymbol: string;
  isNativeTokenToClaim?: boolean;
  gmxUsageOptionsMsg?: React.ReactNode;
  onClaimSuccess?: () => void;
}) {
  const {
    isVisible,
    setIsVisible,
    rewardRouterAddress,
    signer,
    chainId,
    setPendingTxns,
    totalGmxRewards,
    nativeTokenSymbol,
    wrappedTokenSymbol,
    isNativeTokenToClaim,
    gmxUsageOptionsMsg,
    onClaimSuccess,
  } = props;
  const [isClaiming, setIsClaiming] = useState(false);
  const [shouldClaimGmx, setShouldClaimGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-gmx"],
    true
  );
  const [shouldStakeGmx, setShouldStakeGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-gmx"],
    true
  );
  const [shouldClaimEsGmx, setShouldClaimEsGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-es-gmx"],
    true
  );
  const [shouldStakeEsGmx, setShouldStakeEsGmx] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-stake-es-gmx"],
    true
  );
  const [shouldClaimWeth, setShouldClaimWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-claim-weth"],
    true
  );
  const [shouldConvertWeth, setShouldConvertWeth] = useLocalStorageSerializeKey(
    [chainId, "StakeV2-compound-should-convert-weth"],
    true
  );

  const govTokenAmount = useGovTokenAmount(chainId);
  const govTokenDelegatesAddress = useGovTokenDelegates(chainId);
  const isUndelegatedGovToken =
    chainId === ARBITRUM && govTokenDelegatesAddress === NATIVE_TOKEN_ADDRESS && govTokenAmount && govTokenAmount > 0;

  const gmxAddress = getContract(chainId, "GMX");
  const stakedGmxTrackerAddress = getContract(chainId, "StakedGmxTracker");

  const [isApproving, setIsApproving] = useState(false);

  const { tokensAllowanceData: gmxAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: stakedGmxTrackerAddress,
    tokenAddresses: [gmxAddress],
  });

  const gmxTokenAllowance = gmxAllowanceData?.[gmxAddress];

  const needApproval =
    shouldStakeGmx &&
    totalGmxRewards !== undefined &&
    ((gmxTokenAllowance !== undefined && totalGmxRewards > gmxTokenAllowance) ||
      (totalGmxRewards > 0n && gmxTokenAllowance === undefined));

  const isPrimaryEnabled = !isClaiming && !isApproving && !needApproval && !isUndelegatedGovToken;

  const primaryText = useMemo(() => {
    if (needApproval || isApproving) {
      return t`Pending GMX approval`;
    }
    if (isClaiming) {
      return t`Claiming...`;
    }
    return t`Claim`;
  }, [needApproval, isApproving, isClaiming]);

  const onClickPrimary = useCallback(() => {
    if (needApproval) {
      approveTokens({
        setIsApproving,
        signer,
        tokenAddress: gmxAddress,
        spender: stakedGmxTrackerAddress,
        chainId,
        permitParams: undefined,
        approveAmount: undefined,
      });
      return;
    }

    setIsClaiming(true);

    const contract = new ethers.Contract(rewardRouterAddress, abis.RewardRouter, signer);
    callContract(
      chainId,
      contract,
      "handleRewards",
      [
        shouldClaimGmx || shouldStakeGmx,
        shouldStakeGmx,
        shouldClaimEsGmx || shouldStakeEsGmx,
        shouldStakeEsGmx,
        true,
        isNativeTokenToClaim ? shouldClaimWeth || shouldConvertWeth : false,
        isNativeTokenToClaim ? shouldConvertWeth : false,
      ],
      {
        sentMsg: t`Claim submitted!`,
        failMsg: t`Claim failed.`,
        successMsg: t`Claim completed!`,
        successDetailsMsg: !shouldStakeGmx ? gmxUsageOptionsMsg : undefined,
        setPendingTxns,
      }
    )
      .then(() => {
        setIsVisible(false);
        onClaimSuccess?.();
      })
      .finally(() => {
        setIsClaiming(false);
      });
  }, [
    needApproval,
    signer,
    gmxAddress,
    stakedGmxTrackerAddress,
    chainId,
    rewardRouterAddress,
    shouldClaimGmx,
    shouldStakeGmx,
    shouldClaimEsGmx,
    shouldStakeEsGmx,
    isNativeTokenToClaim,
    shouldClaimWeth,
    shouldConvertWeth,
    gmxUsageOptionsMsg,
    setPendingTxns,
    setIsVisible,
    onClaimSuccess,
  ]);

  const toggleShouldStakeGmx = useCallback(
    (value: boolean) => {
      if (value) {
        setShouldClaimGmx(true);
      }
      setShouldStakeGmx(value);
    },
    [setShouldClaimGmx, setShouldStakeGmx]
  );

  const toggleShouldStakeEsGmx = useCallback(
    (value: boolean) => {
      if (value) {
        setShouldClaimEsGmx(true);
      }
      setShouldStakeEsGmx(value);
    },
    [setShouldClaimEsGmx, setShouldStakeEsGmx]
  );

  const toggleConvertWeth = useCallback(
    (value: boolean) => {
      if (value) {
        setShouldClaimWeth(true);
      }
      setShouldConvertWeth(value);
    },
    [setShouldClaimWeth, setShouldConvertWeth]
  );

  return (
    <ModalWithPortal className="StakeModal" isVisible={isVisible} setIsVisible={setIsVisible} label={t`Claim Rewards`}>
      <div className="CompoundModal-menu">
        <div>
          <Checkbox isChecked={shouldClaimGmx} setIsChecked={setShouldClaimGmx} disabled={shouldStakeGmx}>
            <Trans>Claim GMX Rewards</Trans>
          </Checkbox>
        </div>
        <div>
          <Checkbox isChecked={shouldStakeGmx} setIsChecked={toggleShouldStakeGmx}>
            <Trans>Stake GMX Rewards</Trans>
          </Checkbox>
        </div>
        <div>
          <Checkbox isChecked={shouldClaimEsGmx} setIsChecked={setShouldClaimEsGmx} disabled={shouldStakeEsGmx}>
            <Trans>Claim esGMX Rewards</Trans>
          </Checkbox>
        </div>
        <div>
          <Checkbox isChecked={shouldStakeEsGmx} setIsChecked={toggleShouldStakeEsGmx}>
            <Trans>Stake esGMX Rewards</Trans>
          </Checkbox>
        </div>
        {isNativeTokenToClaim && (
          <>
            <div>
              <Checkbox isChecked={shouldClaimWeth} setIsChecked={setShouldClaimWeth} disabled={shouldConvertWeth}>
                <Trans>Claim {wrappedTokenSymbol} Rewards</Trans>
              </Checkbox>
            </div>
            <div>
              <Checkbox isChecked={shouldConvertWeth} setIsChecked={toggleConvertWeth}>
                <Trans>
                  Convert {wrappedTokenSymbol} to {nativeTokenSymbol}
                </Trans>
              </Checkbox>
            </div>
          </>
        )}
      </div>
      {(needApproval || isApproving) && (
        <div className="mb-12">
          <ApproveTokenButton
            tokenAddress={gmxAddress}
            spenderAddress={stakedGmxTrackerAddress}
            tokenSymbol={"GMX"}
            isApproved={!needApproval}
          />
        </div>
      )}
      {isUndelegatedGovToken ? (
        <AlertInfo type="warning" className={cx("DelegateGMXAlertInfo")} textColor="text-yellow-500">
          <Trans>
            <ExternalLink href={GMX_DAO_LINKS.VOTING_POWER} className="display-inline">
              Delegate your undelegated {formatAmount(govTokenAmount, 18, 2, true)} GMX DAO
            </ExternalLink>
            voting power before claiming.
          </Trans>
        </AlertInfo>
      ) : null}
      <div className="Exchange-swap-button-container">
        <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled}>
          {primaryText}
        </Button>
      </div>
    </ModalWithPortal>
  );
}

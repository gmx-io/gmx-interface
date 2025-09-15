import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import useSWR from "swr";
import { zeroAddress } from "viem";

import { getContract } from "config/contracts";
import { getIcons } from "config/icons";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import useVestingData from "domain/vesting/useVestingData";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { helperToast } from "lib/helperToast";
import { PLACEHOLDER_ACCOUNT, ProcessedData } from "lib/legacy";
import { formatAmount, formatKeyAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";

import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import PageTitle from "components/PageTitle/PageTitle";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

import { AffiliateClaimModal } from "./AffiliateClaimModal";
import { AffiliateVesterWithdrawModal } from "./AffiliateVesterWithdrawModal";
import { VesterDepositModal } from "./VesterDepositModal";
import { VesterWithdrawModal } from "./VesterWithdrawModal";

export function Vesting({ processedData }: { processedData: ProcessedData | undefined }) {
  const { active, signer, account } = useWallet();
  const { chainId } = useChainId();
  const { openConnectModal } = useConnectModal();
  const [isAffiliateVesterWithdrawModalVisible, setIsAffiliateVesterWithdrawModalVisible] = useState(false);
  const vestingData = useVestingData(account);
  const { setPendingTxns } = usePendingTxns();

  const [isVesterWithdrawModalVisible, setIsVesterWithdrawModalVisible] = useState(false);
  const [vesterWithdrawTitle, setVesterWithdrawTitle] = useState("");
  const [vesterWithdrawAddress, setVesterWithdrawAddress] = useState("");
  const [vesterDepositMaxReserveAmount, setVesterDepositMaxReserveAmount] = useState<bigint | undefined>();
  const [vesterDepositStakeTokenLabel, setVesterDepositStakeTokenLabel] = useState("");
  const [isVesterDepositModalVisible, setIsVesterDepositModalVisible] = useState(false);
  const [vesterDepositTitle, setVesterDepositTitle] = useState("");
  const [vesterDepositMaxAmount, setVesterDepositMaxAmount] = useState<bigint | undefined>();
  const [vesterDepositBalance, setVesterDepositBalance] = useState<bigint | undefined>();
  const [vesterDepositVestedAmount, setVesterDepositVestedAmount] = useState<bigint | undefined>();
  const [vesterDepositAverageStakedAmount, setVesterDepositAverageStakedAmount] = useState<bigint | undefined | string>(
    ""
  );
  const [vesterDepositMaxVestableAmount, setVesterDepositMaxVestableAmount] = useState<bigint | undefined>();
  const [vesterDepositValue, setVesterDepositValue] = useState("");
  const [vesterDepositReserveAmount, setVesterDepositReserveAmount] = useState<bigint | undefined>();
  const [vesterDepositAddress, setVesterDepositAddress] = useState("");
  const [isAffiliateClaimModalVisible, setIsAffiliateClaimModalVisible] = useState(false);

  const icons = getIcons(chainId);

  const feeGmxTrackerAddress = getContract(chainId, "FeeGmxTracker");
  const gmxVesterAddress = getContract(chainId, "GmxVester");
  const affiliateVesterAddress = getContract(chainId, "AffiliateVester");

  const { data: sbfGmxBalance } = useSWR(
    feeGmxTrackerAddress !== zeroAddress && [
      `StakeV2:sbfGmxBalance:${active}`,
      chainId,
      feeGmxTrackerAddress,
      "balanceOf",
      account ?? PLACEHOLDER_ACCOUNT,
    ],
    {
      fetcher: contractFetcher(undefined, "Token"),
    }
  );

  const reservedAmount =
    (processedData?.gmxInStakedGmx !== undefined &&
      processedData?.esGmxInStakedGmx !== undefined &&
      sbfGmxBalance !== undefined &&
      processedData?.gmxInStakedGmx + processedData?.esGmxInStakedGmx - sbfGmxBalance) ||
    0n;

  let totalRewardTokens;

  if (processedData && processedData.bonusGmxInFeeGmx !== undefined) {
    totalRewardTokens = processedData.bonusGmxInFeeGmx;
  }

  function showAffiliateVesterWithdrawModal() {
    if (vestingData?.affiliateVesterVestedAmount === undefined || vestingData.affiliateVesterVestedAmount <= 0) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsAffiliateVesterWithdrawModalVisible(true);
  }

  const showGmxVesterDepositModal = () => {
    if (!vestingData) return;

    let remainingVestableAmount = vestingData.gmxVester.maxVestableAmount - vestingData.gmxVester.vestedAmount;
    if (processedData?.esGmxBalance !== undefined && processedData?.esGmxBalance < remainingVestableAmount) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`GMX Vault`);
    setVesterDepositStakeTokenLabel("staked GMX + esGMX");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositVestedAmount(vestingData.gmxVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.gmxVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.gmxVester.averageStakedAmount);
    setVesterDepositReserveAmount(reservedAmount);
    setVesterDepositMaxReserveAmount(totalRewardTokens);
    setVesterDepositValue("");
    setVesterDepositAddress(gmxVesterAddress);
  };

  const showGmxVesterWithdrawModal = () => {
    if (!vestingData || vestingData.gmxVesterVestedAmount === undefined || vestingData.gmxVesterVestedAmount === 0n) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle(t`Withdraw from GMX Vault`);
    setVesterWithdrawAddress(gmxVesterAddress);
  };

  function showAffiliateVesterDepositModal() {
    if (!vestingData?.affiliateVester) {
      helperToast.error(t`Unsupported network`);
      return;
    }

    let remainingVestableAmount =
      vestingData.affiliateVester.maxVestableAmount - vestingData.affiliateVester.vestedAmount;
    if (processedData?.esGmxBalance !== undefined && processedData.esGmxBalance < remainingVestableAmount) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`Affiliate Vault`);

    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositVestedAmount(vestingData?.affiliateVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData?.affiliateVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData?.affiliateVester.averageStakedAmount);

    setVesterDepositReserveAmount(undefined);
    setVesterDepositValue("");

    setVesterDepositAddress(affiliateVesterAddress);
  }

  function showAffiliateVesterClaimModal() {
    if (vestingData?.affiliateVesterClaimable === undefined || vestingData?.affiliateVesterClaimable <= 0) {
      helperToast.error(t`You have no GMX tokens to claim.`);
      return;
    }
    setIsAffiliateClaimModalVisible(true);
  }

  return (
    <>
      <AffiliateVesterWithdrawModal
        isVisible={isAffiliateVesterWithdrawModalVisible}
        setIsVisible={setIsAffiliateVesterWithdrawModalVisible}
        chainId={chainId}
        signer={signer}
        setPendingTxns={setPendingTxns}
      />
      <VesterDepositModal
        isVisible={isVesterDepositModalVisible}
        setIsVisible={setIsVesterDepositModalVisible}
        chainId={chainId}
        title={vesterDepositTitle}
        stakeTokenLabel={vesterDepositStakeTokenLabel}
        maxAmount={vesterDepositMaxAmount}
        balance={vesterDepositBalance}
        vestedAmount={vesterDepositVestedAmount}
        averageStakedAmount={
          typeof vesterDepositAverageStakedAmount === "string"
            ? vesterDepositAverageStakedAmount === ""
              ? undefined
              : BigInt(vesterDepositAverageStakedAmount)
            : vesterDepositAverageStakedAmount
        }
        maxVestableAmount={vesterDepositMaxVestableAmount}
        reserveAmount={vesterDepositReserveAmount}
        maxReserveAmount={vesterDepositMaxReserveAmount}
        value={vesterDepositValue}
        setValue={setVesterDepositValue}
        signer={signer}
        vesterAddress={vesterDepositAddress}
        setPendingTxns={setPendingTxns}
      />
      <VesterWithdrawModal
        isVisible={isVesterWithdrawModalVisible}
        setIsVisible={setIsVesterWithdrawModalVisible}
        vesterAddress={vesterWithdrawAddress}
        chainId={chainId}
        title={vesterWithdrawTitle}
        signer={signer}
        setPendingTxns={setPendingTxns}
      />
      <AffiliateClaimModal
        signer={signer}
        chainId={chainId}
        setPendingTxns={setPendingTxns}
        isVisible={isAffiliateClaimModalVisible}
        setIsVisible={setIsAffiliateClaimModalVisible}
        totalVesterRewards={vestingData?.affiliateVesterClaimable ?? 0n}
      />
      <div className="flex flex-col gap-16">
        <PageTitle
          title={t`Vest`}
          subtitle={
            <Trans>
              Convert esGMX tokens to GMX tokens.
              <br />
              Please read the{" "}
              <ExternalLink href="https://docs.gmx.io/docs/tokenomics/rewards#vesting">
                vesting details
              </ExternalLink>{" "}
              before using the vaults.
            </Trans>
          }
        />
        <div>
          <div className="StakeV2-cards">
            <div className="App-card StakeV2-gmx-card">
              <div className="App-card-title">
                <div className="inline-flex items-center">
                  <img className="mr-5 h-20" alt="GMX" src={icons?.gmx} height={20} />
                  <Trans>GMX Vault</Trans>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Staked Tokens</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatAmount(totalRewardTokens, 18, 2, true)}
                      handleClassName="numbers"
                      position="bottom-end"
                      content={
                        <>
                          <StatsTooltipRow
                            showDollar={false}
                            label="GMX"
                            value={
                              <span className="numbers">
                                {formatAmount(processedData?.gmxInStakedGmx, 18, 2, true)}
                              </span>
                            }
                          />

                          <StatsTooltipRow
                            showDollar={false}
                            label="esGMX"
                            value={
                              <span className="numbers">
                                {formatAmount(processedData?.esGmxInStakedGmx, 18, 2, true)}
                              </span>
                            }
                          />
                        </>
                      }
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Reserved for Vesting</Trans>
                  </div>
                  <div>
                    <span className="numbers">{formatAmount(reservedAmount, 18, 2, true)}</span> /{" "}
                    <span className="numbers">{formatAmount(totalRewardTokens, 18, 2, true)}</span>
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Vesting Status</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "gmxVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "gmxVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      handleClassName="numbers"
                      position="bottom-end"
                      content={
                        <div>
                          <Trans>
                            <span className="numbers">
                              {formatKeyAmount(vestingData, "gmxVesterClaimSum", 18, 4, true)}
                            </span>{" "}
                            tokens have been converted to GMX from the{" "}
                            <span className="numbers">
                              {formatKeyAmount(vestingData, "gmxVesterVestedAmount", 18, 4, true)}
                            </span>{" "}
                            esGMX deposited for vesting.
                          </Trans>
                        </div>
                      }
                    />
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Claimable</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={formatKeyAmount(vestingData, "gmxVesterClaimable", 18, 4, true)}
                      handleClassName="numbers"
                      position="bottom-end"
                      content={
                        <Trans>
                          <span className="numbers">
                            {formatKeyAmount(vestingData, "gmxVesterClaimable", 18, 4, true)}
                          </span>{" "}
                          GMX tokens can be claimed, use the options under the total rewards section to claim them.
                        </Trans>
                      }
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {!active && (
                    <Button variant="secondary" onClick={openConnectModal}>
                      <Trans>Connect wallet</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGmxVesterDepositModal()}>
                      <Trans>Deposit</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGmxVesterWithdrawModal()}>
                      <Trans>Withdraw</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {(vestingData?.affiliateVesterMaxVestableAmount && vestingData?.affiliateVesterMaxVestableAmount > 0 && (
              <div className="App-card StakeV2-gmx-card">
                <div className="App-card-title">
                  <div className="inline-flex items-center">
                    <img className="mr-5 h-20" alt="GLP" src={icons?.gmx} height={20} />
                    <Trans>Affiliate Vault</Trans>
                  </div>
                </div>
                <div className="App-card-divider" />
                <div className="App-card-content">
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Vesting Status</Trans>
                    </div>
                    <div>
                      <Tooltip
                        handle={`${formatKeyAmount(
                          vestingData,
                          "affiliateVesterClaimSum",
                          18,
                          4,
                          true
                        )} / ${formatKeyAmount(vestingData, "affiliateVesterVestedAmount", 18, 4, true)}`}
                        handleClassName="numbers"
                        position="bottom-end"
                        content={
                          <div>
                            <Trans>
                              <span className="numbers">
                                {formatKeyAmount(vestingData, "affiliateVesterClaimSum", 18, 4, true)}
                              </span>{" "}
                              tokens have been converted to GMX from the{" "}
                              <span className="numbers">
                                {formatKeyAmount(vestingData, "affiliateVesterVestedAmount", 18, 4, true)}
                              </span>{" "}
                              esGMX deposited for vesting.
                            </Trans>
                          </div>
                        }
                      />
                    </div>
                  </div>
                  <div className="App-card-row">
                    <div className="label">
                      <Trans>Claimable</Trans>
                    </div>
                    <div>
                      <span className="numbers">
                        {formatKeyAmount(vestingData, "affiliateVesterClaimable", 18, 4, true)}
                      </span>
                    </div>
                  </div>
                  <div className="App-card-divider" />
                  <div className="App-card-buttons m-0">
                    {!active && (
                      <Button variant="secondary" onClick={openConnectModal}>
                        <Trans>Connect wallet</Trans>
                      </Button>
                    )}
                    {active && (
                      <Button variant="secondary" onClick={() => showAffiliateVesterDepositModal()}>
                        <Trans>Deposit</Trans>
                      </Button>
                    )}
                    {active && (
                      <Button variant="secondary" onClick={() => showAffiliateVesterWithdrawModal()}>
                        <Trans>Withdraw</Trans>
                      </Button>
                    )}
                    {active && (
                      <Button variant="secondary" onClick={() => showAffiliateVesterClaimModal()}>
                        <Trans>Claim</Trans>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )) ||
              null}
          </div>
        </div>
      </div>
    </>
  );
}

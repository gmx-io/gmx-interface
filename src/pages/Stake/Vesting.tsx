import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import useSWR from "swr";

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
import PageTitle from "components/PageTitle/PageTitle";
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
  const glpVesterAddress = getContract(chainId, "GlpVester");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: sbfGmxBalance } = useSWR(
    [`StakeV2:sbfGmxBalance:${active}`, chainId, feeGmxTrackerAddress, "balanceOf", account ?? PLACEHOLDER_ACCOUNT],
    {
      fetcher: contractFetcher(undefined, "Token"),
    }
  );

  const showGlpVesterDepositModal = () => {
    if (!vestingData) return;

    let remainingVestableAmount = vestingData.glpVester.maxVestableAmount - vestingData.glpVester.vestedAmount;
    if (processedData?.esGmxBalance !== undefined && processedData?.esGmxBalance < remainingVestableAmount) {
      remainingVestableAmount = processedData.esGmxBalance;
    }

    setIsVesterDepositModalVisible(true);
    setVesterDepositTitle(t`GLP Vault`);
    setVesterDepositStakeTokenLabel("staked GLP");
    setVesterDepositMaxAmount(remainingVestableAmount);
    setVesterDepositBalance(processedData?.esGmxBalance);
    setVesterDepositVestedAmount(vestingData.glpVester.vestedAmount);
    setVesterDepositMaxVestableAmount(vestingData.glpVester.maxVestableAmount);
    setVesterDepositAverageStakedAmount(vestingData.glpVester.averageStakedAmount);
    setVesterDepositReserveAmount(vestingData.glpVester.pairAmount);
    setVesterDepositMaxReserveAmount(processedData?.glpBalance);
    setVesterDepositValue("");
    setVesterDepositAddress(glpVesterAddress);
  };

  const showGlpVesterWithdrawModal = () => {
    if (!vestingData || vestingData.glpVesterVestedAmount === undefined || vestingData.glpVesterVestedAmount === 0n) {
      helperToast.error(t`You have not deposited any tokens for vesting.`);
      return;
    }

    setIsVesterWithdrawModalVisible(true);
    setVesterWithdrawTitle(t`Withdraw from GLP Vault`);
    setVesterWithdrawAddress(glpVesterAddress);
  };

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
      <div>
        <PageTitle title={t`Vault`} />
        <div>
          <div className="StakeV2-cards">
            <div className="App-card StakeV2-gmx-card">
              <div className="App-card-title">
                <div className="inline-flex items-center">
                  <img className="mr-5 h-20" alt="GLP" src={icons?.glp} height={20} />
                  <Trans>GLP Vault</Trans>
                </div>
              </div>
              <div className="App-card-divider"></div>
              <div className="App-card-content">
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Staked Tokens</Trans>
                  </div>
                  <div>{formatAmount(processedData?.glpBalance, 18, 2, true)} GLP</div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Reserved for Vesting</Trans>
                  </div>
                  <div>
                    {formatKeyAmount(vestingData, "glpVesterPairAmount", 18, 2, true)} /{" "}
                    {formatAmount(processedData?.glpBalance, 18, 2, true)}
                  </div>
                </div>
                <div className="App-card-row">
                  <div className="label">
                    <Trans>Vesting Status</Trans>
                  </div>
                  <div>
                    <Tooltip
                      handle={`${formatKeyAmount(vestingData, "glpVesterClaimSum", 18, 4, true)} / ${formatKeyAmount(
                        vestingData,
                        "glpVesterVestedAmount",
                        18,
                        4,
                        true
                      )}`}
                      position="bottom-end"
                      content={
                        <div>
                          <Trans>
                            {formatKeyAmount(vestingData, "glpVesterClaimSum", 18, 4, true)} tokens have been converted
                            to GMX from the {formatKeyAmount(vestingData, "glpVesterVestedAmount", 18, 4, true)} esGMX
                            deposited for vesting.
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
                      handle={formatKeyAmount(vestingData, "glpVesterClaimable", 18, 4, true)}
                      position="bottom-end"
                      content={
                        <Trans>
                          {formatKeyAmount(vestingData, "glpVesterClaimable", 18, 4, true)} GMX tokens can be claimed,
                          use the options under the Total Rewards section to claim them.
                        </Trans>
                      }
                    />
                  </div>
                </div>
                <div className="App-card-divider"></div>
                <div className="App-card-buttons m-0">
                  {!active && (
                    <Button variant="secondary" onClick={openConnectModal}>
                      <Trans>Connect Wallet</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGlpVesterDepositModal()}>
                      <Trans>Deposit</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" onClick={() => showGlpVesterWithdrawModal()}>
                      <Trans>Withdraw</Trans>
                    </Button>
                  )}
                  {active && (
                    <Button variant="secondary" to="/begin_account_transfer">
                      <Trans>Transfer Account</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

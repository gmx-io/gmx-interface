import { Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo } from "react";
import useSWR from "swr";

import { ARBITRUM, getConstant } from "config/chains";
import { getContract } from "config/contracts";
import { USD_DECIMALS } from "config/factors";
import { getIcons } from "config/icons";
import { useGmxPrice } from "domain/legacy";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { ProcessedData } from "lib/legacy";
import { expandDecimals, formatAmount } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";

import { AmountWithUsdBalance, AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import Button from "components/Button/Button";
import GMXAprTooltip from "components/Stake/GMXAprTooltip";
import Tooltip from "components/Tooltip/Tooltip";

import ReaderV2 from "sdk/abis/ReaderV2.json";

export function EscrowedGmxCard({
  processedData,
  showStakeEsGmxModal,
  showUnstakeEsGmxModal,
}: {
  processedData: ProcessedData | undefined;
  showStakeEsGmxModal: () => void;
  showUnstakeEsGmxModal: () => void;
}) {
  const { active, signer } = useWallet();
  const { chainId } = useChainId();
  const { openConnectModal } = useConnectModal();

  const icons = getIcons(chainId);

  const readerAddress = getContract(chainId, "Reader");

  const esGmxAddress = getContract(chainId, "ES_GMX");

  const stakedGmxDistributorAddress = getContract(chainId, "StakedGmxDistributor");
  const stakedGlpDistributorAddress = getContract(chainId, "StakedGlpDistributor");

  const excludedEsGmxAccounts = [stakedGmxDistributorAddress, stakedGlpDistributorAddress];

  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  const { data: esGmxSupply } = useSWR<bigint>(
    [`StakeV2:esGmxSupply:${active}`, chainId, readerAddress, "getTokenSupply", esGmxAddress],
    {
      fetcher: contractFetcher<bigint>(signer, ReaderV2, [excludedEsGmxAccounts]),
    }
  );

  const { gmxPrice } = useGmxPrice(chainId, { arbitrum: chainId === ARBITRUM ? signer : undefined }, active);

  let esGmxSupplyUsd;
  if (esGmxSupply !== undefined && gmxPrice !== undefined) {
    esGmxSupplyUsd = bigMath.mulDiv(esGmxSupply, gmxPrice, expandDecimals(1, 18));
  }

  const gmxAvgAprText = useMemo(() => {
    return `${formatAmount(processedData?.gmxAprTotal, 2, 2, true)}%`;
  }, [processedData?.gmxAprTotal]);

  return (
    <div className="App-card">
      <div className="App-card-title">
        <div className="inline-flex items-center">
          <img className="mr-5 h-20" alt="GLP" src={icons?.esgmx} height={20} />
          <span>
            <Trans>Escrowed GMX</Trans>
          </span>
        </div>
      </div>
      <div className="App-card-divider"></div>
      <div className="App-card-content">
        <div className="App-card-row">
          <div className="label">
            <Trans>Price</Trans>
          </div>
          <div>${formatAmount(gmxPrice, USD_DECIMALS, 2, true)}</div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Wallet</Trans>
          </div>
          <div>
            <AmountWithUsdBalance
              amount={processedData?.esGmxBalance}
              decimals={18}
              symbol="esGMX"
              usd={processedData?.esGmxBalanceUsd}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Staked</Trans>
          </div>
          <div>
            <AmountWithUsdBalance
              amount={processedData?.esGmxInStakedGmx}
              decimals={18}
              symbol="esGMX"
              usd={processedData?.esGmxInStakedGmxUsd}
            />
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-row">
          <div className="label">
            <Trans>APR</Trans>
          </div>
          <div>
            <Tooltip
              handle={gmxAvgAprText}
              position="bottom-end"
              renderContent={() => (
                <GMXAprTooltip processedData={processedData!} nativeTokenSymbol={nativeTokenSymbol} />
              )}
            />
          </div>
        </div>
        <div className="App-card-divider"></div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Total Staked</Trans>
          </div>
          <div>
            <AmountWithUsdHuman
              amount={processedData?.stakedEsGmxSupply}
              decimals={18}
              usd={processedData?.stakedEsGmxSupplyUsd}
            />
          </div>
        </div>
        <div className="App-card-row">
          <div className="label">
            <Trans>Total Supply</Trans>
          </div>
          <div>
            <AmountWithUsdHuman amount={esGmxSupply} decimals={18} usd={esGmxSupplyUsd} />
          </div>
        </div>
        <div className="App-card-footer">
          <div className="App-card-divider"></div>
          <div className="App-card-buttons m-0">
            {active && (
              <Button variant="secondary" onClick={() => showStakeEsGmxModal()}>
                <Trans>Stake</Trans>
              </Button>
            )}
            {active && (
              <Button variant="secondary" onClick={() => showUnstakeEsGmxModal()}>
                <Trans>Unstake</Trans>
              </Button>
            )}
            {!active && (
              <Button variant="secondary" onClick={openConnectModal}>
                <Trans> Connect Wallet</Trans>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

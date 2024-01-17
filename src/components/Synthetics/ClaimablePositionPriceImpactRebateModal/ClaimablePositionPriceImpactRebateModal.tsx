import { Trans, t } from "@lingui/macro";
import Modal from "components/Modal/Modal";
import Tooltip from "components/Tooltip/Tooltip";
import { PositionPriceImpactRebateInfo } from "domain/synthetics/claimHistory";
import { MarketsInfoData, getMarketIndexName, getMarketPoolName, useMarketsInfo } from "domain/synthetics/markets";
import { getTokenData, useTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { expandDecimals, formatTokenAmount, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { memo, useCallback, useMemo, useState } from "react";
import { calcTotalRebateUsd } from "../Claims/utils";
import Button from "components/Button/Button";
import { createClaimCollateralTxn } from "domain/synthetics/claimHistory/claimPriceImpactRebate";
import useWallet from "lib/wallets/useWallet";
import { BigNumber } from "ethers";

export function ClaimablePositionPriceImpactRebateModal({
  isVisible,
  onClose,
  claimablePositionPriceImpactFees,
}: {
  isVisible: boolean;
  onClose: () => void;
  claimablePositionPriceImpactFees: PositionPriceImpactRebateInfo[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { chainId } = useChainId();
  const { tokensData } = useTokensData(chainId);
  const totalUsd = useMemo(
    () => formatUsd(calcTotalRebateUsd(claimablePositionPriceImpactFees, tokensData, false)),
    [claimablePositionPriceImpactFees, tokensData]
  );
  const { signer, account } = useWallet();

  const reducedByMarket = useMemo(() => {
    const groupedMarkets: Record<string, number> = {};
    return claimablePositionPriceImpactFees.slice().reduce((acc, rebateItem) => {
      const key = rebateItem.marketAddress + rebateItem.tokenAddress;
      if (typeof groupedMarkets[key] === "number") {
        const index = groupedMarkets[key];
        acc[index].value = BigNumber.from(0);
        acc[index].valueByFactor = acc[index].valueByFactor.add(rebateItem.valueByFactor);
      } else {
        groupedMarkets[key] = acc.length;
        acc.push({ ...rebateItem });
      }

      return acc;
    }, [] as PositionPriceImpactRebateInfo[]);
  }, [claimablePositionPriceImpactFees]);

  const [buttonText, buttonDisabled] = useMemo(() => {
    if (isSubmitting) return [t`Claiming...`, true];
    return [t`Claim`, false];
  }, [isSubmitting]);

  const handleSubmit = useCallback(async () => {
    if (!signer) throw new Error("No signer");
    if (!account) throw new Error("No account");

    setIsSubmitting(true);

    try {
      await createClaimCollateralTxn(chainId, signer, {
        account,
        claimablePositionPriceImpactFees,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }, [account, chainId, claimablePositionPriceImpactFees, onClose, signer]);
  const { marketsInfoData } = useMarketsInfo(chainId);

  return (
    <Modal
      label={t`Price Impact Rebate`}
      className="Confirmation-box ClaimableModal"
      onClose={onClose}
      setIsVisible={onClose}
      isVisible={isVisible}
    >
      <div className="ConfirmationBox-main">
        <div className="text-center">
          <Trans>Claim {totalUsd}</Trans>
        </div>
      </div>
      <div className="ClaimModal-content ClaimSettleModal-modal-content">
        <div className="App-card-content">
          <div className="App-card-divider" />
          <div className="ClaimSettleModal-header">
            <div>
              <Trans>MARKET</Trans>
            </div>
            <div className="ClaimSettleModal-header-right">
              <Trans>REBATE</Trans>
            </div>
          </div>
          {marketsInfoData
            ? reducedByMarket.map((rebateItem) => (
                <Row marketsInfoData={marketsInfoData} key={rebateItem.id} rebateItem={rebateItem} />
              ))
            : null}
        </div>
      </div>
      <Button className="w-full" variant="primary-action" disabled={buttonDisabled} onClick={handleSubmit}>
        {buttonText}
      </Button>
    </Modal>
  );
}

const Row = memo(
  ({
    rebateItem,
    marketsInfoData,
  }: {
    rebateItem: PositionPriceImpactRebateInfo;
    marketsInfoData: MarketsInfoData;
  }) => {
    const { chainId } = useChainId();
    const label = useMemo(() => {
      const market = getByKey(marketsInfoData, rebateItem.marketAddress);
      if (!market) return "";

      const indexName = getMarketIndexName(market);
      const poolName = getMarketPoolName(market);
      return (
        <div className="items-center">
          <span className="text-white">{indexName}</span>
          <span className="subtext">[{poolName}]</span>
        </div>
      );
    }, [marketsInfoData, rebateItem.marketAddress]);
    const { tokensData } = useTokensData(chainId);
    const tokenData = useMemo(
      () => getTokenData(tokensData, rebateItem.tokenAddress),
      [rebateItem.tokenAddress, tokensData]
    );
    const usd = useMemo(() => {
      const price = tokenData?.prices.minPrice;
      const decimals = tokenData?.decimals;

      return price && decimals
        ? formatUsd(rebateItem.valueByFactor.mul(price).div(expandDecimals(1, decimals)))
        : t`NA`;
    }, [tokenData?.prices.minPrice, tokenData?.decimals, rebateItem.valueByFactor]);

    return (
      <div className="ClaimSettleModal-info-row">
        <div className="Exchange-info-label">{label}</div>
        <div className="ClaimSettleModal-info-label-usd">
          <Tooltip
            position="right-top"
            className="ClaimModal-row-tooltip"
            handle={usd}
            renderContent={useCallback(
              () => formatTokenAmount(rebateItem.valueByFactor, tokenData?.decimals, tokenData?.symbol),
              [rebateItem.valueByFactor, tokenData?.decimals, tokenData?.symbol]
            )}
          />
        </div>
      </div>
    );
  }
);

import { Trans } from "@lingui/macro";
import { useCallback } from "react";

import { MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING } from "config/multichain";
import { getChainName, SettlementChainId } from "config/static/chains";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { useAvailableToTradeAssetMultichainRequest } from "components/Synthetics/GmxAccountModal/hooks";

import InfoIcon from "img/ic_info.svg?react";

export function SettlementChainWarningContainer() {
  const { chainId: fallbackChainId, srcChainId } = useChainId();

  const [settlementChainId, setGmxAccountSettlementChainId] = useGmxAccountSettlementChainId();

  const settlementChains = srcChainId ? MULTICHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[srcChainId] : undefined;

  const { emptyGmxAccounts } = useEmptyGmxAccounts(settlementChains);

  const isCurrentSettlementChainEmpty = emptyGmxAccounts?.[settlementChainId] === true;

  const anyNonEmptyGmxAccountChainId = Object.entries(emptyGmxAccounts ?? EMPTY_OBJECT)
    .filter(([chainId, isEmpty]) => !isEmpty && chainId !== settlementChainId.toString())
    .map(([chainId]) => Number(chainId) as SettlementChainId)
    .at(0);

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichainRequest(
    anyNonEmptyGmxAccountChainId ?? fallbackChainId,
    srcChainId
  );

  const handleNetworkSwitch = useCallback(() => {
    if (!anyNonEmptyGmxAccountChainId) {
      return;
    }

    setGmxAccountSettlementChainId(anyNonEmptyGmxAccountChainId);
  }, [setGmxAccountSettlementChainId, anyNonEmptyGmxAccountChainId]);

  if (!anyNonEmptyGmxAccountChainId || !isCurrentSettlementChainEmpty) {
    return null;
  }

  return (
    <ColorfulBanner color="blue" icon={InfoIcon} className="text-body-small">
      <div className="pl-5">
        <Trans>
          You switched your settlement network to {getChainName(settlementChainId)}, but you still have{" "}
          {formatUsd(gmxAccountUsd)} remaining in your {getChainName(anyNonEmptyGmxAccountChainId)} GMX Account.
        </Trans>
        <br />
        <Button variant="link" className="mt-2 !text-12" onClick={handleNetworkSwitch}>
          <Trans>Change to {getChainName(anyNonEmptyGmxAccountChainId)}</Trans>
        </Button>
      </div>
    </ColorfulBanner>
  );
}

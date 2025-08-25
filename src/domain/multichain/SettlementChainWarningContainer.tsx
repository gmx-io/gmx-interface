import { Trans } from "@lingui/macro";

import { MULTI_CHAIN_SOURCE_TO_SETTLEMENTS_MAPPING } from "config/multichain";
import { getChainName, SettlementChainId } from "config/static/chains";
import { useGmxAccountSettlementChainId } from "context/GmxAccountContext/hooks";
import { useEmptyGmxAccounts } from "domain/multichain/useEmptyGmxAccounts";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { EMPTY_OBJECT } from "lib/objects";

import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { useAvailableToTradeAssetMultichainRequest } from "components/Synthetics/GmxAccountModal/hooks";

import InfoIcon from "img/ic_info.svg?react";

export function SettlementChainWarningContainer() {
  const { chainId: fallbackChainId, srcChainId } = useChainId();

  const [settlementChainId] = useGmxAccountSettlementChainId();

  const settlementChains = srcChainId ? MULTI_CHAIN_SOURCE_TO_SETTLEMENTS_MAPPING[srcChainId] : undefined;

  const { emptyGmxAccounts } = useEmptyGmxAccounts(settlementChains);

  const isCurrentSettlementChainEmpty = emptyGmxAccounts?.[settlementChainId] === true;

  const anyNonEmptyGmxAccountChainId = Object.entries(emptyGmxAccounts ?? EMPTY_OBJECT).find(
    ([chainId, isEmpty]) => !isEmpty && chainId !== settlementChainId.toString()
  )?.[0];

  const nonEmptyGmxAccountChainId = anyNonEmptyGmxAccountChainId
    ? (parseInt(anyNonEmptyGmxAccountChainId) as SettlementChainId)
    : fallbackChainId;

  const { gmxAccountUsd } = useAvailableToTradeAssetMultichainRequest(nonEmptyGmxAccountChainId, srcChainId);

  if (!anyNonEmptyGmxAccountChainId || !isCurrentSettlementChainEmpty) {
    return null;
  }

  return (
    <ColorfulBanner color="slate" icon={<InfoIcon className="-mt-4" />} className="text-body-small">
      <div className="pl-5">
        <Trans>
          You switched your settlement network to {getChainName(settlementChainId)}, but you still have{" "}
          {formatUsd(gmxAccountUsd)} remaining in your {getChainName(nonEmptyGmxAccountChainId)} Deposit
        </Trans>
      </div>
    </ColorfulBanner>
  );
}

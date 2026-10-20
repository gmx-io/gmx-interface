import { useEffect } from "react";

import { useGmxAccountModalOpen, useGmxAccountSelectedTransferGuid } from "context/GmxAccountContext/hooks";
import { CtAppProviders } from "domain/testUtils/CtAppProviders";
import { mockWagmiConfig } from "domain/testUtils/mockSyntheticsState";

import { TransferHistoryScreen } from "components/GmxAccountModal/GmxAccountModalShared";

function TransferHistoryStand({ openGuid }: { openGuid?: string }) {
  const [view, setView] = useGmxAccountModalOpen();
  const [, setSelectedTransferGuid] = useGmxAccountSelectedTransferGuid();

  useEffect(() => {
    if (openGuid) {
      setSelectedTransferGuid(openGuid);
      setView("transferDetails");
    } else {
      setView("transferHistory");
    }
  }, [openGuid, setSelectedTransferGuid, setView]);

  if (!view) {
    return null;
  }

  return (
    <div className="flex h-[560px] w-[420px] flex-col bg-slate-900" data-qa="transfer-history-stand">
      <TransferHistoryScreen showDetails={view === "transferDetails"} />
    </div>
  );
}

/** The GMX Account transfer history with the details overlay, opened directly on `openGuid` when it is set. */
export function TransferDetailsStory({ openGuid }: { openGuid?: string }) {
  return (
    <CtAppProviders wagmiConfig={mockWagmiConfig}>
      <TransferHistoryStand openGuid={openGuid} />
    </CtAppProviders>
  );
}

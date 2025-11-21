import { Trans } from "@lingui/macro";
import { memo } from "react";

import ConnectWalletButton from "components/ConnectWalletButton/ConnectWalletButton";

export const ConnectWalletModalContent = memo(function ConnectWalletModalContent({
  openConnectModal,
  walletIconUrls,
}: {
  openConnectModal: (() => void) | undefined;
  walletIconUrls: string[] | undefined;
}) {
  return (
    <div className="flex grow flex-col items-center justify-center gap-20 p-adaptive">
      {walletIconUrls?.length && (
        <div className="flex rounded-full bg-slate-800 p-2">
          {walletIconUrls.map((url, index) => (
            <img
              src={url}
              alt="Wallet Icon"
              className="relative -ml-8 size-24 rounded-full border-2 border-slate-800 first-of-type:ml-0"
              // Safety: walletIconUrls is not changing, memo prevents parent caused re-renders
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              style={{
                zIndex: walletIconUrls.length - index,
              }}
              key={url}
            />
          ))}
        </div>
      )}
      <div className="text-body-medium text-center text-typography-secondary">
        <Trans>
          Please connect your wallet to view
          <br />
          all available payment options
        </Trans>
      </div>
      <ConnectWalletButton onClick={openConnectModal}>
        <Trans>Connect Wallet</Trans>
      </ConnectWalletButton>
    </div>
  );
});

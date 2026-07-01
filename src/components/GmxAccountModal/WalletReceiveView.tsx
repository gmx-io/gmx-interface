import { Trans } from "@lingui/macro";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCopyToClipboard } from "react-use";
import { useAccount } from "wagmi";

import { getChainName } from "config/chains";
import { getChainIcon } from "config/icons";
import { useChainId } from "lib/chains";

import Button from "components/Button/Button";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";

import CheckIcon from "img/ic_check.svg?react";
import CopyIcon from "img/ic_copy.svg?react";

export function WalletReceiveView() {
  const { address } = useAccount();
  const { chainId: settlementChainId, srcChainId } = useChainId();
  const chainId = srcChainId ?? settlementChainId;
  const chainName = getChainName(chainId);
  const chainIcon = getChainIcon(chainId);

  const [isCopied, setIsCopied] = useState(false);
  const [, copyToClipboard] = useCopyToClipboard();
  const copyTimeoutRef = useRef<number | undefined>(undefined);

  const imageSettings = useMemo(() => ({ src: chainIcon, height: 28, width: 28, excavate: true }), [chainIcon]);

  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  if (!address) {
    return null;
  }

  const handleCopy = () => {
    copyToClipboard(address);
    clearTimeout(copyTimeoutRef.current);
    setIsCopied(true);
    copyTimeoutRef.current = window.setTimeout(() => setIsCopied(false), 1000);
  };

  return (
    <div className="flex grow flex-col items-center gap-[--padding-adaptive] p-adaptive">
      <div className="flex flex-col items-center gap-12">
        <div className="text-body-small font-medium text-typography-secondary">
          <Trans>{chainName} address</Trans>
        </div>

        <div className="flex size-[160px] items-center justify-center rounded-12 bg-white">
          <QRCodeSVG value={address} size={140} level="H" imageSettings={imageSettings} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-12 self-stretch">
        <div className="text-body-large self-stretch break-all px-28 text-center font-medium">
          <span className="text-typography-primary">{address.slice(0, 5)}</span>
          <span className="text-typography-secondary">{address.slice(5, -4)}</span>
          <span className="text-typography-primary">{address.slice(-4)}</span>
        </div>

        <Button variant="secondary" size="small" textAlign="center" className="w-full" onClick={handleCopy}>
          {isCopied ? <CheckIcon className="size-16" /> : <CopyIcon className="size-16" />}
          {isCopied ? <Trans>Address copied!</Trans> : <Trans>Copy address</Trans>}
        </Button>
      </div>

      <div className="h-0 w-full border-t-1/2 border-stroke-primary opacity-80" />

      <ColorfulBanner color="blue">
        <div className="flex items-start gap-8">
          <img src={chainIcon} alt={chainName} className="size-20 shrink-0" />
          <span className="text-blue-300">
            <Trans>
              Only send <span className="text-blue-100">{chainName}-compatible assets</span> to this address!
            </Trans>
          </span>
        </div>
      </ColorfulBanner>
    </div>
  );
}

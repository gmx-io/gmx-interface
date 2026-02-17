import { t } from "@lingui/macro";
import { ContractsChainId, getChainName } from "config/chains";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";

export function ChainDataImage({ chainId }: { chainId?: number }) {
  const { chainId: currentChainId } = useChainId();
  chainId = chainId || currentChainId;
  const chainName = getChainName(chainId as ContractsChainId);
  const chainIcon = getIcon(chainId, "network");

  return (
    <div
      className={`relative  inline-flex items-center gap-8 rounded-full
         bg-blue-300 px-8 py-6 pr-16 text-13 text-typography-primary`}
    >
      <div className="absolute left-[2px] top-0 inline-flex h-full w-full items-center gap-8 rounded-full bg-slate-950/80 px-8 py-6 pr-16">
        {chainIcon && <img src={chainIcon} alt={chainName} className="h-20 w-20" />}
        <span className="font-medium">{t`${chainName} Data`}</span>
      </div>
      {chainIcon && <img src={chainIcon} alt={chainName} className="h-20 w-20 opacity-0" />}
      <span className="font-medium opacity-0">{t`${chainName} Data`}</span>
    </div>
  );
}

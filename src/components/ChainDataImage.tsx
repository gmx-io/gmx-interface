import { CHAIN_NAMES_MAP } from "config/chains";
import { getIcon } from "config/icons";
import { useChainId } from "lib/chains";

export function ChainDataImage() {
  const { chainId } = useChainId();
  const chainName = CHAIN_NAMES_MAP[chainId];
  const chainIcon = getIcon(chainId, "network");

  return (
    <div
      className={`inline-flex items-center gap-12 rounded-full border-l-2 border-blue-300
        bg-blue-300 bg-opacity-20 px-8 py-6 pr-16 text-13 text-white`}
    >
      {chainIcon && <img src={chainIcon} alt={chainName} className="h-20 w-20" />}
      <span className="font-medium">{chainName} Data</span>
    </div>
  );
}

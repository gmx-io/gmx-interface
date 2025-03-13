import { Trans } from "@lingui/macro";
import { useLocalStorage } from "react-use";
import { IoMdClose } from "react-icons/io";
import IconBolt from "img/icon-bolt.svg?react";

import { useChainId } from "lib/chains";
import { getExpressTradingBannerDismissedKey } from "config/localStorage";

export function ExpressTradingBanner() {
  const { chainId } = useChainId();
  const [isExpressTradingBannerDismissed, setIsExpressTradingBannerDismissed] = useLocalStorage(
    getExpressTradingBannerDismissedKey(chainId),
    false
  );

  if (isExpressTradingBannerDismissed) {
    return null;
  }

  return (
    <div className="bg-green-600 border-l-green-700 relative flex items-center rounded-4 border-l-2 px-6 py-8">
      <div className="mr-6 w-16">
        <IconBolt className="absolute top-13" />
      </div>
      <div className="pr-8 text-12">
        <Trans>Express Trading is enabled. Enjoy smoother, more reliable trades!</Trans>
      </div>
      <button
        className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
        onClick={() => setIsExpressTradingBannerDismissed(true)}
      >
        <IoMdClose size={16} />
      </button>
    </div>
  );
}

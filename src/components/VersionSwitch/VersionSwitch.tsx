import cx from "classnames";

import { getIsV1Supported } from "config/features";
import { useChainId } from "lib/chains";
import { useTradePageVersion } from "lib/useTradePageVersion";
import "./VersionSwitch.scss";

type Props = {
  className?: string;
};

export function VersionSwitch({ className }: Props) {
  const { chainId } = useChainId();
  const [currentVersion, setCurrentVersion] = useTradePageVersion();

  return (
    <div className={cx("VersionSwitch text-body-medium select-none", className)}>
      <div
        className={cx("VersionSwitch-option v1", {
          active: currentVersion === 1,
          "hover:bg-transparent cursor-default": !getIsV1Supported(chainId),
          "cursor-pointer hover:bg-cold-blue-700": getIsV1Supported(chainId),
        })}
        onClick={() => {
          if (getIsV1Supported(chainId)) {
            setCurrentVersion(1);
          }
        }}
      >
        V1
      </div>

      <div
        className={cx("VersionSwitch-option v2 cursor-pointer hover:bg-cold-blue-700", {
          active: currentVersion === 2,
        })}
        onClick={() => setCurrentVersion(2)}
      >
        V2
      </div>
    </div>
  );
}

import Skeleton from "react-loading-skeleton";

import { formatUsd } from "lib/numbers";

type Props = {
  usd: bigint | undefined;
};

export function UsdValueWithSkeleton({ usd }: Props) {
  return (
    <span className="numbers">
      {usd !== undefined ? (
        formatUsd(usd)
      ) : (
        <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={54} className="leading-base" inline={true} />
      )}
    </span>
  );
}

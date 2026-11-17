import Skeleton from "react-loading-skeleton";

import { UsdValue } from "components/NumericValue/UsdValue";

type Props = {
  usd: bigint | undefined;
};

export function UsdValueWithSkeleton({ usd }: Props) {
  if (usd === undefined) {
    return (
      <span className="numbers">
        <Skeleton baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" width={54} className="leading-base" inline={true} />
      </span>
    );
  }

  return <UsdValue usd={usd} className="numbers" />;
}

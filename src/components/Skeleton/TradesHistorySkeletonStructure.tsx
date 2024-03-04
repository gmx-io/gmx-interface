import Skeleton from "react-loading-skeleton";

type Props = {
  withTimestamp?: boolean;
};

export default function MarketListSkeletonStructure(props: Props) {
  return (
    <tr>
      <td>
        <Skeleton width={150} count={1} />
        <Skeleton width={120} count={1} />
        {props.withTimestamp && <Skeleton width={300} className="Skeleton-max-w-full" count={1} />}
      </td>
      <td>
        <Skeleton width={110} count={1} />
      </td>
      <td>
        <Skeleton width={110} />
      </td>
      <td className="TradeHistoryRow-price">
        <Skeleton width={90} />
      </td>
    </tr>
  );
}

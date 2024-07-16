import Skeleton from "react-loading-skeleton";

type Props = {
  withTimestamp?: boolean;
};

export default function TradesHistorySkeletonStructure(props: Props) {
  return (
    <tr>
      <td>
        <Skeleton width={150} count={1} />
        <Skeleton width={120} count={1} />
        {props.withTimestamp && <Skeleton width={300} className="max-w-full" count={1} />}
      </td>
      <td>
        <Skeleton width={110} count={1} />
      </td>
      <td>
        <Skeleton width={110} />
      </td>
      <td>
        <Skeleton width={90} />
      </td>
      <td className="TradeHistoryRow-pnl-fees">
        <Skeleton width={60} />
      </td>
    </tr>
  );
}

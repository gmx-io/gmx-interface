import Skeleton from "react-loading-skeleton";

export default function ClaimsHistorySkeletonStructure() {
  return (
    <tr>
      <td>
        <Skeleton width={160} />
        <Skeleton width={120} />
      </td>
      <td>
        <Skeleton width={110} />
      </td>
      <td className="ClaimHistoryRow-size">
        <Skeleton width={110} />
      </td>
    </tr>
  );
}

import Skeleton from "react-loading-skeleton";

export function LeaderboardTopAccountsStructure() {
  return (
    <tr>
      <td>
        <Skeleton className="my-xs" width={40} />
      </td>
      <td>
        <Skeleton width={250} />
      </td>
      <td>
        <Skeleton />
      </td>
      <td>
        <Skeleton />
      </td>
      <td>
        <Skeleton />
      </td>
      <td>
        <Skeleton width={100} />
      </td>
      <td>
        <Skeleton width={110} />
      </td>
    </tr>
  );
}

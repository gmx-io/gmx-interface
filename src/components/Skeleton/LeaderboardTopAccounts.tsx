import Skeleton from "react-loading-skeleton";

export default function LeaderboardTopAccounts() {
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
        <Skeleton width={80} />
      </td>
      <td>
        <Skeleton width={80} />
      </td>
    </tr>
  );
}

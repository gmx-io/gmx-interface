import Skeleton from "react-loading-skeleton";

export default function MarketListSkeletonStructure() {
  return (
    <tr>
      <td>
        <div className="flex items-center">
          <Skeleton className="mr-10" height={40} width={40} circle />
          <Skeleton width={60} height={12} />
        </div>
      </td>
      <td>
        <Skeleton width={60} count={1} />
      </td>
      <td>
        <Skeleton width={150} height={12} />
      </td>
      <td>
        <Skeleton width={150} height={12} />
      </td>
      <td>
        <Skeleton width={150} height={12} />
      </td>
      <td>
        <Skeleton width={60} height={12} />
      </td>
    </tr>
  );
}

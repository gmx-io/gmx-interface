import Skeleton from "react-loading-skeleton";

export default function GMListSkeletonStructure() {
  return (
    <tr>
      <td>
        <div className="flex items-center">
          <Skeleton className="mr-10" height={40} width={40} circle />
          <div>
            <Skeleton width={60} height={12} />
            <Skeleton width={40} height={12} />
          </div>
        </div>
      </td>
      <td>
        <Skeleton width={60} count={1} />
      </td>
      <td>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </td>
      <td>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </td>
      <td>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </td>
      <>
        <td>
          <Skeleton width={60} count={1} />
        </td>
        <td>
          <Skeleton width={150} inline count={2} className="mr-5" />
        </td>
      </>
    </tr>
  );
}

import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { SkeletonTheme } from "react-loading-skeleton";
import "./a.css";

function TableRowSkeleton() {
  return (
    <tr>
      <td>
        <div className="items-center">
          <Skeleton className="mr-sm" height={40} width={40} circle />
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
      <td>
        <Skeleton count={1} />
      </td>
      <td></td>
    </tr>
  );
}

function TokenListSkeleton({ count = 8 }) {
  return (
    <>
      <div className="tr-wave" />
      <SkeletonTheme baseColor="#B4BBFF1A" highlightColor="#B4BBFF1A" enableAnimation={false}>
        {Array.from({ length: count }).map((_, index) => (
          <TableRowSkeleton key={index} />
        ))}
      </SkeletonTheme>
    </>
  );
}
export default TokenListSkeleton;

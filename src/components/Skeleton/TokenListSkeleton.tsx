import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { SkeletonTheme } from "react-loading-skeleton";

function TableRowSkeleton() {
  return (
    <SkeletonTheme baseColor="#a9a9b0" highlightColor="#76767b">
      <tr>
        <td>
          <div className="items-center">
            <Skeleton className="mr-xs" height={40} width={40} circle />
            <div>
              <Skeleton width={60} height={10} count={2} />
            </div>
          </div>
        </td>
        <td>
          <Skeleton count={1} />
        </td>
        <td>
          <Skeleton count={1} />
        </td>
        <td>
          <Skeleton count={1} />
        </td>
        <td>
          <Skeleton count={1} />
        </td>
        <td>
          <Skeleton count={1} />
        </td>
      </tr>
    </SkeletonTheme>
  );
}

function TokenListSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TableRowSkeleton key={index} />
      ))}
    </>
  );
}
export default TokenListSkeleton;

import Skeleton from "react-loading-skeleton";

export default function AccountPnlSummarySkeletonStructure() {
  return (
    <tr>
      <td className="py-13 pl-16 pr-5">
        <Skeleton width={60} />
      </td>
      <td className="px-5 py-13">
        <Skeleton width={70} />
      </td>
      <td className="px-5 py-13">
        <Skeleton width={50} />
      </td>
      <td className="px-5 py-13">
        <Skeleton width={63} />
      </td>
      <td className="py-13 pl-5 pr-16 text-right">
        <Skeleton width={51} />
      </td>
    </tr>
  );
}

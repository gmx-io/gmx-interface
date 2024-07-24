import { ExchangeTd, ExchangeTr } from "components/Synthetics/OrderList/ExchangeTable";
import Skeleton from "react-loading-skeleton";

export default function GMListSkeletonStructure() {
  return (
    <ExchangeTr hoverable={false} bordered={false}>
      <ExchangeTd>
        <div className="flex items-center">
          <Skeleton className="mr-10" height={40} width={40} circle />
          <div>
            <Skeleton width={60} height={12} />
            <Skeleton width={40} height={12} />
          </div>
        </div>
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={60} count={1} />
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={100} height={12} />
        <Skeleton width={80} height={12} />
      </ExchangeTd>

      <ExchangeTd>
        <Skeleton width={60} count={1} />
      </ExchangeTd>
      <ExchangeTd className="w-[350px]">
        <Skeleton
          containerClassName="flex justify-end flex-wrap gap-10"
          className="flex-grow"
          width={150}
          inline
          count={2}
        />
      </ExchangeTd>
    </ExchangeTr>
  );
}

import { ExchangeTd, ExchangeTr } from "components/Synthetics/OrderList/ExchangeTable";
import Skeleton from "react-loading-skeleton";

export default function MarketListSkeletonStructure() {
  return (
    <ExchangeTr bordered={false} hoverable={false}>
      <ExchangeTd>
        <div className="flex items-center">
          <Skeleton className="mr-10" height={40} width={40} circle />
          <Skeleton width={60} height={12} />
        </div>
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={60} count={1} />
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={150} height={12} />
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={150} height={12} />
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={150} height={12} />
      </ExchangeTd>
      <ExchangeTd>
        <Skeleton width={60} height={12} />
      </ExchangeTd>
    </ExchangeTr>
  );
}

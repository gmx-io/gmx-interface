import Skeleton from 'react-loading-skeleton';

export default function MarketCardSkeletonStructure() {
  return (
    <div className="App-card p-0">
      <div className="mb-10 flex items-center justify-between rounded-[0.4rem] bg-gradient-to-r from-[rgba(30,34,61,0.9)] to-[rgba(38,43,71,0.9)] p-10">
        <div className="itfoems-center flex gap-8">
          <div className="App-card-title-in-icon">
            <Skeleton className="!block" height={20} width={20} circle inline />
          </div>
          <div>
            <div className="text-body-medium flex items-center">
              <Skeleton width={80} height={16} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">
            <Skeleton width={40} height={12} />
          </div>
          <div className="text-sm">
            <Skeleton width={60} height={12} />
          </div>
        </div>
      </div>

      <div className="grid gap-10 p-10">
        <div className="flex justify-between">
          <div className="text-sm text-gray-400">
            <Skeleton width={40} height={12} />
          </div>
          <div className="text-right">
            <Skeleton width={80} height={12} />
          </div>
        </div>

        <div className="flex justify-between">
          <div className="text-sm text-gray-400">
            <Skeleton width={60} height={12} />
          </div>
          <div className="text-right">
            <Skeleton width={80} height={12} />
          </div>
        </div>

        <div className="flex justify-between">
          <div className="text-sm text-gray-400">
            <Skeleton width={80} height={12} />
          </div>
          <div className="text-right">
            <Skeleton width={60} height={12} />
          </div>
        </div>

        <div className="flex justify-between">
          <div className="text-sm text-gray-400">
            <Skeleton width={70} height={12} />
          </div>
          <div className="text-right">
            <Skeleton width={40} height={12} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { msg } from '@lingui/macro';
import Tab from '@/components/Common/Tab/Tab';
import { useLocalizedMap } from '@/utils/lib/i18n';
import YourHistoryList from '@/components/Pools/components/YourHistoryList/YourHistoryList';
import ExposureAboutContent, {
  ExposureAboutContentProps,
} from './ExposureAboutContent';

type DetailContentTab = 'About' | 'Your History';

const DETAIL_CONTENT_LABELS = {
  About: msg`About`,
  YourHistory: msg`Your History`,
};

export type ExposureAboutNewProps = ExposureAboutContentProps & {
  poolType: 'GLV' | 'GM';
  poolAddress?: string;
};

/** GMW-344: tabs + About / Your History inside SurfaceBase parent. */
export function ExposureAboutNew({
  poolInfo,
  isPoolReady,
  isMobile,
  marketInfosMap,
  poolType,
  poolAddress,
}: ExposureAboutNewProps) {
  const [detailContentTab, setDetailContentTab] =
    useState<DetailContentTab>('About');
  const detailContentLabels = useLocalizedMap(DETAIL_CONTENT_LABELS);

  useEffect(() => {
    setDetailContentTab('About');
  }, [poolType, poolAddress]);

  return (
    <div className="exposure-parent">
      <div className="exposure-parent-tabs">
        <Tab
          options={['About', 'Your History']}
          optionLabels={{
            About: detailContentLabels.About,
            'Your History': detailContentLabels.YourHistory,
          }}
          option={detailContentTab}
          onChange={(tab: string) => {
            setDetailContentTab(tab as DetailContentTab);
          }}
          type="inline"
          className="detail-tabs exposure-detail-tabs"
        />
      </div>

      {detailContentTab === 'About' ? (
        <ExposureAboutContent
          poolInfo={poolInfo}
          isPoolReady={isPoolReady}
          isMobile={isMobile}
          marketInfosMap={marketInfosMap}
        />
      ) : (
        <YourHistoryList
          poolType={poolType}
          poolTokenAddress={
            poolType === 'GLV'
              ? poolInfo?.glvToken || poolAddress
              : poolInfo?.marketToken || poolAddress
          }
        />
      )}
    </div>
  );
}

export default ExposureAboutNew;

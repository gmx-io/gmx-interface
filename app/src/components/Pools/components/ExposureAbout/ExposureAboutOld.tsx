import ExposureAboutContent, {
  ExposureAboutContentProps,
} from './ExposureAboutContent';

export type ExposureAboutOldProps = ExposureAboutContentProps & {
  poolType?: 'GLV' | 'GM';
  poolAddress?: string;
};

/** Pre-GMW-344: About exposure tables only (upstream/main behavior). */
export function ExposureAboutOld({
  poolInfo,
  isPoolReady,
  isMobile,
  marketInfosMap,
}: ExposureAboutOldProps) {
  return (
    <ExposureAboutContent
      poolInfo={poolInfo}
      isPoolReady={isPoolReady}
      isMobile={isMobile}
      marketInfosMap={marketInfosMap}
    />
  );
}

export default ExposureAboutOld;

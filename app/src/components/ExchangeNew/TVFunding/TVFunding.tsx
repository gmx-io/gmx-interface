import '@/components/ExchangeNew/TVFunding/TVFunding.scss';

import { useCallback, useMemo, useState } from 'react';
import { useMedia, useLocalStorage } from 'react-use';
import { t, Trans } from '@lingui/macro';
import { LoadingDots } from '@/components/Common/Loader/LoadingDots';
import {
  useFundingRateData,
} from '@/hooks/statsHooks/useFundingRateData';
import {
  Area,
  CartesianGrid,
  Label,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BN_ZERO } from '@/config/constants';
import { formatRatePercentage } from '@/utils/legacy/format';
import { BN } from '@coral-xyz/anchor';

export function TVFunding() {
  const { fundingRate, isLoading } = useFundingRateData();
  const [isHidden, setIsHidden] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const isMobile = useMedia('(max-width: 550px)');
  const isSmallScreen = useMedia('(max-width: 900px)');
  const [isShowDefaultInfo, setIsShowDefaultInfo] = useState(true);
  const lastData = fundingRate.length && fundingRate[fundingRate.length - 1];
  const FUNDING_SAVE_LOAD_CHARTS_KEY = "funding-save-load-charts";
  const [fundingCharts, setFundingCharts] = useLocalStorage<string | undefined>(FUNDING_SAVE_LOAD_CHARTS_KEY);
  const [selectedRate, setSelectedRate] = useState<'1' | '8'>(fundingCharts || '1');

  const fundingRateData = useMemo(() => {
    if (!fundingRate.length) return [];
    
    return fundingRate.map((item) => {
      const rate = selectedRate || '1';
      return {
        ...item,
        long: formatRatePercentage(new BN(item.longFundingRate).mul(new BN(Number(rate))), 4, { signed: false, percentages: false }),
        short: formatRatePercentage(new BN(item.shortFundingRate).mul(new BN(Number(rate))), 4, { signed: false, percentages: false }),
      }
    });
  }, [fundingRate, selectedRate]);

  const CustomTick = (props) => {
    const { x = 0, y = 0, payload = {} } = props || {};
    return (
      <g transform={`translate(${x+10},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="start"
          fill="#A3A3A3"
          fontSize={12}
          width={200}
        >
          {Number(payload?.value).toFixed(5)}%
        </text>
      </g>
    );
  };

  const handleMouseMove = useCallback(() => {
    setIsShowDefaultInfo(false)
  }, []);
  
  const handleMouseleave = useCallback(() => {
    setIsShowDefaultInfo(true)
  }, []);

  const handleRateSelect = useCallback((rateType: '1' | '8') => {
    setSelectedRate(rateType);
    setFundingCharts(rateType)
  }, []);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (!active || !payload?.length) return null;
    const title = payload[0]?.payload?.timeformatted || '';
    
    return (
      <div className='custom-tooltip'>
        <div className='title'>Historical 1h Funding Rate</div>
        {payload.map((p: any, i: number) => {
          const isLong = p.name === 'long';
          return (
            <div key={i} className='item'>
              {
                isLong ? <>
                  <Trans>Long</Trans>：
                  <p
                    className={
                      lastData?.longFundingRate &&
                      lastData.longFundingRate.gt(BN_ZERO)
                      ? 'positive'
                      : 'negative'
                    }
                  >{p.value}%</p>
                </> : <>
                  <Trans>Short</Trans>：
                  <p
                    className={
                      lastData?.shortFundingRate &&
                      lastData.shortFundingRate.gt(BN_ZERO)
                      ? 'positive'
                      : 'negative'
                    }
                  >{p.value}%</p>
                </>
              }
            </div>
          )
        })}
        <div className='item time'>
          <Trans>Time</Trans>：
          <p>{title}</p></div>
      </div>
    );
  };

  return (
    <div className='ExchangeFunding'>
      <div
        className={`ExchangeFunding-content-area ${isHidden ? 'hidden' : ''}`}
      >
        {
          (isLoading && !fundingRate.length) ? (
            <LoadingDots size={20} />
          ) : (
            <div className='chart-container' style={{ height: '100%', width: '100%' }}>
              <div className='chart-top-box'>
                <div className='common left'>
                  <p className={selectedRate === '1' ? 'select' : ''} onClick={() => handleRateSelect('1')}><Trans>1h Rate</Trans></p>
                  <p className={selectedRate === '8' ? 'select' : ''} onClick={() => handleRateSelect('8')}><Trans>8h Rate</Trans></p>
                </div>
                <div className='common right'>
                  <em><Trans>Long</Trans></em>
                  <em><Trans>Short</Trans></em>
                </div>
              </div>
              <div className={`chart-suspend-box ${isShowDefaultInfo ? '' : 'hidden'}`}>
                <p className='title'><Trans>Current Funding Rate</Trans></p>
                <div className='info'>
                  <p className='label'>
                    <em><Trans>Long</Trans></em>
                    <span
                      className={
                        lastData?.longFundingRate &&
                        lastData.longFundingRate.gt(BN_ZERO)
                        ? 'positive'
                        : 'negative'
                      }
                    >{formatRatePercentage(lastData.longFundingRate)}</span>
                  </p>
                  <p className='label'>
                    <em><Trans>Short</Trans></em>
                    <span
                      className={
                        lastData?.shortFundingRate &&
                        lastData.shortFundingRate.gt(BN_ZERO)
                        ? 'positive'
                        : 'negative'
                      }
                    >{formatRatePercentage(lastData.shortFundingRate)}</span>
                  </p>
                </div>
              </div>
              <div className='chart-content-box'>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    style={{ backgroundColor: '#181818' }}
                    data={fundingRateData}
                    margin={{
                      top: 0,
                      right: 20,
                      left: 0,
                      bottom: 0,
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseleave}
                  >
                    <CartesianGrid
                      strokeDasharray='2 2'
                      fill='#181818'
                      stroke='#535353'
                    />
                    <XAxis
                      dataKey='timehhmm'
                      padding={{ left: 5, right: 0 }}
                      tickLine={false}
                      axisLine={{
                        stroke: '#535353',
                        strokeWidth: 2,
                      }}
                      tick={{
                        fill: '#ffffff',
                        fontSize: 12,
                        fontFamily: 'Arial',
                        fontWeight: '500'
                      }}
                    />
                    <YAxis
                      orientation='right'
                      tickCount={17}
                      tickLine={false}
                      axisLine={false}
                      padding={{ top: 40, bottom: 40 }}
                      tick={<CustomTick />}
                    />
                    <Tooltip
                      cursor={{
                        stroke: '#323232',
                        strokeWidth: 1,
                        strokeDasharray: '3 3'
                      }}
                      content={<CustomTooltip />}
                    />
                    <Line
                      type='monotone'
                      dataKey='long'
                      stroke='#FFE4D6'
                      dot={false}
                      strokeWidth={2}
                      activeDot={{
                        r: 4,
                        fill: '#181818',
                        stroke: '#FFE4D6',
                        strokeWidth: 2
                      }}
                    />
                    <Line
                      type='monotone'
                      dataKey='short'
                      stroke='#FA7B4E'
                      dot={false}
                      strokeWidth={2}
                      activeDot={{
                        r: 4,
                        fill: '#181818',
                        stroke: '#FA7B4E',
                        strokeWidth: 2
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}

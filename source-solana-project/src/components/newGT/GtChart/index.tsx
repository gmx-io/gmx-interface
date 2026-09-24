import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    TooltipProps,
    Tooltip,
} from 'recharts';
import { ChartMountGuard } from '@/components/Common/Chart/ChartMountGuard';
import './gtChart.scss';
import { useGtPriceHistory } from '@/hooks/gtHooks/useGtPriceHistory';
import LoadingComponent from '@/utils/LoadingComponent';
import { Trans, t } from '@lingui/macro';
import { useMedia } from 'react-use';

type ChartDataPoint = {
    date?: string;
    totalMinted?: number | string;
    mintingCost?: number | string;
};

function CustomTooltip({
    active,
    payload,
    label,
}: TooltipProps<number | string, string>) {
    const isVisible = Boolean(active && payload?.length);
    const newPayload = (payload?.[0]?.payload as ChartDataPoint | undefined) ?? {};

    return (
        <div
            className="recharts-default-tooltip rounded-6 bg-[#1f1f1f] p-[1rem] racharts-tooltip-style"
            style={{ visibility: isVisible ? 'visible' : 'hidden' }}
        >
            <p className="recharts-tooltip-label leading-[2rem] !text-white font-[400] !text-[1.2rem]">
                {label}
            </p>
            <ul className="recharts-tooltip-item-list">
                <li
                    className="recharts-tooltip-item flex leading-[2rem]"
                    style={{ color: '#FA7B4E' }}
                >
                    <span className="w-[130px] text-left !text-[1.2rem] !font-[500]">
                        <Trans>Total Minted</Trans>:
                    </span>
                    <span className="!text-[1.2rem] !font-[400] tool-value">
                        {newPayload.totalMinted ?? '-'}M
                    </span>
                </li>
                <li
                    className="recharts-tooltip-item mt-2 flex leading-[2rem]"
                    style={{ color: '#FFE4D6' }}
                >
                    <span className="w-[130px] text-left !text-[1.2rem] !font-[500]">
                        <Trans>Minting Price</Trans>:
                    </span>
                    <span className="!text-[1.2rem] !font-[400] tool-value">
                        ${newPayload.mintingCost ?? '-'}
                    </span>
                </li>
            </ul>
        </div>
    );
}

function GtChartCard({ yValue }: { yValue: string }) {
    const [selectedRange, setSelectedRange] = React.useState<30 | 90 | 180 | 0>(
        0
    );
    const isMobile = useMedia('(max-width: 768px)');
    const { priceHistory, isLoading } = useGtPriceHistory(selectedRange);
    const chartData = priceHistory || [];
    return (
        <div className="gt-chart-section">
            <div className="chart-header" style={{ paddingLeft: !isMobile ? '0rem' : '2rem' }}>
                <h2><Trans>GT Chart</Trans></h2>
                {!isMobile && <div className="time-filters">
                    <span
                        className={`${selectedRange == 30 ? 'filter-active' : 'filter-inactive'}`}
                        onClick={() => setSelectedRange(30)}
                    >
                        30d
                    </span>
                    <span
                        className={`${selectedRange == 90 ? 'filter-active' : 'filter-inactive'}`}
                        onClick={() => setSelectedRange(90)}
                    >
                        90d
                    </span>
                    <span
                        className={`${selectedRange == 180 ? 'filter-active' : 'filter-inactive'}`}
                        onClick={() => setSelectedRange(180)}
                    >
                        180d
                    </span>
                    <span
                        className={`${selectedRange == 0 ? 'filter-active' : 'filter-inactive'}`}
                        onClick={() => setSelectedRange(0)}
                    >
                        Total
                    </span>
                </div>}
            </div>

            <div className={`chart-container ${isMobile ? 'min-h-[21.8rem]' : 'min-h-[34.8rem]'} `}>
                {isLoading ? (
                    <LoadingComponent />
                ) : (
                    <ChartMountGuard>
                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <LineChart
                                key={selectedRange}
                                data={chartData}
                                margin={
                                    isMobile
                                        ? {
                                            top: 5,
                                            right: 0,
                                            left: -5,
                                            bottom: 0,
                                        }
                                        : undefined
                                }
                            >
                                <CartesianGrid
                                    strokeDasharray="3"
                                    horizontal={true}
                                    vertical={false}
                                    stroke="#535353"
                                />
                                <XAxis
                                    dataKey="date"
                                    stroke="#A3A3A3"
                                    fontSize={12}
                                    tickLine={false}
                                    minTickGap={30}
                                    tickFormatter={(value: string | number) => {
                                        const date = new Date(value);
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#A3A3A3"
                                    tick={{ fontSize: 12 }}
                                    orientation="left"
                                    tickLine={false}
                                    axisLine={false}
                                    label={{
                                        value: `TOTAL MINTED(m)`,
                                        fill: '#fff',
                                        position: 'insideRight',
                                        angle: -90,
                                        fontSize: isMobile ? 8 : 11,
                                        dy: -54,
                                        dx: isMobile ? -30 : -55,
                                    }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#A3A3A3"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    label={{
                                        value: yValue,
                                        fill: '#fff',
                                        dy: yValue == 'MINTING PRICE' ? -40 : isMobile ? -58 : -60,
                                        angle: 270,
                                        dx: isMobile ? -10 : 5,
                                        fontSize: isMobile ? 8 : 11,
                                        position: 'insideRight',
                                    }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="totalMinted"
                                    stroke="#FA7B4E"
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    name={t`Total Minted`}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="mintingCost"
                                    stroke="#FFE4D6"
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    name={t`Minting Price`}
                                />
                                {/* <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="buybackPrice"
                                stroke="#FFFFFF"
                                strokeWidth={1}
                                dot={false}
                                isAnimationActive={false}
                                name={t`Buyback Price`}
                            /> */}
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartMountGuard>
                )}
            </div>
            {isMobile && <div className="time-filters-mobile">
                <span
                    className={`${selectedRange == 0 ? 'filter-active' : 'filter-inactive'}`}
                    onClick={() => setSelectedRange(0)}
                >
                    Total
                </span>
                <span
                    className={`${selectedRange == 180 ? 'filter-active' : 'filter-inactive'}`}
                    onClick={() => setSelectedRange(180)}
                >
                    180d
                </span>
                <span
                    className={`${selectedRange == 90 ? 'filter-active' : 'filter-inactive'}`}
                    onClick={() => setSelectedRange(90)}
                >
                    90d
                </span>
                <span
                    className={`${selectedRange == 30 ? 'filter-active' : 'filter-inactive'}`}
                    onClick={() => setSelectedRange(30)}
                >
                    30d
                </span>
            </div>}
            {/* {
                isMobile ? null : (
                    <div className="chart-legend">
                        <div className="legend-item">
                            <div className="legend-dot purple"></div>
                            <span><Trans>Total Minted</Trans></span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-dot bg-[#FFE4D6]"></div>
                            <span><Trans>Minting Price</Trans></span>
                        </div>
                    </div>
                )
            } */}
        </div>
    );
}

const GtChart = React.memo(GtChartCard);
GtChart.displayName = 'GtChart';

export default GtChart;

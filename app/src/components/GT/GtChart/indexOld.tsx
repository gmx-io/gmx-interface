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
function GtPriceCard({ yValue }: { yValue: string }) {
    const [selectedRange, setSelectedRange] = React.useState<30 | 90 | 180 | 0>(
        0
    );
    const isMobile = useMedia('(max-width: 768px)');
    const { priceHistory, isLoading } = useGtPriceHistory(selectedRange);
    const chartData = priceHistory || [];
    const CustomTooltip: React.FC<TooltipProps<any, any>> = ({
        active,
        payload,
        label,
    }) => {
        const isVisible = active && payload && payload.length;
        const newPayload = payload?.[0]?.payload || {};

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
                            {newPayload.totalMinted}
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
                            ${newPayload.mintingCost}
                        </span>
                    </li>
                    {/* <li
                        className="recharts-tooltip-item mt-2 flex leading-[2rem]"
                        style={{ color: '#A3A3A3' }}
                    >
                        <span className="w-[130px] text-left !text-[1.2rem] !font-[500]">
                            <Trans>Buyback Price</Trans>:
                        </span>
                        <span className="!text-[1.2rem] !font-[400] tool-value">
                            ${newPayload.buybackPrice}
                        </span>
                    </li> */}
                    {/* <li
                        className="recharts-tooltip-item mt-2 flex leading-[2rem]"
                        style={{ color: '#A3A3A3' }}
                    >
                        <span className="w-[130px] text-left !text-[1.2rem] !font-[500]">
                            <Trans>Buyback Amount</Trans>:
                        </span>
                        <span className="!text-[1.2rem] !font-[400] tool-value">
                            {newPayload.buybackAmount}
                        </span>
                    </li>
                    <li
                        className="recharts-tooltip-item mt-2 flex leading-[2rem]"
                        style={{ color: '#A3A3A3' }}
                    >
                        <span className="w-[130px] text-left !text-[1.2rem] !font-[500]">
                            <Trans>Buyback Value</Trans>:
                        </span>
                        <span className="!text-[1.2rem] !font-[400] tool-value">
                            ${newPayload.buybackValue}
                        </span>
                    </li> */}
                </ul>
            </div>
        );
    };

    return (
        < div className="gt-chart-section" >
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

            <div className="chart-container min-h-[34.8rem]">
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
                                isAnimationActive={false}
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
                                // textAnchor="end"
                                minTickGap={30}
                                // interval="preserveStartEnd"
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#A3A3A3"
                                tick={{ fontSize: 12 }}
                                // fontSize={isMobile ? 8 : 11}
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
                                    dx: -30,
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
                                    dx: -10,
                                    fontSize: isMobile ? 8 : 11,
                                    position: 'insideRight',
                                }}
                            // domain={[0, 0.2]}
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



        </div >)
}
export default React.memo(GtPriceCard);

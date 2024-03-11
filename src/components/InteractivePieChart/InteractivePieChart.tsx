import hexToRgba from "hex-to-rgba";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

type Props = {
  data: {
    name: string;
    value: number;
    symbol: string;
    color: string;
  }[];
};

export default function InteractivePieChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const cellStyles = useMemo(
    () =>
      data.map((entry, index) => ({
        filter: activeIndex === index ? `drop-shadow(0px 0px 6px ${hexToRgba(entry.color, 0.7)})` : "none",
        cursor: "pointer",
      })),
    [activeIndex, data]
  );

  const onChartEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onChartLeave = () => {
    setActiveIndex(null);
  };
  return (
    <div className="stats-piechart" onMouseOut={onChartLeave}>
      {data.length > 0 && (
        <PieChart width={210} height={210}>
          <Pie
            data={data}
            cx={100}
            cy={100}
            innerRadius={73}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            onMouseEnter={onChartEnter}
            onMouseOut={onChartLeave}
            onMouseLeave={onChartLeave}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                style={cellStyles[index]}
                stroke={entry.color}
                strokeWidth={1}
              />
            ))}
          </Pie>
          <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
            GM Pools
          </text>
          <Tooltip content={(props) => <CustomTooltip active={props.active} payload={props.payload} />} />
        </PieChart>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  const customTooltipStyle = useMemo(
    () => (payload && payload.length ? { backgroundColor: payload[0].color } : undefined),
    [payload]
  );

  if (active && payload && payload.length) {
    return (
      <div className="stats-label">
        <div className="stats-label-color" style={customTooltipStyle}></div>
        {payload[0].value}% {payload[0].name}
      </div>
    );
  }

  return null;
}

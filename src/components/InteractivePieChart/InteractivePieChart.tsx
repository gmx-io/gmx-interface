import hexToRgba from "hex-to-rgba";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

type Props = {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  label: string;
};

export default function InteractivePieChart({ data, label }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const sortedData = useMemo(() => data.filter(Boolean).sort((a, b) => b.value - a.value), [data]);

  const cellStyles = useMemo(
    () =>
      sortedData.map((entry, index) => {
        return {
          filter: activeIndex === index ? `drop-shadow(0px 0px 6px ${hexToRgba(entry.color, 0.7)})` : "none",
          cursor: "pointer",
        };
      }),
    [activeIndex, sortedData]
  );

  const onChartEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onChartLeave = () => {
    setActiveIndex(null);
  };
  return (
    <div className="stats-piechart" onMouseOut={onChartLeave}>
      {sortedData.length > 0 && (
        <PieChart width={210} height={210}>
          <Pie
            data={sortedData}
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
            {sortedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                style={cellStyles[index]}
                fill={entry.color}
                stroke={entry.color}
                color={entry.color}
                strokeWidth={1}
              />
            ))}
          </Pie>
          <text x={"50%"} y={"50%"} fill="white" textAnchor="middle" dominantBaseline="middle">
            {label}
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

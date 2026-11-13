import type { ReactNode } from "react";

/* Chart-type icons. The app icon set has no bar / stacked / area / % share / table icons yet, so they live here for now. */
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const STATS_ICONS = {
  bar: () => (
    <Svg>
      <path d="M2 14h12" />
      <rect x="3" y="8" width="2.4" height="6" rx=".5" />
      <rect x="6.8" y="4" width="2.4" height="10" rx=".5" />
      <rect x="10.6" y="6.5" width="2.4" height="7.5" rx=".5" />
    </Svg>
  ),
  stackedBar: () => (
    <Svg>
      <path d="M2 14h12" />
      <rect x="3" y="7" width="2.4" height="7" rx=".5" />
      <rect x="6.8" y="3.5" width="2.4" height="10.5" rx=".5" />
      <rect x="10.6" y="6" width="2.4" height="8" rx=".5" />
      <path d="M3 11h2.4M6.8 9h2.4M10.6 10.5h2.4" />
    </Svg>
  ),
  line: () => (
    <Svg>
      <path d="M2 14h12" />
      <path d="M2.5 11l3.5-4 3 2.5 4.5-5.5" />
    </Svg>
  ),
  area: () => (
    <Svg>
      <path d="M2.5 13.5V11l3.5-4 3 2.5 4.5-5.5v9.5z" fill="currentColor" fillOpacity=".4" stroke="none" />
      <path d="M2.5 11l3.5-4 3 2.5 4.5-5.5" />
      <path d="M2 14h12" />
    </Svg>
  ),
  pct: () => (
    <Svg>
      <rect x="2.5" y="2.5" width="3" height="11" rx=".5" />
      <rect x="6.5" y="2.5" width="3" height="11" rx=".5" />
      <rect x="10.5" y="2.5" width="3" height="11" rx=".5" />
      <path d="M2.5 9h3M6.5 6.5h3M10.5 8h3" />
    </Svg>
  ),
  cum: () => (
    <Svg>
      <path d="M2 12.5l4-4 3 3 5-5.5" />
      <path d="M10.5 6h3.5v3.5" />
    </Svg>
  ),
  barCum: () => (
    <Svg>
      <path d="M2 14h12" />
      <rect x="3" y="10" width="2.2" height="4" rx=".4" />
      <rect x="6.9" y="9" width="2.2" height="5" rx=".4" />
      <rect x="10.8" y="10.5" width="2.2" height="3.5" rx=".4" />
      <path d="M2.5 8l4-2.5 3 .5 4-3.5" />
    </Svg>
  ),
  flowTotal: () => (
    <Svg>
      <path d="M2 10h12" />
      <rect x="3" y="7" width="2.2" height="3" rx=".4" />
      <rect x="6.9" y="10" width="2.2" height="3" rx=".4" />
      <rect x="10.8" y="6" width="2.2" height="4" rx=".4" />
      <path d="M2.5 4.5l4-1.5 3 1 4-1.5" />
    </Svg>
  ),
  table: () => (
    <Svg>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M2 6.5h12M2 9.8h12M6.2 3v10" />
    </Svg>
  ),
  treemap: () => (
    <Svg>
      <rect x="2" y="2.5" width="12" height="11" rx="1.2" />
      <path d="M8 2.5v11M8 7.5h6M2 9.5h6" />
    </Svg>
  ),
};

export type StatsIconName = keyof typeof STATS_ICONS;

import { useId } from "react";

// Icon added as react component to avoid id duplication which creates bugs
export function IcMultiplier(props: React.SVGProps<SVGSVGElement>) {
  const uid = useId();

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none" {...props}>
      <mask id={`${uid}-m1`} fill="white">
        <rect x="10" y="1.246" width="5.501" height="5.501" rx="1" />
      </mask>
      <rect
        x="10"
        y="1.246"
        width="5.501"
        height="5.501"
        rx="1"
        transform="rotate(45 10 1.246)"
        stroke="currentColor"
        strokeWidth="2.6"
        mask={`url(#${uid}-m1)`}
      />
      <mask id={`${uid}-m2`} fill="white">
        <rect x="14.862" y="6.108" width="5.501" height="5.501" rx="1" />
      </mask>
      <rect
        x="14.862"
        y="6.108"
        width="5.501"
        height="5.501"
        rx="1"
        transform="rotate(45 14.862 6.108)"
        stroke="currentColor"
        strokeWidth="2.6"
        mask={`url(#${uid}-m2)`}
      />
      <mask id={`${uid}-m3`} fill="white">
        <rect x="10" y="10.971" width="5.501" height="5.501" rx="1" />
      </mask>
      <rect
        x="10"
        y="10.971"
        width="5.501"
        height="5.501"
        rx="1"
        transform="rotate(45 10 10.971)"
        stroke="currentColor"
        strokeWidth="2.6"
        mask={`url(#${uid}-m3)`}
      />
      <mask id={`${uid}-m4`} fill="white">
        <rect x="5.138" y="6.108" width="5.501" height="5.501" rx="1" />
      </mask>
      <rect
        x="5.138"
        y="6.108"
        width="5.501"
        height="5.501"
        rx="1"
        transform="rotate(45 5.138 6.108)"
        stroke="currentColor"
        strokeWidth="2.6"
        mask={`url(#${uid}-m4)`}
      />
    </svg>
  );
}

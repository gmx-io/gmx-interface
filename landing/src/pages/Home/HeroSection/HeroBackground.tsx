const heroGlowStyle = {
  background: `
    radial-gradient(ellipse 35% 50% at 72% 58%, rgba(63, 38, 196, 0.75), rgba(31, 20, 104, 0.48) 48%, rgba(9, 10, 20, 0) 78%),
    radial-gradient(ellipse 24% 34% at 61% 44%, rgba(83, 49, 244, 0.3), rgba(9, 10, 20, 0) 72%)
  `,
};

export function HeroBackground() {
  return (
    <div
      style={heroGlowStyle}
      className="pointer-events-none absolute inset-y-0 -right-[620px] w-[1547px] sm:left-83"
    />
  );
}

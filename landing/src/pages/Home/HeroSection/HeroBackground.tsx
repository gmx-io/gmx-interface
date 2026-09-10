const heroGlowStyle = {
  background: `
    radial-gradient(ellipse 42% 72% at 72% 45%, rgba(63, 38, 196, 0.75), rgba(31, 20, 104, 0.48) 48%, rgba(9, 10, 20, 0) 78%),
    radial-gradient(ellipse 24% 42% at 61% 30%, rgba(83, 49, 244, 0.3), rgba(9, 10, 20, 0) 72%)
  `,
};

export function HeroBackground() {
  return (
    <div
      style={heroGlowStyle}
      className="pointer-events-none absolute -right-[620px] h-[724px] w-[1547px] sm:-bottom-42 sm:left-83"
    />
  );
}

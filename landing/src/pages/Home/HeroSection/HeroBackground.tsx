import heroBg from "img/bg_hero_blurred.png";

export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute -right-[620px] h-[724px] w-[1547px] sm:-bottom-42 sm:left-83">
      {/* Pre-rendered blur with 720px padding preserves the fade without Safari's costly live filters. */}
      <img
        src={heroBg}
        alt=""
        width={2988}
        height={2164}
        className="absolute -left-[720px] -top-[720px] h-[2164px] w-[2988px] max-w-none"
      />
    </div>
  );
}

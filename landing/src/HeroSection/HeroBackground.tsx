import heroBg from "img/bg_hero_3d.png";

const styleFirstImage = {
  background: `linear-gradient(233deg, rgba(9, 10, 20, 0.00) 1.13%, #090A14 82.68%), url(${heroBg}) #090A1400 -1876.468px -923.827px / 423.762% 461.839%`,
};
const styleSecondImage = {
  background: `linear-gradient(233deg, rgba(9, 10, 20, 0.00) 1.13%, #090A14 82.68%), url(${heroBg}) #090A1400 -2378.856px -1078.792px / 423.762% 461.839%`,
};
export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute -right-[620px] h-[724px] w-[1547px] sm:-bottom-42 sm:left-83">
      <div
        style={styleFirstImage}
        className="absolute right-[419px] top-62 h-[620px] w-[1128px] opacity-80 blur-[180px]"
      />
      <div style={styleSecondImage} className="absolute left-[117px] h-[724px] w-[1430px] blur-[46px]" />
    </div>
  );
}

import bgImage from "img/bg_hero_3d.png";

const firstBgStyle = {
  background: `linear-gradient(233deg, rgba(9, 10, 20, 0.00) 1.13%, #090A14 82.68%), url(${bgImage}) #090A1400 -1548.752px -703.301px / 423.762% 461.839% no-repeat`,
};
const secondBgStyle = {
  background: `linear-gradient(233deg, rgba(9, 10, 20, 0.00) 1.13%, #090A14 82.68%), url(${bgImage}) #090A1400 -1221.035px -601.978px / 423.762% 461.839% no-repeat`,
};

export function SocialBackground() {
  return (
    <>
      <div
        className="absolute -right-6 bottom-0 hidden h-[472px] w-[931px] opacity-70 blur-[46px] sm:block"
        style={firstBgStyle}
      />
      <div
        className="absolute bottom-0 right-[267px] hidden h-[404px] w-[734px] opacity-80 blur-[180px] sm:block"
        style={secondBgStyle}
      />
    </>
  );
}

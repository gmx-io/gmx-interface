import heroBg from "img/bg_hero_3d.png";

const styleFirstImage = {
  background: `linear-gradient(233deg, rgba(9, 10, 20, 0.00) 1.13%, #090A14 82.68%), url(${heroBg}) #090A1400 -1548.752px -703.301px / 423.762% 461.839% no-repeat`,
};

export function ProtectionBackground() {
  return (
    <div
      style={styleFirstImage}
      className="pointer-events-none absolute -left-[403px] -top-[100px] h-[472px] w-[931px] -scale-y-100 opacity-60 blur-[46px]"
    />
  );
}

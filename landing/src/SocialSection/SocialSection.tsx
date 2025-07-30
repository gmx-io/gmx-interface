import { SocialSlider } from "./SocialSlider";

export function SocialSection() {
  return (
    <section className="bg-fiord-700 border-fiord-500 flex w-full border-t-0 pb-[120px] pt-0 text-white sm:border-t-[0.5px] sm:pt-[120px]">
      <div className="mx-auto flex flex-col gap-28 overflow-x-clip sm:gap-44">
        <SocialSlider />
      </div>
    </section>
  );
}

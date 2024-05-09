import { entries } from "lodash";

const colors = {
  blue: {
    200: "#b4bcff",
    300: "#7885ff",
    400: "#4d5ffa",
    500: "#3d51ff",
    600: "#2d42fc",
    700: "#2e3dcd",
  },
  "cold-blue": {
    500: "#3a3f79",
    700: "#3a3f798f",
    990: "#0e0f1f",
  },

  slate: {
    100: "#a0a3c4",
    600: "#3e4361",
    700: "#23263b",
    800: "#16182e",
    900: "#101124",
    950: "#08091b",
  },
  gray: {
    50: "#eeeeee",
    400: "#a9a9b0",
    DEFAULT: "#b8b8bd",
  },
  "transparent-white": {
    100: "rgba(255, 255, 255, 0.9)",
    200: "rgba(255, 255, 255, 0.8)",
    300: "rgba(255, 255, 255, 0.7)",
    400: "rgba(255, 255, 255, 0.6)",
    500: "rgba(255, 255, 255, 0.5)",
    600: "rgba(255, 255, 255, 0.4)",
    700: "rgba(255, 255, 255, 0.3)",
    800: "rgba(255, 255, 255, 0.2)",
    900: "rgba(255, 255, 255, 0.1)",
    950: "rgba(255, 255, 255, 0.05)",
  },
  "transparent-gray": {
    from: "rgba(180, 187, 255, 0.1)",
    from2: "rgba(30, 34, 61, 0.9)",
    to2: "rgba(38, 43, 71, 0.9)",
  },
  yellow: {
    500: "#f3b50c",
    DEFAULT: "#f3b50c",
  },
  red: {
    400: "#ff687e",
    800: "rgba(231, 78, 93, 0.15)",
    DEFAULT: "#fa3c58",
  },
  pink: {
    500: "#e74e5d",
  },
  emerald: {
    400: "#5ec989",
  },
  green: {
    300: "#56dba8",
    DEFAULT: "#0ecc83",
    800: "rgba(94, 201, 137, 0.15)",
  },
  white: "#ffffff",
  black: "#000000",
};

console.log(
  entries(colors).flatMap(([color, shades]) => {
    if (typeof shades === "string") return `bg-${color}`;

    return entries(shades).map(([shade, value]) => {
      if (shade === "DEFAULT") return `bg-${color}`;
      return `bg-${color}-${shade}`;
    });
  })
);

const hack = [
  "bg-blue-200",
  "bg-blue-300",
  "bg-blue-400",
  "bg-blue-500",
  "bg-blue-600",
  "bg-blue-700",
  "bg-cold-blue-500",
  "bg-cold-blue-700",
  "bg-cold-blue-990",
  "bg-slate-100",
  "bg-slate-600",
  "bg-slate-700",
  "bg-slate-800",
  "bg-slate-900",
  "bg-slate-950",
  "bg-gray-50",
  "bg-gray-400",
  "bg-gray",
  "bg-transparent-white-100",
  "bg-transparent-white-200",
  "bg-transparent-white-300",
  "bg-transparent-white-400",
  "bg-transparent-white-500",
  "bg-transparent-white-600",
  "bg-transparent-white-700",
  "bg-transparent-white-800",
  "bg-transparent-white-900",
  "bg-transparent-white-950",
  "bg-transparent-gray-from",
  "bg-transparent-gray-from2",
  "bg-transparent-gray-to2",
  "bg-yellow-500",
  "bg-yellow",
  "bg-red-400",
  "bg-red-800",
  "bg-red",
  "bg-pink-500",
  "bg-emerald-400",
  "bg-green-300",
  "bg-green-800",
  "bg-green",
  "bg-white",
  "bg-black",
];

export default function UiPage() {
  return (
    <main className="mx-auto max-w-prose p-20">
      <h1 className="text-34 font-bold">UI Page</h1>
      <p>This page demonstrates the use of the UI components in the app.</p>

      <h2 className="mb-16 mt-24 text-24 font-bold">Fill colors</h2>
      <div className="flex flex-col gap-8">
        {entries(colors).map(([color, shades]) => {
          if (typeof shades === "string") {
            return (
              <div key={color}>
                <div>{color}</div>
                <div className="*:size-64 flex w-fit overflow-hidden rounded-4 border">
                  <div className={`bg-${color}`}></div>
                </div>
              </div>
            );
          }

          return (
            <div key={color}>
              {color}
              <div className="*:size-64 flex w-fit overflow-hidden rounded-4 border">
                {entries(shades).map(([shade, value]) => {
                  if (shade === "DEFAULT") return <div key={shade + value} className={`bg-${color}`}></div>;
                  return (
                    <div key={shade + value} className={`bg-${color}-${shade}`}>
                      {shade}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-16 mt-24 text-24 font-bold">Text colors</h2>

      <div className="flex gap-16">
        <p className="text-blue-500">Blue text is blue</p>
        <p className="text-gray">Gray text is gray</p>
        <p className="text-yellow">Yellow text is yellow</p>
        <p className="text-red">Red text is red</p>
        <p className="text-green">Green text is green</p>
        <p className="text-white">White text is white</p>
      </div>
      <p className="mt-8 text-white underline decoration-gray-400 decoration-dashed decoration-8">
        Decoration is gray-400
      </p>

      <h2 className="mb-16 mt-24 text-24 font-bold">Font sizes</h2>
      <div className="flex flex-col gap-16">
        <div className="flex items-baseline gap-8">
          <div>xl</div>
          <p className="text-34">Some very important title</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>lg</div>
          <p className="text-24">Not that important title</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>md</div>
          <p className="text-16">Some important text indeed</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>base</div>
          <p className="text-15">Base text it is. Nothing special</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>sm</div>
          <p className="text-14">Somewhat unimportant text, but still readable</p>
        </div>

        <div className="flex items-baseline gap-8">
          <div>&lt;unset&gt;</div>
          <p>Text with no size set</p>
        </div>
      </div>

      <h2 className="mb-16 mt-24 text-24 font-bold">Line heights</h2>
      <div className="flex flex-col gap-16">
        <p className="leading-1">
          leading-1
          <br />
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Temporibus beatae atque eligendi sunt quasi et porro
          nemo cumque nesciunt dolorum earum, minus fuga similique exercitationem ad. Eos omnis vitae suscipit
          recusandae iste adipisci quasi rem odio, quidem qui modi impedit quibusdam culpa nemo distinctio rerum tempora
          sequi facilis quaerat laudantium pariatur dicta ab. Pariatur mollitia magni consectetur praesentium nulla
          nobis non voluptates laborum obcaecati enim unde, in tempore voluptas, expedita aut corrupti ipsum sequi
          consequatur iste corporis quasi! Officia nihil pariatur, asperiores molestiae quia earum tempora, in neque
          inventore quisquam dolore veniam minus beatae adipisci quod hic? Saepe, aperiam consequuntur!
        </p>
        <p className="leading-base">
          leading-base
          <br />
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Temporibus beatae atque eligendi sunt quasi et porro
          nemo cumque nesciunt dolorum earum, minus fuga similique exercitationem ad. Eos omnis vitae suscipit
          recusandae iste adipisci quasi rem odio, quidem qui modi impedit quibusdam culpa nemo distinctio rerum tempora
          sequi facilis quaerat laudantium pariatur dicta ab. Pariatur mollitia magni consectetur praesentium nulla
          nobis non voluptates laborum obcaecati enim unde, in tempore voluptas, expedita aut corrupti ipsum sequi
          consequatur iste corporis quasi! Officia nihil pariatur, asperiores molestiae quia earum tempora, in neque
          inventore quisquam dolore veniam minus beatae adipisci quod hic? Saepe, aperiam consequuntur!
        </p>
      </div>
    </main>
  );
}

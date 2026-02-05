import camelCase from "lodash/camelCase";
import mapKeys from "lodash/mapKeys";
import upperFirst from "lodash/upperFirst";
import { memo, SVGProps, useState } from "react";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI, getChainName } from "config/chains";
import { colors } from "config/colors";
import { useTheme } from "context/ThemeContext/ThemeContext";
import { ColorTree } from "lib/generateColorConfig";
import { getCategoryTokenAddresses, getToken } from "sdk/configs/tokens";
import { TokenCategory } from "sdk/utils/tokens/types";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import ExchangeInfoRow from "components/EventToast/ExchangeInfoRow";
import SearchInput from "components/SearchInput/SearchInput";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";

const iconsContext = mapKeys(
  import.meta.glob("img/ic_*.svg", {
    query: "?react",
    import: "default",
    eager: true,
  }),
  (_, key) => key.split("/").pop()
);

const icons = Object.keys(iconsContext).map((rawPath) => {
  let name = camelCase(rawPath.match(/ic_(.+)\.svg$/)?.[1]) + "Icon";

  if (/[0-9]/.test(name[0])) {
    name = camelCase("ic " + name);
  }

  let componentName = upperFirst(name);

  return {
    path: rawPath,
    name: name,
    importUrl: `import ${name} from "${rawPath}";`,
    importSvg: `import ${componentName} from "${rawPath}";`,
    component: iconsContext[rawPath],
  };
}) as {
  component: React.ComponentType<SVGProps<SVGSVGElement>>;
  name: string;
  path: string;
  importUrl: string;
  importSvg: string;
}[];
// console.log({ icons });

const otherImagesContext = mapKeys(
  import.meta.glob("img/**/*.{png,jpg,jpeg,gif,svg}", {
    query: "?url",
    import: "default",
    eager: true,
  }),
  (_, key) => key.split("/").pop()
);

const otherImages = Object.keys(otherImagesContext)
  .filter((key) => !/\bic_/.test(key))
  .map((key) => {
    let name = camelCase(key.match(/img\/(.+)\.(png|jpg|jpeg|gif|svg)$/)?.[1]) + "Image";

    if (/[0-9]/.test(name[0])) {
      name = "img" + name;
    }

    return {
      path: key,
      name: name,
      importUrl: `import ${name} from "${key}";`,
      src: otherImagesContext[key],
    };
  }) as { src: string; name: string; path: string; importUrl: string }[];

function isColor(obj: any): obj is { light: string; dark: string } {
  return obj && typeof obj === "object" && "light" in obj && "dark" in obj;
}

function flattenColors(obj: ColorTree, prefix = ""): Array<{ name: string; light: string; dark: string }> {
  const result: Array<{ name: string; light: string; dark: string }> = [];

  Object.entries(obj).forEach(([key, value]) => {
    const name = prefix ? `${prefix}-${key}` : key;

    if (isColor(value)) {
      result.push({ name, light: value.light as string, dark: value.dark as string });
    } else if (value && typeof value === "object") {
      result.push(...flattenColors(value as ColorTree, name));
    }
  });

  return result;
}

export default memo(function UiPage() {
  const { theme } = useTheme();
  return (
    <AppPageLayout>
      <main className="mx-auto max-w-prose p-20">
        <h1 className="text-34 font-medium">UI Page</h1>

        <p>This page demonstrates the use of the UI components in the app.</p>

        <h2 className="mb-16 mt-24 text-24 font-medium">Fill colors</h2>
        <div className="overflow-auto">
          {Object.entries(colors).map(([key, value]) => {
            const colors = isColor(value) ? flattenColors({ [key]: value }) : flattenColors(value, key);

            return (
              <div key={key} className="flex">
                {colors.map((color) => (
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  <div key={color.name} className="h-[100px] basis-full" style={{ backgroundColor: color[theme] }}>
                    <span>{color.name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <h2 className="mb-16 mt-24 text-24 font-medium">Text colors</h2>

        <div className="flex flex-wrap gap-16">
          <p className="text-blue-500">Blue 500</p>
          <p className="text-yellow-300">Yellow 300</p>
          <p className="text-red-500">Red 500</p>
          <p className="text-green-500">Green 500</p>
          <p className="text-typography-primary">Typography Primary</p>
          <p className="text-typography-secondary">Typography Secondary</p>
        </div>
        <p className="mt-8 text-typography-primary underline decoration-gray-400 decoration-dashed decoration-8">
          Decoration is gray-400
        </p>

        <h2 className="mb-16 mt-24 text-24 font-medium">Font sizes</h2>
        <div className="flex flex-col gap-16">
          <div className="flex items-baseline gap-8">
            <div>h1</div>
            <p className="text-h1">H1 Text Size</p>
          </div>
          <div className="flex items-baseline gap-8">
            <div>h2</div>
            <p className="text-h2">H2 Text size</p>
          </div>
          <div className="flex items-baseline gap-8">
            <div>Body Large</div>
            <p className="text-body-large">Some important text indeed</p>
          </div>
          <div className="flex items-baseline gap-8">
            <div>Medium</div>
            <p className="text-body-medium">Base text it is. Nothing special</p>
          </div>
          <div className="flex items-baseline gap-8">
            <div>Small</div>
            <p className="text-body-small">Somewhat unimportant text, but still readable</p>
          </div>
          <div className="flex items-baseline gap-8">
            <div>Caption</div>
            <p className="text-caption">Somewhat unimportant text, but still readable</p>
          </div>

          <div className="flex items-baseline gap-8">
            <div>&lt;unset&gt;</div>
            <p>Text with no size set</p>
          </div>
        </div>

        <h2 className="mb-16 mt-24 text-24 font-medium">Line heights</h2>
        <div className="flex flex-col gap-16">
          <p className="leading-1">
            leading-1
            <br />
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Temporibus beatae atque eligendi sunt quasi et
            porro nemo cumque nesciunt dolorum earum, minus fuga similique exercitationem ad. Eos omnis vitae suscipit
            recusandae iste adipisci quasi rem odio, quidem qui modi impedit quibusdam culpa nemo distinctio rerum
            tempora sequi facilis quaerat laudantium pariatur dicta ab. Pariatur mollitia magni consectetur praesentium
            nulla nobis non voluptates laborum obcaecati enim unde, in tempore voluptas, expedita aut corrupti ipsum
            sequi consequatur iste corporis quasi! Officia nihil pariatur, asperiores molestiae quia earum tempora, in
            neque inventore quisquam dolore veniam minus beatae adipisci quod hic? Saepe, aperiam consequuntur!
          </p>
          <p className="leading-base">
            leading-base
            <br />
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Temporibus beatae atque eligendi sunt quasi et
            porro nemo cumque nesciunt dolorum earum, minus fuga similique exercitationem ad. Eos omnis vitae suscipit
            recusandae iste adipisci quasi rem odio, quidem qui modi impedit quibusdam culpa nemo distinctio rerum
            tempora sequi facilis quaerat laudantium pariatur dicta ab. Pariatur mollitia magni consectetur praesentium
            nulla nobis non voluptates laborum obcaecati enim unde, in tempore voluptas, expedita aut corrupti ipsum
            sequi consequatur iste corporis quasi! Officia nihil pariatur, asperiores molestiae quia earum tempora, in
            neque inventore quisquam dolore veniam minus beatae adipisci quod hic? Saepe, aperiam consequuntur!
          </p>
        </div>

        <h2 className="mb-16 mt-24 text-24 font-medium">Tooltips</h2>

        <Tooltip
          content={
            <>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam enim excepturi veritatis, architecto ab
              qui odio repudiandae vero accusantium dicta, eius similique a aspernatur, maxime iste ipsam facilis.
              Libero, et.
              <br />
              <br />
              <ExchangeInfoRow label="Some label" value="Some value" />
              <StatsTooltipRow label="Some other label" value="100" />
            </>
          }
          handle={"Lorem ipsum dolor."}
          closeDelay={100000000000}
        />

        <h2 className="mb-16 mt-24 text-24 font-medium">Token categories</h2>

        <div className="flex flex-col gap-16">
          {[ARBITRUM, AVALANCHE, AVALANCHE_FUJI].map((chainId) => (
            <div key={chainId}>
              <h3 className="text-h3">{getChainName(chainId)}</h3>
              {["meme", "layer1", "layer2", "defi"].map((category) => (
                <div key={category}>
                  <h3 className="text-h3">{category}</h3>
                  <div className="flex flex-wrap gap-4">
                    {getCategoryTokenAddresses(chainId, category as TokenCategory).map((tokenAddress) => (
                      <div key={tokenAddress}>{getToken(chainId, tokenAddress)?.symbol}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>

      <IconsAndImages />
    </AppPageLayout>
  );
});

function IconsAndImages() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIcons = icons.filter(
    (icon) =>
      icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      icon.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredImages = otherImages.filter(
    (image) =>
      image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="mx-auto max-w-prose p-20">
        <h2 className="mb-16 mt-24 text-24 font-medium">Icons & Images</h2>
      </div>

      <div className="mb-16 px-20">
        <SearchInput
          placeholder="Search icons and images..."
          value={searchTerm}
          setValue={setSearchTerm}
          className="w-full"
          autoFocus={false}
        />
      </div>

      <h3 className="mb-16 px-20 text-20 font-medium">Icons ({filteredIcons.length})</h3>
      <style>{`.ImageTooltip .Tooltip-popup {max-width: unset !important;}`}</style>
      <div className="relative flex flex-wrap items-center gap-16 px-20">
        {filteredIcons.map((icon) => (
          <Tooltip
            key={icon.name}
            variant="none"
            as={"div"}
            className="ImageTooltip"
            closeDelay={500}
            content={
              <div>
                <pre>
                  <code>
                    Name: {icon.name}
                    <br />
                    Path: {icon.path}
                    <br />
                    Import URL: {icon.importUrl}
                    <br />
                    Import SVG: {icon.importSvg}
                  </code>
                </pre>
              </div>
            }
          >
            <div className="max-w-[50px] border-1/2 border-black dark:border-white">
              <icon.component className="h-full w-full" />
            </div>
          </Tooltip>
        ))}
      </div>

      <h3 className="mb-16 mt-24 px-20 text-20 font-medium">Images ({filteredImages.length})</h3>
      <div className="relative flex flex-wrap items-center gap-16 px-20">
        {filteredImages.map((src) => (
          <Tooltip
            key={src.src}
            variant="none"
            as={"div"}
            className="ImageTooltip"
            closeDelay={500}
            content={
              <div>
                <pre>
                  <code>
                    Name: {src.name}
                    <br />
                    Path: {src.path}
                    <br />
                    Import URL: {src.importUrl}
                  </code>
                </pre>
              </div>
            }
          >
            <img className="max-w-[100px]" src={src.src} />
          </Tooltip>
        ))}
      </div>

      <div className="h-50"></div>
    </>
  );
}

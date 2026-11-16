import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// Run `node scripts/render-hero-background.mjs` to bake the original hero's two blurred layers.
const source = await readFile(new URL("../src/img/bg_hero_3d.png", import.meta.url));
const image = `data:image/png;base64,${source.toString("base64")}`;
const browser = await chromium.launch();

try {
  // Half resolution is sufficient for the blur; 720px of padding keeps every edge transparent.
  const page = await browser.newPage({ viewport: { width: 1494, height: 1082 }, deviceScaleFactor: 1 });
  await page.setContent(`
    <style>
      html, body { margin: 0; background: transparent; }
      main {
        width: 2988px;
        height: 2164px;
        transform: scale(.5);
        transform-origin: top left;
      }
      .art { position: absolute; left: 720px; top: 720px; width: 1547px; height: 724px; }
      .layer { position: absolute; }
      .first {
        right: 419px;
        top: 62px;
        width: 1128px;
        height: 620px;
        opacity: .8;
        filter: blur(180px);
        background: linear-gradient(233deg, rgba(9, 10, 20, 0) 1.13%, #090A14 82.68%),
          url('${image}') #090A1400 -1876.468px -923.827px / 423.762% 461.839%;
      }
      .second {
        left: 117px;
        width: 1430px;
        height: 724px;
        filter: blur(46px);
        background: linear-gradient(233deg, rgba(9, 10, 20, 0) 1.13%, #090A14 82.68%),
          url('${image}') #090A1400 -2378.856px -1078.792px / 423.762% 461.839%;
      }
    </style>
    <main><div class="art"><div class="layer first"></div><div class="layer second"></div></div></main>
  `);
  await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
  }, image);
  await page.screenshot({
    path: fileURLToPath(new URL("../src/img/bg_hero_blurred.png", import.meta.url)),
    omitBackground: true,
  });
} finally {
  await browser.close();
}

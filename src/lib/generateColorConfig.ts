type ColorType = "rgba" | "hex";

export type ColorValue<T extends ColorType = ColorType> = T extends "rgba"
  ? {
      light: `rgba(${string})`;
      dark: `rgba(${string})`;
      type?: T;
    }
  : {
      light: `#${string}`;
      dark: `#${string}`;
      type?: T;
    };

export type ColorTree = {
  [key: string]: ColorValue | ColorTree;
};

type FlatColorMap = {
  [key: string]: string;
};

type TailwindColorMap = {
  [key: string]: string | TailwindColorMap;
};

type ColorConfig = {
  darkColors: FlatColorMap;
  lightColors: FlatColorMap;
  tailwindColors: TailwindColorMap;
  cssVariables: {
    dark: FlatColorMap;
    light: FlatColorMap;
  };
};

function isColorValue(value: any): value is ColorValue {
  return value && typeof value === "object" && "light" in value && "dark" in value;
}

function colorToRgb(color: string): string {
  if (color.startsWith("rgba(")) {
    const match = color.match(/rgba?\((\d+),?\s*(\d+),?\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      const alpha = match[4];
      if (alpha && alpha !== "1") {
        return `${match[1]} ${match[2]} ${match[3]} / ${alpha}`;
      }
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
    return color;
  }

  const resultWithOpacity = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (resultWithOpacity) {
    const r = parseInt(resultWithOpacity[1], 16);
    const g = parseInt(resultWithOpacity[2], 16);
    const b = parseInt(resultWithOpacity[3], 16);
    const alpha = parseInt(resultWithOpacity[4], 16) / 255;
    if (alpha < 0.999) {
      return `${r} ${g} ${b} / ${alpha.toFixed(3)}`;
    }
    return `${r} ${g} ${b}`;
  }

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : color;
}

function flattenColorTree(tree: ColorTree, theme: "light" | "dark", prefix = ""): FlatColorMap {
  const flattened: FlatColorMap = {};

  Object.entries(tree).forEach(([key, value]) => {
    const path = prefix ? `${prefix}-${key}` : key;

    if (isColorValue(value)) {
      flattened[path] = value[theme];
    } else {
      Object.assign(flattened, flattenColorTree(value as ColorTree, theme, path));
    }
  });

  return flattened;
}

function buildTailwindColors(tree: ColorTree, prefix = ""): TailwindColorMap {
  const tailwindMap: TailwindColorMap = {};

  Object.entries(tree).forEach(([key, value]) => {
    if (isColorValue(value)) {
      const varName = prefix ? `${prefix}-${key}` : key;
      const hasAlpha =
        value.type === "rgba" ||
        value.dark.includes("rgba") ||
        value.light.includes("rgba") ||
        (value.dark.length === 9 && value.dark.startsWith("#")) ||
        (value.light.length === 9 && value.light.startsWith("#"));

      if (hasAlpha) {
        tailwindMap[key] = `var(--color-${varName})`;
      } else {
        tailwindMap[key] = `rgb(var(--color-${varName}-raw) / <alpha-value>)`;
      }
    } else {
      tailwindMap[key] = buildTailwindColors(value as ColorTree, prefix ? `${prefix}-${key}` : key);
    }
  });

  return tailwindMap;
}

function generateCssVariables(flattened: FlatColorMap): FlatColorMap {
  const variables: FlatColorMap = {};

  Object.entries(flattened).forEach(([key, value]) => {
    const varName = `--color-${key}`;
    const hasAlpha = value.includes("rgba") || (value.length === 9 && value.startsWith("#"));

    if (hasAlpha) {
      variables[varName] = value;
    } else {
      variables[varName] = value;
      variables[`${varName}-raw`] = colorToRgb(value);
    }
  });

  return variables;
}

export function generateColorConfig(colorTree: ColorTree): ColorConfig {
  const darkColors = flattenColorTree(colorTree, "dark");
  const lightColors = flattenColorTree(colorTree, "light");
  const tailwindColors = buildTailwindColors(colorTree);

  const cssVariables = {
    dark: generateCssVariables(darkColors),
    light: generateCssVariables(lightColors),
  };

  return {
    darkColors,
    lightColors,
    tailwindColors,
    cssVariables,
  };
}

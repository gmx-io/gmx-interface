export const colors = {
  blue: {
    100: { light: "#A4C3F9" as const, dark: "#A4C3F9" as const },
    300: { light: "#7885FF" as const, dark: "#7885FF" as const },
    400: { light: "#2D42FC" as const, dark: "#2D42FC" as const },
    500: { light: "#3d51ff" as const, dark: "#3d51ff" as const },
    600: { light: "#2d42fc" as const, dark: "#2d42fc" as const },
    700: { light: "#2e3dcd" as const, dark: "#2e3dcd" as const },
  },
  "cold-blue": {
    500: { light: "#3a3f79" as const, dark: "#3a3f79" as const },
    700: { light: "#282b54" as const, dark: "#282b54" as const },
    900: { light: "#E2E5FD" as const, dark: "#1E223C" as const },
  },
  slate: {
    100: { light: "#696D96" as const, dark: "#a0a3c4" as const },
    400: { light: "#9FA3BC" as const, dark: "#BEC0DA" as const },
    500: { light: "#C4C6D5" as const, dark: "#646a8f" as const },
    600: { light: "#CCCCE0" as const, dark: "#363a59" as const },
    700: { light: "#DADAE7" as const, dark: "#22243a" as const },
    750: { light: "#D4D6E2" as const, dark: "#17182c" as const },
    800: { light: "#EDEDF2" as const, dark: "#1e2033" as const },
    900: { light: "#FCFCFC" as const, dark: "#121421" as const },
    950: { light: "#EEEEF4" as const, dark: "#090A14" as const },
  },
  gray: {
    50: { light: "rgba(0, 0, 0, 0.95)" as const, dark: "rgba(255, 255, 255, 0.95)" as const, type: "rgba" as const },
    100: { light: "#333333" as const, dark: "#e7e7e9" as const },
    200: { light: "#555555" as const, dark: "#cfcfd3" as const },
    300: { light: "#777777" as const, dark: "#b7b8bd" as const },
    400: { light: "#999999" as const, dark: "#9fa0a7" as const },
    500: { light: "#BBBBBB" as const, dark: "#878891" as const },
    600: { light: "#DDDDDD" as const, dark: "#70707c" as const },
    700: { light: "#F0F0F0" as const, dark: "#585866" as const },
    800: { light: "rgba(0, 0, 0, 0.2)" as const, dark: "rgba(255, 255, 255, 0.2)" as const, type: "rgba" as const },
    900: { light: "rgba(0, 0, 0, 0.1)" as const, dark: "rgba(255, 255, 255, 0.1)" as const, type: "rgba" as const },
    950: { light: "rgba(0, 0, 0, 0.05)" as const, dark: "rgba(255, 255, 255, 0.05)" as const, type: "rgba" as const },
  },
  yellow: {
    300: { light: "#FF9400" as const, dark: "#ffe166" as const },
    500: { light: "#f3b50c" as const, dark: "#f3b50c" as const },
    900: { light: "#FFF9D0" as const, dark: "#2E2D29" as const },
  },
  red: {
    100: { light: "#EA2A46" as const, dark: "#F9A4A5" as const },
    400: { light: "#ff637a" as const, dark: "#ff637a" as const },
    500: { light: "#EA2A46" as const, dark: "#FF506A" as const },
    700: { light: "#B33055" as const, dark: "#B33055" as const },
    900: { light: "#F9E2E5" as const, dark: "#2D192D" as const },
  },
  green: {
    100: { light: "#109375" as const, dark: "#A4F9D9" as const },
    300: { light: "#56dba8" as const, dark: "#56dba8" as const },
    400: { light: "#8CF3CB" as const, dark: "#8CF3CB" as const },
    500: { light: "#10937B" as const, dark: "#0FDE8D" as const },
    600: { light: "#1F3445" as const, dark: "#1F3445" as const },
    700: { light: "#0FDE8D" as const, dark: "#0FDE8D" as const },
    800: { light: "#178969" as const, dark: "#178969" as const },
    900: { light: "#DFFFEB" as const, dark: "#192E38" as const },
  },
  white: { light: "#ffffff" as const, dark: "#ffffff" as const },
  black: { light: "#000000" as const, dark: "#000000" as const },
  button: {
    secondary: { light: "#E0E0E8" as const, dark: "#23263b" as const },
    secondaryDisabled: { light: "#E0E0E8" as const, dark: "#1e2033" as const },
  },
  fill: {
    surfaceElevated50: { light: "#EDEDF280" as const, dark: "#1E203380" as const },
    surfaceElevatedHover: { light: "#EFEFEF" as const, dark: "#18192a" as const },
    surfaceHover: { light: "#696D961A" as const, dark: "#A0A3C41A" as const },
  },
  typography: {
    primary: { light: "#000000" as const, dark: "#ffffff" as const },
    secondary: { light: "#696D96" as const, dark: "#a0a3c4" as const },
  },
} as const;

// Type for color values in the config
export type ColorValue = {
  light: string;
  dark: string;
  type?: "rgba";
};

// Type for the color configuration structure
export type ColorConfig = {
  [key: string]: ColorValue | ColorConfig;
};
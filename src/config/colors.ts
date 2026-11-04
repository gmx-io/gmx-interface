import { ColorTree } from "lib/generateColorConfig";

export const colors = {
  blue: {
    700: { light: "#2e3dcd", dark: "#2e3dcd" },
    strong: { light: "#2D42FC", dark: "#7885FF" },
    secondary: { light: "#2D42FC", dark: "#A4C3F9" },
    background: { light: "#E2E5FD", dark: "#1E223C" },
    backgroundOpacity: { light: "#7885FF33", dark: "#7885FF33" },
  },
  "cold-blue": {
    500: { light: "#3a3f79", dark: "#3a3f79" },
  },
  slate: {
    400: { light: "#9FA3BC", dark: "#BEC0DA" },
  },
  yellow: {
    strong: { light: "#FF9400", dark: "#ffe166" },
    background: { light: "#FFF9D0", dark: "#2E2D29" },
    backgroundOpacity: { light: "#FF94001F", dark: "#FFE1661F" },
  },
  red: {
    strong: { light: "#EA2A46", dark: "#FF506A" },
    secondary: { light: "#EA2A46", dark: "#F9A4A5" },
    background: { light: "#F9E2E5", dark: "#2D192D" },
  },
  green: {
    strong: { light: "#109375", dark: "#0FDE8D" },
    secondary: { light: "#109375", dark: "#A4F9D8" },
    background: { light: "#DFEFEB", dark: "#192E38" },
  },
  black: { light: "#000000", dark: "#000000" },
  button: {
    primary: { light: "#2d42fc", dark: "#2d42fc" },
    primaryHover: { light: "#293ce4", dark: "#2a3de5" },
    primaryActive: { light: "#2536cd", dark: "#2536cd" },
    secondary: { light: "#E0E0EB", dark: "#23263b" },
    secondaryHover: { light: "#dadce8", dark: "#282d46" },
    primaryDisabled: { light: "#E0E0EB", dark: "#1E2033" },
    secondaryDisabled: { light: "#E0E0EB", dark: "#1e2033" },
    background: { light: "#DADAE7", dark: "#22243a" },
  },
  fill: {
    background: { light: "#EEEEF4", dark: "#090A14" },
    surfaceBase: { light: "#FCFCFC", dark: "#121421" },
    surfaceBase88: { light: "#FCFCFCE0", dark: "#121421E0" },
    surfaceElevated: { light: "#EDEDF2", dark: "#1E2033" },
    surfaceElevated50: { light: "#EDEDF280", dark: "#1E203380" },
    surfaceHover: { light: "#A0A3C41A", dark: "#A0A3C41A" },
    accent: { light: "#D4D4E2", dark: "#363A59" },
    skeleton: { light: "#696D961F", dark: "#B4BBFF1A" },
  },
  textIcon: {
    primary: { light: "#090A14", dark: "#ffffff" },
    secondary: { light: "#696D96", dark: "#a0a3c4" },
    disabled: { light: "#9FA3BC", dark: "#646a8f" },
    inactive: { light: "#C4C4D5", dark: "#3E4361" },
    onButton: { light: "#ffffff", dark: "#ffffff" },
  },
  stroke: {
    accent: { light: "#090A14", dark: "#FFFFFF" },
    primary: { light: "#CCCCE0", dark: "#363a59" },
  },
  overlay: {
    50: { light: "#090A1480", dark: "#090A1480" },
  },
} satisfies ColorTree;

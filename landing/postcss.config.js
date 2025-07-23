import { resolve } from "path";

export default {
  plugins: {
    tailwindcss: {
      config: resolve(import.meta.dirname, "./tailwind.config.js"),
    },
    autoprefixer: {},
  },
}
console.log(resolve(import.meta.dirname, "./tailwind.config.js"));

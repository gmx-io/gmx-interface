import { resolve } from "path";

export default {
  plugins: {
    tailwindcss: {
      config: resolve(import.meta.dirname, "./tailwind.config.ts"),
    },
    autoprefixer: {},
  },
}

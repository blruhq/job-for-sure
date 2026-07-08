// vite.config.ts
import { defineConfig } from "@tanstack/start/config";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
var vite_config_default = defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] })
    ]
  }
});
export {
  vite_config_default as default
};

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";

export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8765,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [appEnvPlugin(), tailwindcss(), tanstackStart(), viteReact(), nitro()],
});

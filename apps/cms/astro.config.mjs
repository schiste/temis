import { defineConfig, sessionDrivers } from "astro/config";
import { aexeoPlugin } from "@aeptus/aexeo-emdash";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import wasm from "vite-plugin-wasm";
import cloudflareDeployTriggerPlugin from "@temis/emdash-cloudflare-deploy";

const isBuildCommand = process.env.TEMIS_CMS_BUILD === "1";

const database = isBuildCommand
  ? d1({ binding: "DB" })
  : sqlite({ url: "file:./data.db" });

const storage = isBuildCommand
  ? r2({ binding: "MEDIA" })
  : local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" });

const adapter = isBuildCommand
  ? cloudflare({
      imageService: "compile",
      inspectorPort: false,
    })
  : undefined;

const devSession = !isBuildCommand
  ? {
      driver: sessionDrivers.fsLite({ base: "./.astro/session" }),
      cookie: {
        name: "temis-cms-session",
        secure: false,
      },
    }
  : undefined;

export default defineConfig({
  output: "server",
  ...(adapter ? { adapter } : {}),
  ...(devSession ? { session: devSession } : {}),
  vite: {
    plugins: [wasm()],
    optimizeDeps: { exclude: ["@aeptus/aexeo-emdash"] },
  },
  integrations: [
    react(),
    emdash({
      database,
      storage,
      plugins: [
        aexeoPlugin({ collections: ["posts", "pages"] }),
        cloudflareDeployTriggerPlugin({
          deployHookEnvVar: "TEMIS_PAGES_DEPLOY_HOOK_URL",
          debounceSeconds: 30,
        }),
      ],
    }),
  ],
  site: process.env.TEMIS_CMS_SITE_URL ?? "https://temis-cms.workers.dev",
  devToolbar: {
    enabled: false,
  },
});

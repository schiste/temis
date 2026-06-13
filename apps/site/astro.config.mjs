import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.TEMIS_PUBLIC_SITE_URL ?? "https://temis.pages.dev",
  build: {
    assets: "_astro",
  },
  markdown: {
    syntaxHighlight: false,
  },
  devToolbar: {
    enabled: false,
  },
});

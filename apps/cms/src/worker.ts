// Cloudflare Worker entry for the CMS.
//
// Wraps the Astro Cloudflare server handler with a `scheduled()` handler so the
// Cron Trigger in wrangler.jsonc drives EmDash's scheduled publishing, plugin
// cron, and system cleanup — no request side effects. Required since EmDash
// 0.19 removed the request-driven PiggybackScheduler.
//
// Wired into the build via `workerEntryPoint` in astro.config.mjs. We only
// re-export the default handler (not the sandbox `PluginBridge` Durable Object),
// since this deployment does not use sandboxed plugins.
export { default } from "@emdash-cms/cloudflare/worker";

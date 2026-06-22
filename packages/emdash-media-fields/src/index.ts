/**
 * Astro-config registration for the TEMIS media-fields plugin.
 *
 * Mirrors the lightweight descriptor shape EmDash's Astro integration expects:
 * - `entrypoint` resolves to the runtime plugin definition (`definePlugin`).
 * - `adminEntry` resolves to the React admin module whose `fields` export is
 *   wired into the admin field-widget registry (`virtual:emdash/admin-registry`).
 *
 * A schema field opts in by setting `widget: "temis-media-fields:imageWithMeta"`.
 */

export const PLUGIN_ID = "temis-media-fields";
export const PLUGIN_VERSION = "0.1.0";

export interface MediaFieldsPluginOptions {}

export function mediaFieldsPlugin(options: MediaFieldsPluginOptions = {}) {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoint: "@temis/emdash-media-fields/configured",
    adminEntry: "@temis/emdash-media-fields/admin",
    options,
  };
}

export default mediaFieldsPlugin;

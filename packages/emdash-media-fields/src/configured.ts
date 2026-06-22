/**
 * Runtime plugin definition loaded via the `entrypoint` descriptor.
 *
 * The plugin contributes a single field widget, `imageWithMeta`, usable on
 * `json` fields. The widget UI itself is a trusted React component shipped from
 * the `./admin` entry; this definition only declares the widget so the admin
 * and manifest know it exists. There are no hooks or routes — the widget reads
 * media through the admin's authenticated session client-side.
 */

import { definePlugin } from "emdash";
import { PLUGIN_ID, PLUGIN_VERSION } from "./index.js";

export function createPlugin() {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: [],
    admin: {
      fieldWidgets: [
        {
          name: "imageWithMeta",
          label: "Image with metadata",
          fieldTypes: ["json"],
        },
      ],
    },
  });
}

export default createPlugin;

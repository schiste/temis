# TEMIS EmDash Media Fields

EmDash field widget that bundles an image reference with its **alt**,
**caption**, and **license** metadata into a single control, replacing four
separate stacked fields on the content edit form.

## What it provides

- A trusted React field widget, `imageWithMeta`, for `json` fields.
- Selection from the existing media library (browse + pick) with a thumbnail
  preview and the three metadata inputs.

Uploading is intentionally out of scope: editors upload in EmDash's native
**Media** section (which owns the signed-upload pipeline), then select here.

## Usage

```js
// astro.config.mjs
import mediaFieldsPlugin from "@temis/emdash-media-fields";

export default defineConfig({
  integrations: [
    emdash({
      plugins: [mediaFieldsPlugin()],
    }),
  ],
});
```

Then opt a `json` field into the widget in the schema:

```json
{
  "slug": "featured_image",
  "label": "Featured image",
  "type": "json",
  "widget": "temis-media-fields:imageWithMeta"
}
```

## Stored value

```ts
{ storageKey?: string; alt?: string; caption?: string; license?: string }
```

`storageKey` is EmDash's canonical media reference, resolved to a URL via the
configured storage adapter (or the internal `/_emdash/api/media/file/{key}`
proxy). Empty fields are omitted; an empty value is stored as `null`.

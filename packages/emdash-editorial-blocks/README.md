# TEMIS EmDash Editorial Blocks

Reusable EmDash plugin for the custom Portable Text blocks rendered by the
TEMIS design system:

- `statGrid`
- `callout`
- `figure`
- `dataTable`
- `timeline`

The package provides:

- EmDash admin block definitions for the Portable Text editor.
- Canonical block normalization through a `content:beforeSave` hook.
- Pure helpers that can be reused by scripts and tests.

## Usage

```js
import editorialBlocksPlugin from "@temis/emdash-editorial-blocks";

export default defineConfig({
  integrations: [
    emdash({
      plugins: [
        editorialBlocksPlugin({
          collections: ["posts", "pages"],
        }),
      ],
    }),
  ],
});
```

`collections` defaults to `["posts", "pages"]`.

## Data Contract

The plugin keeps custom Portable Text blocks in an editor-friendly shape:

- `statGrid.cards[]`: `value`, `label`, `detail`, `tone`
- `callout`: `title`, `body`, `tone`
- `figure`: `src`, `alt`, `caption`, `credit`, `license`, `sourceUrl`
- `dataTable.columns[]`: `{ label }`
- `dataTable.rows[]`: `{ cell1, cell2, cell3, cell4, cell5, cell6 }`
- `timeline.items[]`: `period`, `title`, `metrics`, `body`, `tone`

Use `normalizeEditorialContent()` in scripts or tests before writing content
directly to EmDash storage.

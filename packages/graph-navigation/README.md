# @temis/graph-navigation

Static-first topic graph navigation plugin for TEMIS.

The package owns:

- V1 graph snapshot types.
- Snapshot normalization.
- Deterministic graph layout.
- Page-focused graph extraction.
- A static Astro renderer with accessible HTML links.

The plugin intentionally does not own EmDash schema setup. EmDash should provide
published topic data; this package turns topic data into a stable navigation
snapshot and renderer input.

## V1 Shape

```ts
import {
  createGraphNavigationSnapshot,
  focusGraphNavigationSnapshot,
  withGraphNavigationLayout,
} from "@temis/graph-navigation";
```

Use `GraphNavigation.astro` when a page needs a rendered graph:

```astro
---
import GraphNavigation from "@temis/graph-navigation/components/GraphNavigation.astro";
import { withGraphNavigationLayout } from "@temis/graph-navigation";

const graph = withGraphNavigationLayout(snapshot);
---

<GraphNavigation graph={graph} />
```

# @temis/graph-navigation

Static-first content graph navigation plugin for TEMIS.

The package owns:

- V1 graph snapshot types.
- Snapshot normalization.
- Deterministic graph layout.
- Page-focused graph extraction.
- A static Astro renderer with accessible HTML links.

The plugin intentionally does not own EmDash schema setup. EmDash should provide
published graph data; this package turns content, initiative, topic, tag,
author, publication, and tool records into a stable navigation snapshot and
renderer input.

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

V1 nodes are typed as `content`, `initiative`, `topic`, `tag`, `author`,
`publication`, `research_paper`, or `tool`. Tool and initiative nodes can be
included in the graph without requiring a top-level public menu item.

## Display Models

The renderer supports three targeted graph modes:

- `overview`: a readable navigation map for initiatives, topics, tags, and
  high-priority tools.
- `content`: the complete published content graph across posts, publications,
  tools, people, initiatives, topics, and tags.
- `focus`: a selected node plus its direct neighbors, used by page sidebars and
  detail exploration.

Nodes can opt into modes through `modes`; otherwise the snapshot normalizer
assigns conservative defaults. Content and people are intentionally omitted
from `overview` by default so the public topic map stays readable as the graph
grows.

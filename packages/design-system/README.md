# @temis/design-system

Astro-first shared design-system package for TEMIS.

The package owns:

- CSS design tokens.
- Base document styles.
- Hard-edged component styles.
- Shared Astro layout and content components.

Principles:

- Public site components are static by default.
- No React dependency for the public component system.
- No rounded corners or circular UI elements.
- Golden-ratio-derived spacing, type, layout, stroke, and graph tokens.
- Theme tokens support system light/dark preferences.

Import components directly from the exported package paths:

```astro
---
import BaseLayout from "@temis/design-system/components/BaseLayout.astro";
---
```

`BaseLayout` imports the shared stylesheet, so public pages should not import a
second global site stylesheet unless there is a documented reason.

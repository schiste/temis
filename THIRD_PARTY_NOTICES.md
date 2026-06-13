# Third-Party Notices

TEMIS source code is dual-licensed under `MIT OR Apache-2.0`. It depends on
open source software. The primary runtime/build dependencies are:

| Package                | Version | License    | Use                                      |
| ---------------------- | ------: | ---------- | ---------------------------------------- |
| Astro                  |   6.4.6 | MIT        | Static site framework and build pipeline |
| EmDash                 |  0.17.2 | MIT        | CMS runtime and content management       |
| @emdash-cms/admin      |  0.17.2 | MIT        | EmDash admin UI                          |
| @emdash-cms/cloudflare |  0.17.2 | MIT        | EmDash Cloudflare D1/R2 adapters         |
| Sharp                  |  0.34.5 | Apache-2.0 | Build-time image optimization            |
| React                  |    19.x | MIT        | EmDash admin integration runtime         |
| Cloudflare Wrangler    |     4.x | Apache-2.0 | Cloudflare deployment tooling            |

This notice is not a complete transitive dependency report. Before public
distribution, release packaging, or customer delivery, generate a full
dependency license inventory from the lockfile and include any required notices.

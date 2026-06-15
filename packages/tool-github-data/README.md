# @temis/tool-github-data

Build-time GitHub metadata enrichment for TEMIS tool records.

The package accepts EmDash tool rows with a `repository_url`, fetches public
repository metadata from the GitHub REST API, and returns a non-fatal `github`
object. Failed GitHub requests return `null` so static builds can continue.

Set `TEMIS_GITHUB_TOKEN` or `GITHUB_TOKEN` in build environments to raise GitHub
API rate limits. Set `TEMIS_GITHUB_FETCH_DISABLED=1` for offline builds.

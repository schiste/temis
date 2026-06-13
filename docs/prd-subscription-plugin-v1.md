# TEMIS V1 Subscription Delivery Plugin PRD

Status: Draft  
Date: 2026-06-13

## Summary

The TEMIS subscription delivery plugin is a first-party EmDash plugin for collecting reader subscriptions and delivering newsletter-style updates through two opt-in channels:

- Email.
- Wikimedia user talk page messages.

The plugin should stay Cloudflare-native, privacy-aware, open-source, and simple enough for V1. It replaces the need for listmonk in V1.

## Product Decision

TEMIS V1 will not run listmonk.

The V1 subscription stack is:

1. Public subscription capture from the static Astro site.
2. Subscription storage in D1 through the CMS/Worker surface.
3. Admin management inside EmDash.
4. Transactional email through Cloudflare Email Service for confirmation, unsubscribe, and operational messages.
5. Optional Wikimedia user talk page delivery through a controlled MediaWiki API queue.

## Goals

- Let readers subscribe without third-party tracking.
- Support email subscriptions.
- Support Wikimedia user talk page subscriptions as an explicit opt-in channel.
- Store consent and delivery preferences in D1.
- Give editors/admins a simple EmDash management surface.
- Provide CSV export.
- Provide safe delivery queues with status, retries, and failure visibility.
- Keep all metrics server-side and aggregate.
- Avoid operating a separate newsletter platform for V1.

## Non-Goals

- Full campaign marketing automation.
- Audience segmentation.
- Behavioral analytics.
- Open/click tracking.
- Tracking pixels.
- Third-party newsletter embeds.
- Bulk mailing-list management through listmonk.
- Public reader accounts.
- Unsolicited wiki talk page posting.
- Automated high-volume talk page posting without rate limits and operator review.

## Users

- Public reader: subscribes, confirms, receives updates, unsubscribes.
- Wikimedia reader: opts into talk page delivery by providing wiki identity details.
- Editor/admin: views subscribers, exports subscribers, prepares delivery, reviews failures.
- Operator: configures Cloudflare Email Service, MediaWiki credentials, rate limits, and monitoring.

## Public Subscription Flow

1. Reader opens a subscribe form.
2. Reader chooses one or more channels:
   - Email.
   - Wikimedia user talk page.
3. Reader submits the minimum required fields for selected channels.
4. Plugin records a pending subscription and consent event.
5. Plugin sends confirmation for each selected channel where feasible.
6. Reader confirms.
7. Plugin marks the channel as confirmed.
8. Future sends only target confirmed channels.

## Channel Requirements

### Email

Required fields:

- Email address.
- Consent timestamp.
- Source URL.
- Preferred language, optional.

Behavior:

- Use double opt-in.
- Send confirmation and unsubscribe emails as transactional email.
- Do not add tracking pixels.
- Do not track opens.
- Do not rewrite links for click tracking.
- Store unsubscribe token separately from public identifiers.
- Support CSV export.

Cloudflare Email Service should only be used for transactional messages in V1. Newsletter campaign sending is deferred until a deliberate sending workflow is approved.

### Wikimedia User Talk Page

Required fields:

- Wikimedia username.
- Home wiki API URL or supported wiki identifier.
- Talk page title resolved from username and wiki.
- Consent timestamp.
- Source URL.
- Preferred language, optional.

Behavior:

- Require explicit opt-in for talk page delivery.
- Validate that the target wiki and username format are acceptable.
- Store the selected wiki and resolved talk page target.
- Queue talk page deliveries instead of posting synchronously.
- Use clear edit summaries.
- Include unsubscribe instructions in every message.
- Rate limit all wiki edits.
- Use a descriptive Wikimedia-compatible User-Agent.
- Record delivery status, page target, revision ID where available, and error details.
- Allow admin/operator pause of talk page delivery.

Confirmation behavior needs a final implementation decision:

- Option A: confirm talk page delivery by sending a one-time talk page confirmation message.
- Option B: require email confirmation before enabling talk page delivery.
- Option C: require OAuth/wiki-auth confirmation if added later.

Recommended V1 default: require email confirmation for the subscriber record, then allow talk page delivery only after explicit talk-page opt-in is recorded. This avoids using wiki talk pages for confirmation spam.

## EmDash Admin Requirements

The plugin should expose an EmDash admin surface for:

- Subscriber list.
- Subscriber detail.
- Channel status per subscriber.
- Consent event history.
- Unsubscribe status.
- CSV export.
- Delivery queue.
- Delivery job detail.
- Retry failed delivery.
- Pause/resume delivery channel.
- Plugin configuration/status.

Admin views should not expose secret tokens or raw credentials.

## Delivery Model

V1 delivery should be queue-based.

Delivery job fields:

- ID.
- Channel: `email` or `wikimedia_user_talk`.
- Subscriber ID.
- Content reference or message payload reference.
- Status: pending, sending, sent, failed, canceled.
- Attempt count.
- Next attempt time.
- Last error.
- Provider response metadata.
- Created/updated timestamps.

The first implementation may support manual/admin-triggered delivery only. Automatic delivery from content publish is not required for V1 unless explicitly approved.

## Content Model

The plugin does not need a new public content type for V1.

It should support sending an update derived from:

- A published article.
- A manually drafted subject/body in the admin surface.
- A future newsletter issue content type if later approved.

Recommended V1 default: use published articles as the first sendable objects and generate a simple update message with title, summary, canonical URL, license, and unsubscribe instructions.

## Data Model

The exact schema can change during implementation, but the plugin needs durable storage for:

- Subscriber.
- Subscription channel.
- Consent event.
- Unsubscribe token.
- Delivery job.
- Delivery attempt.
- Plugin setting.

Sensitive fields:

- Confirmation tokens.
- Unsubscribe tokens.
- MediaWiki credentials.
- Any API tokens.

Sensitive fields must not be exposed in public snapshots or static builds.

## API Requirements

Public endpoints:

- `POST /subscribe`
- `GET /subscribe/confirm`
- `GET /unsubscribe`
- `POST /unsubscribe`

Admin/plugin endpoints:

- Subscriber list.
- Subscriber detail.
- CSV export.
- Delivery queue.
- Delivery retry.
- Delivery pause/resume.
- Plugin status.

Final paths can follow EmDash plugin route conventions during implementation.

## Privacy Requirements

- No client-side analytics.
- No tracking cookies.
- No fingerprinting.
- No open tracking.
- No click tracking.
- Minimal PII collection.
- Store only fields required for the selected delivery channel.
- Provide unsubscribe for every channel.
- Support deletion or suppression of subscriber records.
- Keep public content snapshots free of subscriber data.

## Security Requirements

- CSRF protection or equivalent protections for state-changing admin routes.
- Rate limiting for public subscription endpoints.
- Tokenized confirmation and unsubscribe flows.
- Constant-time comparison for sensitive tokens where practical.
- Secrets stored as Cloudflare Worker secrets or bindings, not in git.
- MediaWiki credentials isolated from public routes.
- Admin-only access for subscriber and delivery management.
- No raw token display in admin UI.

## Operational Requirements

- Cloudflare D1 stores subscription and delivery state.
- Cloudflare Email Service sends transactional email through a Worker binding.
- MediaWiki API calls use a descriptive User-Agent with contact information.
- Delivery queues must support retry and backoff.
- Talk page delivery must be globally pausable.
- Operators should be able to export subscribers before changing delivery systems.

## Metrics

All metrics must be server-side and aggregate.

Track:

- Pending subscribers.
- Confirmed subscribers.
- Unsubscribed subscribers.
- Confirmed subscribers by channel.
- Subscription confirmations.
- Delivery jobs by status.
- Delivery failures by channel.
- Talk page delivery attempts and successes.
- Email transactional send attempts and successes.

Do not track:

- Opens.
- Clicks tied to individual readers.
- Per-reader browsing behavior.

## Acceptance Criteria

- A public reader can subscribe with email.
- A public reader can opt into Wikimedia user talk page delivery.
- Email subscription uses double opt-in.
- Subscriber records are stored in D1.
- Admins can view subscribers in EmDash.
- Admins can export subscribers as CSV.
- Admins can view delivery queue state.
- Admins can unsubscribe or suppress a subscriber.
- Transactional emails can be sent from the Worker using Cloudflare Email Service.
- Talk page deliveries are queued, rate-limited, and visibly auditable.
- Every delivered message includes unsubscribe instructions.
- No client-side tracking, open tracking, click tracking, or tracking cookies are added.

## Implementation Assumptions To Validate

- EmDash plugin routes can host the needed public and admin endpoints.
- EmDash plugin storage is sufficient for subscription tables, or the plugin can access D1 through the CMS Worker.
- Cloudflare Email Service is available for the project domain and plan.
- MediaWiki credentials can be stored and used safely from the CMS Worker.
- The first talk page delivery target will be Wikimedia projects, not arbitrary MediaWiki installs.

## Open Questions

- Should talk page delivery require email confirmation first?
- Should talk page delivery support only Meta-Wiki at first, or any Wikimedia project?
- What bot account or OAuth flow should be used for talk page posting?
- What contact identity should be used in the Wikimedia User-Agent?
- What should the first delivery message template look like?
- Should V1 support admin-authored standalone updates, or only article-derived updates?
- What rate limit should be used for talk page delivery?
- Should unsubscribe from email also unsubscribe from talk page delivery by default?

## References

- Cloudflare Email Service: https://developers.cloudflare.com/email-service/
- MediaWiki Edit API: https://www.mediawiki.org/wiki/API:Edit
- MediaWiki Tokens API: https://www.mediawiki.org/wiki/API:Tokens
- Wikimedia User-Agent Policy: https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy

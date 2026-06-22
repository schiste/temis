/**
 * Trusted React admin module for the media-fields plugin.
 *
 * Exports `fields.imageWithMeta`, the editor EmDash renders for any `json`
 * field declaring `widget: "temis-media-fields:imageWithMeta"`. It bundles an
 * image reference (selected from the existing media library) with its alt,
 * caption, and license metadata into a single control, replacing four separate
 * stacked fields.
 *
 * Uploading is intentionally out of scope: editors upload in EmDash's native
 * Media section (which owns the signed-upload pipeline), then select here.
 *
 * Stored value shape: `{ storageKey, alt?, caption?, license? }`. `storageKey`
 * is EmDash's canonical, resolvable media reference.
 */

import * as React from "react";

const MEDIA_LIST_ENDPOINT = "/_emdash/api/media";
const MEDIA_FILE_PREFIX = "/_emdash/api/media/file/";
const META_KEYS = ["storageKey", "alt", "caption", "license"] as const;

interface ImageWithMetaValue {
  storageKey?: string;
  alt?: string;
  caption?: string;
  license?: string;
}

interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  storageKey: string;
  alt: string | null;
  caption: string | null;
}

interface FieldWidgetProps {
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  id: string;
  required?: boolean;
}

function parseValue(raw: unknown): ImageWithMetaValue {
  let source: unknown = raw;
  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed) return {};
    try {
      source = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  if (!source || typeof source !== "object") return {};
  const record = source as Record<string, unknown>;
  const result: ImageWithMetaValue = {};
  for (const key of META_KEYS) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      result[key] = candidate;
    }
  }
  return result;
}

/** Normalize to the stored shape, dropping empty fields. Returns null when empty. */
function normalize(next: ImageWithMetaValue): ImageWithMetaValue | null {
  const cleaned: ImageWithMetaValue = {};
  for (const key of META_KEYS) {
    const candidate = next[key];
    if (typeof candidate === "string" && candidate.length > 0) {
      cleaned[key] = candidate;
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function fileUrl(storageKey: string): string {
  return `${MEDIA_FILE_PREFIX}${encodeURIComponent(storageKey)}`;
}

export function ImageWithMetaField({
  value,
  onChange,
  label,
  id,
  required,
}: FieldWidgetProps): React.ReactElement {
  const current = React.useMemo(() => parseValue(value), [value]);
  const [browsing, setBrowsing] = React.useState(false);
  const [items, setItems] = React.useState<MediaItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const update = React.useCallback(
    (patch: Partial<ImageWithMetaValue>) => {
      onChange(normalize({ ...current, ...patch }));
    },
    [current, onChange],
  );

  const loadMedia = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${MEDIA_LIST_ENDPOINT}?limit=60`, {
        credentials: "same-origin",
        headers: { Accept: "application/json", "X-EmDash-Request": "1" },
      });
      if (!res.ok) throw new Error(`Media request failed (${res.status})`);
      const data = (await res.json()) as { items?: unknown };
      const list = Array.isArray(data.items) ? (data.items as MediaItem[]) : [];
      setItems(
        list.filter(
          (m) =>
            typeof m?.mimeType === "string" && m.mimeType.startsWith("image/"),
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load media");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openBrowser = React.useCallback(() => {
    setBrowsing(true);
    if (items === null) void loadMedia();
  }, [items, loadMedia]);

  const select = React.useCallback(
    (item: MediaItem) => {
      update({
        storageKey: item.storageKey,
        // Seed alt/caption from the media record only when not already set,
        // so per-usage overrides are never clobbered.
        alt: current.alt ?? item.alt ?? undefined,
        caption: current.caption ?? item.caption ?? undefined,
      });
      setBrowsing(false);
    },
    [current.alt, current.caption, update],
  );

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required ? <span className="text-kumo-danger"> *</span> : null}
      </label>

      {current.storageKey ? (
        <div className="flex items-start gap-3">
          <img
            src={fileUrl(current.storageKey)}
            alt={current.alt ?? ""}
            className="h-24 w-24 rounded border object-cover"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={openBrowser}
              className="rounded border px-3 py-1.5 text-sm"
            >
              Change image
            </button>
            <button
              type="button"
              onClick={() => update({ storageKey: undefined })}
              className="rounded border px-3 py-1.5 text-sm text-kumo-danger"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openBrowser}
          className="w-full rounded border border-dashed px-4 py-6 text-sm text-kumo-subtle"
        >
          Select image from library
        </button>
      )}

      {browsing ? (
        <div className="rounded border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Media library</span>
            <button
              type="button"
              onClick={() => setBrowsing(false)}
              className="text-sm"
            >
              Close
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-kumo-subtle">Loading…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-kumo-danger">
              {error}{" "}
              <button
                type="button"
                onClick={() => void loadMedia()}
                className="underline"
              >
                Retry
              </button>
            </p>
          ) : null}
          {items && !loading && items.length === 0 ? (
            <p className="text-sm text-kumo-subtle">
              No images yet. Upload images in the Media section, then select
              them here.
            </p>
          ) : null}
          {items && items.length > 0 ? (
            <div className="grid max-h-64 grid-cols-4 gap-2 overflow-auto">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => select(item)}
                  title={item.filename}
                  className="overflow-hidden rounded border hover:ring-2"
                >
                  <img
                    src={fileUrl(item.storageKey)}
                    alt={item.alt ?? item.filename}
                    className="h-20 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <TextField
          label="Alt text"
          description="Describe the image for screen readers and when it fails to load."
          value={current.alt ?? ""}
          onChange={(next) => update({ alt: next })}
          multiline
        />
        <TextField
          label="Caption"
          value={current.caption ?? ""}
          onChange={(next) => update({ caption: next })}
          multiline
        />
        <TextField
          label="License / credit"
          value={current.license ?? ""}
          onChange={(next) => update({ license: next })}
        />
      </div>
    </div>
  );
}

function TextField({
  label,
  description,
  value,
  onChange,
  multiline,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}): React.ReactElement {
  const className = "w-full rounded border px-3 py-2 text-sm";
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {multiline ? (
        <textarea
          className={className}
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          dir="auto"
        />
      ) : (
        <input
          className={className}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          dir="auto"
        />
      )}
      {description ? (
        <span className="mt-1 block text-xs text-kumo-subtle">
          {description}
        </span>
      ) : null}
    </label>
  );
}

export const fields = {
  imageWithMeta: ImageWithMetaField,
};

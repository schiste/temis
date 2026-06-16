import {
  definePlugin,
  type ContentHookEvent,
  type PortableTextBlockConfig,
} from "emdash";

const PLUGIN_ID = "temis-editorial-blocks";
const PLUGIN_VERSION = "0.1.0";
const PLUGIN_ENTRYPOINT = "@temis/emdash-editorial-blocks";
const DEFAULT_COLLECTIONS = ["posts", "pages"];

export interface EditorialBlocksPluginOptions {
  collections?: string[];
}

const toneOptions = [
  { label: "Neutral", value: "neutral" },
  { label: "Positive", value: "positive" },
  { label: "Warning", value: "warning" },
  { label: "Critical", value: "critical" },
];

const dataTableCellFields = Array.from({ length: 6 }, (_, index) => ({
  type: "text_input" as const,
  action_id: `cell${index + 1}`,
  label: `Cell ${index + 1}`,
}));

function textInput(
  actionId: string,
  label: string,
  options: { multiline?: boolean; placeholder?: string } = {},
) {
  return {
    type: "text_input" as const,
    action_id: actionId,
    label,
    ...(options.multiline ? { multiline: true } : {}),
    ...(options.placeholder ? { placeholder: options.placeholder } : {}),
  };
}

function toneSelect(actionId = "tone") {
  return {
    type: "select" as const,
    action_id: actionId,
    label: "Tone",
    options: toneOptions,
    initial_value: "neutral",
  };
}

export const editorialPortableTextBlocks = [
  {
    type: "statGrid",
    label: "Stat grid",
    icon: "grid",
    category: "TEMIS",
    description: "A grid of highlighted statistics.",
    fields: [
      {
        type: "repeater",
        action_id: "cards",
        label: "Cards",
        item_label: "Stat",
        min_items: 1,
        max_items: 6,
        fields: [
          textInput("value", "Value", { placeholder: "+83%" }),
          textInput("label", "Label", { placeholder: "Internet users growth" }),
          textInput("detail", "Detail", { placeholder: "2016 to 2025" }),
          toneSelect(),
        ],
      },
    ],
  },
  {
    type: "callout",
    label: "Callout",
    icon: "alert",
    category: "TEMIS",
    description: "A highlighted editorial note.",
    fields: [
      textInput("title", "Title"),
      textInput("body", "Body", { multiline: true }),
      toneSelect(),
    ],
  },
  {
    type: "figure",
    label: "Figure",
    icon: "image",
    category: "TEMIS",
    description: "An image with required editorial metadata.",
    fields: [
      {
        type: "media_picker",
        action_id: "src",
        label: "Image",
        mime_type_filter: "image/",
        placeholder: "Select image",
      },
      textInput("alt", "Alt text", { multiline: true }),
      textInput("caption", "Caption", { multiline: true }),
      textInput("credit", "Credit"),
      textInput("license", "License or rights note"),
      textInput("sourceUrl", "Source URL"),
    ],
  },
  {
    type: "dataTable",
    label: "Data table",
    icon: "table",
    category: "TEMIS",
    description: "A compact editorial data table with up to six columns.",
    fields: [
      textInput("caption", "Caption"),
      {
        type: "repeater",
        action_id: "columns",
        label: "Columns",
        item_label: "Column",
        min_items: 1,
        max_items: 6,
        fields: [textInput("label", "Label")],
      },
      {
        type: "repeater",
        action_id: "rows",
        label: "Rows",
        item_label: "Row",
        min_items: 1,
        fields: dataTableCellFields,
      },
    ],
  },
  {
    type: "timeline",
    label: "Timeline",
    icon: "timeline",
    category: "TEMIS",
    description: "A vertical timeline for eras, milestones, or phases.",
    fields: [
      {
        type: "repeater",
        action_id: "items",
        label: "Items",
        item_label: "Item",
        min_items: 1,
        fields: [
          textInput("period", "Period"),
          textInput("title", "Title"),
          textInput("metrics", "Metrics"),
          textInput("body", "Body", { multiline: true }),
          toneSelect(),
        ],
      },
    ],
  },
] satisfies PortableTextBlockConfig[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPresentRecord(
  value: Record<string, string> | null,
): value is Record<string, string> {
  return value !== null;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nonEmptyRecord(record: Record<string, unknown>) {
  return Object.values(record).some((value) => cleanString(value).length > 0);
}

function normalizeTone(value: unknown) {
  const tone = cleanString(value);
  return toneOptions.some((option) => option.value === tone) ? tone : "neutral";
}

function normalizeStatCards(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((card) => ({
      value: cleanString(card.value),
      label: cleanString(card.label),
      detail: cleanString(card.detail),
      tone: normalizeTone(card.tone),
    }))
    .filter(nonEmptyRecord);
}

function normalizeTimelineItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => ({
      period: cleanString(item.period),
      title: cleanString(item.title),
      metrics: Array.isArray(item.metrics)
        ? item.metrics.map(cleanString).filter(Boolean).join(" · ")
        : cleanString(item.metrics),
      body: cleanString(item.body),
      tone: normalizeTone(item.tone),
    }))
    .filter(nonEmptyRecord);
}

function normalizeTableColumns(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((column) => {
      if (isRecord(column)) return { label: cleanString(column.label) };
      return { label: cleanString(column) };
    })
    .filter(nonEmptyRecord)
    .slice(0, 6);
}

function normalizeTableRows(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((row) => {
      if (Array.isArray(row)) {
        return Object.fromEntries(
          dataTableCellFields.map((field, index) => [
            field.action_id,
            cleanString(row[index]),
          ]),
        );
      }

      if (!isRecord(row)) return null;

      return Object.fromEntries(
        dataTableCellFields.map((field) => [
          field.action_id,
          cleanString(row[field.action_id]),
        ]),
      );
    })
    .filter(isPresentRecord)
    .filter(nonEmptyRecord);
}

export function normalizeEditorialBlock(block: unknown): unknown {
  if (!isRecord(block)) return block;

  switch (block._type) {
    case "statGrid":
      return {
        ...block,
        cards: normalizeStatCards(block.cards),
      };
    case "callout":
      return {
        ...block,
        title: cleanString(block.title),
        body: cleanString(block.body),
        tone: normalizeTone(block.tone),
      };
    case "figure":
      return {
        ...block,
        src: cleanString(block.src),
        alt: cleanString(block.alt),
        caption: cleanString(block.caption),
        credit: cleanString(block.credit),
        license: cleanString(block.license),
        sourceUrl: cleanString(block.sourceUrl),
      };
    case "dataTable":
      return {
        ...block,
        caption: cleanString(block.caption),
        columns: normalizeTableColumns(block.columns),
        rows: normalizeTableRows(block.rows),
      };
    case "timeline":
      return {
        ...block,
        items: normalizeTimelineItems(block.items),
      };
    default:
      return block;
  }
}

export function normalizeEditorialBlocks(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeEditorialBlock);
  }

  return value;
}

export function normalizeEditorialContent(
  content: Record<string, unknown>,
): Record<string, unknown> {
  if (!Array.isArray(content.content)) return content;

  return {
    ...content,
    content: normalizeEditorialBlocks(content.content),
  };
}

function collectionSet(options: EditorialBlocksPluginOptions) {
  const collections =
    options.collections && options.collections.length > 0
      ? options.collections
      : DEFAULT_COLLECTIONS;

  return new Set(collections);
}

export function createEditorialBlocksDefinition(
  options: EditorialBlocksPluginOptions = {},
) {
  const collections = collectionSet(options);

  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    capabilities: ["content:write"],
    admin: {
      portableTextBlocks: editorialPortableTextBlocks,
    },
    hooks: {
      "content:beforeSave": async (event: ContentHookEvent) => {
        if (!collections.has(event.collection)) return;
        return normalizeEditorialContent(event.content);
      },
    },
  });
}

export function editorialBlocksPlugin(
  options: EditorialBlocksPluginOptions = {},
) {
  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoint: PLUGIN_ENTRYPOINT,
    options,
  };
}

export function createPlugin(options: EditorialBlocksPluginOptions = {}) {
  return createEditorialBlocksDefinition(options);
}

export default editorialBlocksPlugin;

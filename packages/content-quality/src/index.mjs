const collectionContentTypes = {
  pages: "Page",
  posts: "Essay",
  tools: "Tool",
};

const summaryFieldsByCollection = {
  pages: ["summary", "excerpt", "description"],
  posts: ["excerpt", "summary"],
  tools: ["summary", "excerpt"],
};

const contentCollectionsWithAuthors = new Set(["posts", "tools"]);
const graphCollections = new Set(["posts", "tools"]);

const blockedTrackingPatterns = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "facebook.com/tr",
  "connect.facebook.net",
  "hotjar.com",
  "fullstory.com",
  "segment.io",
  "segment.com",
  "mixpanel.com",
  "amplitude.com",
  "heapanalytics.com",
  "clarity.ms",
  "analytics.js",
  "gtag(",
  "datalayer",
  "tracking pixel",
];

const imageFieldDefinitions = [
  {
    field: "featured_image",
    altFields: ["featured_image_alt"],
    captionFields: ["featured_image_caption"],
    licenseFields: ["featured_image_license", "image_license"],
  },
  {
    field: "hero_image",
    altFields: ["hero_image_alt"],
    captionFields: ["hero_image_caption"],
    licenseFields: ["hero_image_license", "image_license"],
  },
  {
    field: "image",
    altFields: ["image_alt"],
    captionFields: ["image_caption"],
    licenseFields: ["image_license"],
  },
  {
    field: "screenshot_url",
    altFields: ["screenshot_alt"],
    captionFields: ["screenshot_caption"],
    licenseFields: ["screenshot_license"],
  },
];

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseMaybeJson(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function cleanString(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function hasText(value) {
  return cleanString(value).length > 0;
}

function firstTextField(record, fields) {
  for (const field of fields) {
    const value = record[field];
    if (hasText(value)) return { field, value: cleanString(value) };
  }

  return null;
}

function getSeoValue(record, field) {
  const direct = record[field];
  if (hasText(direct)) return cleanString(direct);

  const seo = isRecord(record.seo) ? record.seo : null;
  if (!seo) return "";

  if (field === "seo_title" && hasText(seo.title)) {
    return cleanString(seo.title);
  }

  if (field === "seo_description" && hasText(seo.description)) {
    return cleanString(seo.description);
  }

  return "";
}

function contentIdentifier(record, explicitId) {
  return (
    cleanString(explicitId) ||
    cleanString(record.id) ||
    cleanString(record.slug) ||
    cleanString(record.title) ||
    "unknown"
  );
}

function contentType(record, collection) {
  return (
    cleanString(record.content_type) ||
    cleanString(record.contentType) ||
    cleanString(record.kind) ||
    cleanString(record.article_type) ||
    collectionContentTypes[collection] ||
    collection
  );
}

function bylineArrayHasCredit(value) {
  if (!Array.isArray(value)) return false;

  return value.some((item) => {
    if (!isRecord(item)) return false;
    return (
      hasText(item.bylineId) ||
      hasText(item.byline_id) ||
      hasText(item.id) ||
      hasText(item.display_name) ||
      hasText(item.name)
    );
  });
}

function hasAuthor(record, relationships) {
  if (relationships?.authorLinked === true) return true;

  return (
    hasText(record.primary_byline_id) ||
    hasText(record.primaryBylineId) ||
    hasText(record.author_name) ||
    hasText(record.authorName) ||
    hasText(record.related_people) ||
    bylineArrayHasCredit(record.bylines)
  );
}

function hasTopicOrTag(record, relationships) {
  if (relationships?.topicOrTagAssigned === true) return true;

  const candidates = [
    record.topic,
    record.topics,
    record.topic_slugs,
    record.tags,
    record.tag_slugs,
    record.category,
    record.categories,
  ];

  return candidates.some((value) => {
    if (Array.isArray(value)) return value.some((item) => hasText(item));
    return hasText(value);
  });
}

function imageValueExists(value) {
  if (value == null || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (isRecord(value)) {
    return (
      hasText(value.src) ||
      hasText(value.url) ||
      hasText(value.id) ||
      hasText(value.storageKey)
    );
  }
  return false;
}

function imageMetadataValue(image, siblingRecord, objectKeys, siblingFields) {
  if (isRecord(image)) {
    for (const key of objectKeys) {
      if (hasText(image[key])) return cleanString(image[key]);
    }

    const meta = isRecord(image.meta) ? image.meta : null;
    if (meta) {
      for (const key of objectKeys) {
        if (hasText(meta[key])) return cleanString(meta[key]);
      }
    }
  }

  const field = firstTextField(siblingRecord, siblingFields);
  return field?.value ?? "";
}

function collectStrings(value, output = []) {
  const parsed = parseMaybeJson(value);

  if (typeof parsed === "string") {
    output.push(parsed);
    return output;
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) collectStrings(item, output);
    return output;
  }

  if (isRecord(parsed)) {
    for (const item of Object.values(parsed)) collectStrings(item, output);
  }

  return output;
}

function collectFigureBlocks(value, output = []) {
  const parsed = parseMaybeJson(value);

  if (Array.isArray(parsed)) {
    for (const item of parsed) collectFigureBlocks(item, output);
    return output;
  }

  if (!isRecord(parsed)) return output;

  if (parsed._type === "figure") output.push(parsed);

  for (const item of Object.values(parsed)) collectFigureBlocks(item, output);

  return output;
}

function addIssue(issues, severity, code, message, field) {
  issues.push({
    code,
    ...(field ? { field } : {}),
    message,
    severity,
  });
}

export function normalizeContentRecord(content) {
  const parsedData = parseMaybeJson(content.data);
  const data = isRecord(content.data)
    ? content.data
    : isRecord(parsedData)
      ? parsedData
      : {};

  return {
    ...data,
    ...content,
  };
}

export function validateContentQuality(options) {
  const collection = cleanString(options.collection);
  const record = normalizeContentRecord(options.content ?? {});
  const issues = [];
  const id = contentIdentifier(record, options.contentId);
  const type = contentType(record, collection);
  const mode = options.mode ?? "publish";
  const relationships = options.relationships ?? {};

  if (!firstTextField(record, ["title", "name"])) {
    addIssue(
      issues,
      "error",
      "missing-title",
      "Published content must have a title.",
      "title",
    );
  }

  const summaryFields = summaryFieldsByCollection[collection] ?? [
    "summary",
    "excerpt",
    "description",
  ];
  if (!firstTextField(record, summaryFields)) {
    addIssue(
      issues,
      "error",
      "missing-summary",
      "Published content must have a summary or excerpt.",
      summaryFields[0],
    );
  }

  if (!hasText(type)) {
    addIssue(
      issues,
      "error",
      "missing-content-type",
      "Published content must have a content type.",
      "content_type",
    );
  }

  if (
    contentCollectionsWithAuthors.has(collection) &&
    !hasAuthor(record, relationships)
  ) {
    addIssue(
      issues,
      "error",
      "missing-author",
      "Published content must be linked to an author, person, or byline.",
      "primary_byline_id",
    );
  }

  if (
    mode === "publish" &&
    graphCollections.has(collection) &&
    !hasTopicOrTag(record, relationships)
  ) {
    addIssue(
      issues,
      "warning",
      "missing-topic-or-tag",
      "Published graph content should have at least one topic, tag, or category assignment.",
      "topics",
    );
  }

  if (!getSeoValue(record, "seo_title")) {
    addIssue(
      issues,
      "error",
      "missing-seo-title",
      "Published content must have an SEO title.",
      "seo_title",
    );
  }

  if (!getSeoValue(record, "seo_description")) {
    addIssue(
      issues,
      "error",
      "missing-seo-description",
      "Published content must have an SEO description.",
      "seo_description",
    );
  }

  if (hasText(record.source_url)) {
    if (!hasText(record.source_title)) {
      addIssue(
        issues,
        "error",
        "missing-source-title",
        "Imported or republished content with a source URL must name the source.",
        "source_title",
      );
    }

    if (!hasText(record.content_license)) {
      addIssue(
        issues,
        "error",
        "missing-content-license",
        "Imported or republished content with a source URL must declare its content license.",
        "content_license",
      );
    }
  }

  for (const imageField of imageFieldDefinitions) {
    const image = record[imageField.field];
    if (!imageValueExists(image)) continue;

    const alt = imageMetadataValue(
      image,
      record,
      ["alt", "altText", "alternativeText"],
      imageField.altFields,
    );
    const caption = imageMetadataValue(
      image,
      record,
      ["caption", "figcaption"],
      imageField.captionFields,
    );
    const license = imageMetadataValue(
      image,
      record,
      ["license", "rights", "credit"],
      imageField.licenseFields,
    );

    if (!alt) {
      addIssue(
        issues,
        "error",
        "missing-image-alt",
        "Images must have alt text.",
        imageField.altFields[0] ?? imageField.field,
      );
    }

    if (!caption) {
      addIssue(
        issues,
        "error",
        "missing-image-caption",
        "Images must have a caption.",
        imageField.captionFields[0] ?? imageField.field,
      );
    }

    if (!license) {
      addIssue(
        issues,
        "error",
        "missing-image-license",
        "Images must have a license or rights note.",
        imageField.licenseFields[0] ?? imageField.field,
      );
    }
  }

  for (const figure of collectFigureBlocks(record.content)) {
    if (!hasText(figure.src)) {
      addIssue(
        issues,
        "error",
        "missing-figure-source",
        "Figure blocks must include an image source.",
        "content",
      );
    }

    if (!hasText(figure.alt)) {
      addIssue(
        issues,
        "error",
        "missing-figure-alt",
        "Figure blocks must include alt text.",
        "content",
      );
    }

    if (!hasText(figure.caption)) {
      addIssue(
        issues,
        "error",
        "missing-figure-caption",
        "Figure blocks must include a caption.",
        "content",
      );
    }

    if (!hasText(figure.license)) {
      addIssue(
        issues,
        "error",
        "missing-figure-license",
        "Figure blocks must include a license or rights note.",
        "content",
      );
    }
  }

  const allStrings = collectStrings(record);
  for (const value of allStrings) {
    const lower = value.toLowerCase();
    const match = blockedTrackingPatterns.find((pattern) =>
      lower.includes(pattern),
    );
    if (!match) continue;

    addIssue(
      issues,
      "error",
      "tracking-embed",
      `Tracking embeds and analytics references are not allowed: ${match}.`,
    );
    break;
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    collection,
    contentId: id,
    contentType: type,
    errors,
    issues,
    warnings,
  };
}

export function formatContentQualityIssues(result) {
  const lines = result.issues.map((issue) => {
    const prefix = issue.severity === "error" ? "error" : "warning";
    const field = issue.field ? ` (${issue.field})` : "";
    return `- ${prefix}: ${issue.message}${field}`;
  });

  return [
    `${result.collection}/${result.contentId} failed TEMIS content quality checks.`,
    ...lines,
  ].join("\n");
}

export function assertContentQuality(options) {
  const result = validateContentQuality(options);
  if (result.errors.length > 0) {
    throw new Error(formatContentQualityIssues(result));
  }

  return result;
}

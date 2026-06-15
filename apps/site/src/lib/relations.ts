export interface RelatedPersonReference {
  detail?: string;
  label: string;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitRelatedText(value: string) {
  return value
    .split(/[\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function personReferenceFromText(value: string): RelatedPersonReference | null {
  const cleanValue = value.trim();
  if (!cleanValue) return null;

  const [label, ...detailParts] = cleanValue.split(":");
  const cleanLabel = label?.trim();
  if (!cleanLabel) return null;

  const detail = detailParts.join(":").trim();
  return detail ? { detail, label: cleanLabel } : { label: cleanLabel };
}

export function relatedRecordIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      return cleanText(record.id) || cleanText(record.reference_id);
    })
    .filter(Boolean);
}

export function relatedPeopleReferences(value: unknown) {
  if (typeof value === "string") {
    return splitRelatedText(value)
      .map(personReferenceFromText)
      .filter((item): item is RelatedPersonReference => Boolean(item));
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item): RelatedPersonReference | null => {
      if (typeof item === "string") return personReferenceFromText(item);
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const label =
        cleanText(record.display_name) ||
        cleanText(record.name) ||
        cleanText(record.title) ||
        cleanText(record.slug);
      if (!label) return null;

      const detail =
        cleanText(record.role) ||
        cleanText(record.detail) ||
        cleanText(record.description);

      return detail ? { detail, label } : { label };
    })
    .filter((item): item is RelatedPersonReference => Boolean(item));
}

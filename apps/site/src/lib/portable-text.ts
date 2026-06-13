function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function blockText(block: unknown) {
  if (!block || typeof block !== "object") return "";
  const children = (block as { children?: Array<{ text?: string }> }).children;
  if (!Array.isArray(children)) return "";
  return children.map((child) => escapeHtml(child.text ?? "")).join("");
}

export function portableTextToHtml(value: unknown) {
  if (!Array.isArray(value)) {
    return typeof value === "string" ? `<p>${escapeHtml(value)}</p>` : "";
  }

  return value
    .map((block) => {
      if (!block || typeof block !== "object") return "";

      const data = block as { style?: string; _type?: string; type?: string };
      const text = blockText(block);
      if (!text) return "";

      switch (data.style) {
        case "h2":
          return `<h2>${text}</h2>`;
        case "h3":
          return `<h3>${text}</h3>`;
        case "blockquote":
          return `<blockquote>${text}</blockquote>`;
        default:
          return `<p>${text}</p>`;
      }
    })
    .filter(Boolean)
    .join("\n");
}

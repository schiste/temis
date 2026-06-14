function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHref(value: unknown) {
  if (typeof value !== "string") return "#";

  try {
    const url = new URL(value, "https://temis.local");
    if (["http:", "https:", "mailto:"].includes(url.protocol)) return value;
  } catch {
    if (value.startsWith("/") || value.startsWith("#")) return value;
  }

  return "#";
}

function renderSpan(
  child: { marks?: string[]; text?: string },
  markDefs: Array<Record<string, unknown>>,
) {
  const marks = Array.isArray(child.marks) ? child.marks : [];
  return marks.reduce(
    (html, mark) => {
      if (mark === "strong") return `<strong>${html}</strong>`;
      if (mark === "em") return `<em>${html}</em>`;

      const definition = markDefs.find((item) => item._key === mark);
      if (definition?._type === "link") {
        return `<a href="${escapeHtml(safeHref(definition.href))}">${html}</a>`;
      }

      return html;
    },
    escapeHtml(child.text ?? ""),
  );
}

function blockText(block: unknown) {
  if (!block || typeof block !== "object") return "";
  const data = block as {
    children?: Array<{ marks?: string[]; text?: string }>;
    markDefs?: Array<Record<string, unknown>>;
  };
  const children = data.children;
  if (!Array.isArray(children)) return "";
  const markDefs = Array.isArray(data.markDefs) ? data.markDefs : [];
  return children.map((child) => renderSpan(child, markDefs)).join("");
}

function renderBlock(block: unknown) {
  if (!block || typeof block !== "object") return "";

  const data = block as { listItem?: string; style?: string };
  const text = blockText(block);
  if (!text) return "";

  if (data.listItem === "bullet") return `<li>${text}</li>`;

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
}

export function portableTextToHtml(value: unknown) {
  if (!Array.isArray(value)) {
    return typeof value === "string" ? `<p>${escapeHtml(value)}</p>` : "";
  }

  const html: string[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    html.push(`<ul>\n${listItems.join("\n")}\n</ul>`);
    listItems = [];
  }

  for (const block of value) {
    const data = block as { listItem?: string };
    const rendered = renderBlock(block);
    if (!rendered) continue;

    if (data?.listItem === "bullet") {
      listItems.push(rendered);
      continue;
    }

    flushList();
    html.push(rendered);
  }

  flushList();
  return html.join("\n");
}

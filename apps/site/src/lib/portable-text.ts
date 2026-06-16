function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function needsSpanSeparator(previousText: string, nextText: string) {
  if (!previousText || !nextText) return false;
  if (/\s$/.test(previousText) || /^\s/.test(nextText)) return false;
  if (/^[.,;:!?)}\]"'%]/.test(nextText)) return false;
  if (/[([{]$/.test(previousText)) return false;
  return true;
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

  let previousText = "";
  return children
    .map((child) => {
      const text = child.text ?? "";
      const separator = needsSpanSeparator(previousText, text) ? " " : "";
      previousText = text;
      return `${separator}${renderSpan(child, markDefs)}`;
    })
    .join("");
}

function renderBlock(block: unknown) {
  if (!block || typeof block !== "object") return "";

  const data = block as { _type?: string; listItem?: string; style?: string };

  if (data._type === "figure") return renderFigure(data);
  if (data._type === "statGrid") return renderStatGrid(data);
  if (data._type === "callout") return renderCallout(data);
  if (data._type === "dataTable") return renderDataTable(data);
  if (data._type === "timeline") return renderTimeline(data);

  const text = blockText(block);
  if (!text) return "";

  if (data.listItem === "bullet") return `<li><span>${text}</span></li>`;

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

function renderFigure(data: Record<string, unknown>) {
  const src = safeHref(data.src);
  const alt = textValue(data.alt);
  const caption = textValue(data.caption);
  const credit = textValue(data.credit);
  const license = textValue(data.license);
  const sourceUrl = safeHref(data.sourceUrl);

  if (src === "#") return "";

  const source =
    sourceUrl === "#" ? "" : ` <a href="${escapeHtml(sourceUrl)}">Source</a>`;
  const meta = [credit, license].filter(Boolean).join(" · ");
  const figcaption =
    caption || meta || source
      ? `<figcaption>${escapeHtml(caption)}${
          meta ? ` <span>${escapeHtml(meta)}</span>` : ""
        }${source}</figcaption>`
      : "";

  return `<figure class="ds-prose-figure"><img src="${escapeHtml(
    src,
  )}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />${figcaption}</figure>`;
}

function renderStatGrid(data: Record<string, unknown>) {
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const renderedCards = cards
    .filter(isRecord)
    .map((card) => {
      const tone = textValue(card.tone) || "neutral";
      const value = textValue(card.value);
      const label = textValue(card.label);
      const detail = textValue(card.detail);
      if (!value && !label) return "";

      return `<div class="ds-stat-card" data-tone="${escapeHtml(tone)}">${
        value ? `<strong>${escapeHtml(value)}</strong>` : ""
      }${label ? `<span>${escapeHtml(label)}</span>` : ""}${
        detail ? `<small>${escapeHtml(detail)}</small>` : ""
      }</div>`;
    })
    .filter(Boolean)
    .join("");

  return renderedCards
    ? `<section class="ds-stat-grid">${renderedCards}</section>`
    : "";
}

function renderCallout(data: Record<string, unknown>) {
  const tone = textValue(data.tone) || "neutral";
  const title = textValue(data.title);
  const body = textValue(data.body);

  if (!title && !body) return "";

  return `<aside class="ds-prose-callout" data-tone="${escapeHtml(tone)}">${
    title ? `<strong>${escapeHtml(title)}</strong>` : ""
  }${body ? `<p>${escapeHtml(body)}</p>` : ""}</aside>`;
}

function renderDataTable(data: Record<string, unknown>) {
  const caption = textValue(data.caption);
  const columns = Array.isArray(data.columns)
    ? data.columns.map(textValue).filter(Boolean)
    : [];
  const rows = Array.isArray(data.rows) ? data.rows : [];

  if (columns.length === 0 || rows.length === 0) return "";

  const head = columns
    .map((column) => `<th scope="col">${escapeHtml(column)}</th>`)
    .join("");
  const body = rows
    .filter(Array.isArray)
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(textValue(cell))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<figure class="ds-data-table">${
    caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""
  }<div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></figure>`;
}

function renderTimeline(data: Record<string, unknown>) {
  const items = Array.isArray(data.items) ? data.items : [];
  const renderedItems = items
    .filter(isRecord)
    .map((item) => {
      const period = textValue(item.period);
      const title = textValue(item.title);
      const metrics = Array.isArray(item.metrics)
        ? item.metrics.map(textValue).filter(Boolean).join(" · ")
        : textValue(item.metrics);
      const body = textValue(item.body);
      const tone = textValue(item.tone) || "neutral";

      if (!period && !title && !metrics && !body) return "";

      return `<article class="ds-prose-timeline__item" data-tone="${escapeHtml(
        tone,
      )}">${
        period
          ? `<span class="ds-prose-timeline__period">${escapeHtml(period)}</span>`
          : ""
      }<div class="ds-prose-timeline__body">${
        title ? `<h4>${escapeHtml(title)}</h4>` : ""
      }${metrics ? `<p data-role="metrics">${escapeHtml(metrics)}</p>` : ""}${
        body ? `<p>${escapeHtml(body)}</p>` : ""
      }</div></article>`;
    })
    .filter(Boolean)
    .join("");

  return renderedItems
    ? `<section class="ds-prose-timeline">${renderedItems}</section>`
    : "";
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

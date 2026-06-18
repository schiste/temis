import {
  blogHref,
  entryBylineHref,
  entryBylineName,
  entryBylineSlug,
  entryContentType,
  entryDescription,
  entryPublicationTypeLabel,
  entryTitle,
  publicationHref,
  slugify,
  toolHref,
  type BylineEntry,
  type InitiativeEntry,
  type PostEntry,
  type PublicationEntry,
  type ToolEntry,
} from "./emdash";
import { relatedPeopleReferences, resolveRelatedRecords } from "./relations";

export interface InitiativeBriefItem {
  label: string;
  value: string;
}

export interface InitiativeRelatedItem {
  description: string;
  href?: string;
  kind: string;
  label: string;
}

export interface InitiativeDossierCopy {
  initiativeDesiredOutcomeLabel: string;
  initiativeFocusQuestionLabel: string;
  initiativeScopeNoteLabel: string;
  initiativeWhyNowLabel: string;
}

function textField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function bylineMap(bylines: BylineEntry[]) {
  return new Map(bylines.map((byline) => [entryBylineSlug(byline), byline]));
}

export function buildInitiativeDossier(
  initiative: InitiativeEntry,
  posts: PostEntry[],
  publications: PublicationEntry[],
  tools: ToolEntry[],
  bylines: BylineEntry[],
  copy: InitiativeDossierCopy,
) {
  const briefItems = [
    {
      label: copy.initiativeFocusQuestionLabel,
      value: textField(initiative.focus_question),
    },
    {
      label: copy.initiativeWhyNowLabel,
      value: textField(initiative.why_now),
    },
    {
      label: copy.initiativeDesiredOutcomeLabel,
      value: textField(initiative.desired_outcome),
    },
    {
      label: copy.initiativeScopeNoteLabel,
      value: textField(initiative.scope_note),
    },
  ].filter((item): item is InitiativeBriefItem => Boolean(item.value));

  const articles = resolveRelatedRecords(
    initiative.related_articles,
    posts,
    "posts",
  ).map((post) => ({
    description: entryDescription(post),
    href: blogHref(post),
    kind: entryContentType(post),
    label: entryTitle(post),
  }));

  const relatedPublications = resolveRelatedRecords(
    initiative.related_publications,
    publications,
    "publications",
  ).map((publication) => ({
    description: entryDescription(publication),
    href: publicationHref(publication),
    kind: entryPublicationTypeLabel(publication),
    label: entryTitle(publication),
  }));

  const relatedTools = resolveRelatedRecords(
    initiative.related_tools,
    tools,
    "tools",
  ).map((tool) => ({
    description: entryDescription(tool),
    href: toolHref(tool),
    kind: "Tool",
    label: entryTitle(tool),
  }));

  const bylinesBySlug = bylineMap(bylines);
  const peopleByKey = new Map<string, InitiativeRelatedItem>();
  for (const person of relatedPeopleReferences(initiative.related_people)) {
    const slug = slugify(person.label);
    const byline = bylinesBySlug.get(slug);
    const key = slug || person.label;
    peopleByKey.set(key, {
      description: person.detail ?? "",
      href: byline ? entryBylineHref(byline) : undefined,
      kind: "Person",
      label: byline ? entryBylineName(byline) : person.label,
    });
  }

  return {
    articles,
    briefItems,
    people: [...peopleByKey.values()],
    publications: relatedPublications,
    tools: relatedTools,
  };
}

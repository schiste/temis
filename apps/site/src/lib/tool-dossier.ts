import {
  blogHref,
  entryBylineHref,
  entryBylineName,
  entryBylineSlug,
  entryDescription,
  entryExternalUrl,
  entryTitle,
  formatDateLabel,
  slugify,
  type BylineEntry,
  type PostEntry,
  type ToolEntry,
} from "./emdash";
import { relatedPeopleReferences, relatedRecordIds } from "./relations";

// Site-text labels consumed when assembling the tool dossier view-model.
// Declaring only the keys this builder reads keeps it decoupled from the full
// site-texts surface (any wider `copy` object is structurally assignable).
export interface ToolDossierCopy {
  toolDefaultBranchLabel: string;
  toolDocumentationLabel: string;
  toolEditorialConfidenceLabel: string;
  toolForksLabel: string;
  toolLanguageLabel: string;
  toolLastCommitLabel: string;
  toolLicenseLabel: string;
  toolMaintenanceLabel: string;
  toolOpenIssuesLabel: string;
  toolOpenToolLabel: string;
  toolPrivacyLabel: string;
  toolRepositoryLabel: string;
  toolStarsLabel: string;
  toolTechnicalMaturityLabel: string;
}

type ToolSignalItem = {
  detail?: string;
  href?: string;
  label: string;
  tone?: string;
  value: string;
};

function hostLabel(value: string | null | undefined) {
  if (!value) return "";

  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function numberLabel(value: number | null | undefined) {
  return typeof value === "number"
    ? new Intl.NumberFormat("en-US").format(value)
    : "";
}

function textField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function maintenanceSignal(
  date: Date | null,
  label: string | null | undefined,
) {
  if (!date || Number.isNaN(date.valueOf())) {
    return {
      detail: "No public commit signal",
      tone: "unknown",
      value: "Unknown",
    };
  }

  const days = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86_400_000),
  );
  if (days <= 30) {
    return {
      detail: label ? `Last commit ${label}` : "Recent commit",
      tone: "active",
      value: "Active",
    };
  }
  if (days <= 180) {
    return {
      detail: label ? `Last commit ${label}` : "Recent commit",
      tone: "recent",
      value: "Recent",
    };
  }
  if (days <= 365) {
    return {
      detail: label ? `Last commit ${label}` : "Older commit",
      tone: "quiet",
      value: "Quiet",
    };
  }

  return {
    detail: label ? `Last commit ${label}` : "Older commit",
    tone: "dormant",
    value: "Dormant",
  };
}

export function buildToolDossier(
  tool: ToolEntry,
  posts: PostEntry[],
  bylines: BylineEntry[],
  copy: ToolDossierCopy,
) {
  const title = entryTitle(tool);
  const toolUrl = entryExternalUrl(tool.tool_url);
  const repositoryUrl = entryExternalUrl(tool.repository_url);
  const documentationUrl = entryExternalUrl(tool.documentation_url);
  const license = tool.license?.trim();
  const privacyNote = tool.privacy_note?.trim();
  const technicalMaturity =
    tool.technical_maturity?.trim() || tool.maturity?.trim();
  const editorialConfidence = tool.editorial_confidence?.trim();
  const github = tool.github;
  const lastCommitDateTime = github?.lastCommitAt;
  const lastCommitDate = lastCommitDateTime
    ? new Date(lastCommitDateTime)
    : null;
  const lastCommitLabel = formatDateLabel(lastCommitDateTime);

  const screenshotUrl = textField(tool.screenshot_url);
  const screenshotAlt =
    textField(tool.screenshot_alt) || `Screenshot of the ${title} interface.`;
  const screenshotCaption = textField(tool.screenshot_caption);
  const screenshotLicense = textField(tool.screenshot_license);
  const maintenance = maintenanceSignal(lastCommitDate, lastCommitLabel);

  const importantLinks = [
    toolUrl
      ? {
          detail: hostLabel(toolUrl),
          href: toolUrl,
          label: copy.toolOpenToolLabel,
          variant: "primary",
        }
      : null,
    repositoryUrl
      ? {
          detail: github?.fullName ?? hostLabel(repositoryUrl),
          href: repositoryUrl,
          label: copy.toolRepositoryLabel,
          variant: "secondary",
        }
      : null,
    documentationUrl
      ? {
          detail: hostLabel(documentationUrl),
          href: documentationUrl,
          label: copy.toolDocumentationLabel,
          variant: "secondary",
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      detail: string;
      href: string;
      label: string;
      variant: "primary" | "secondary";
    } => Boolean(item),
  );
  const activityItemCandidates: (ToolSignalItem | null)[] = [
    {
      detail: maintenance.detail,
      label: copy.toolMaintenanceLabel,
      tone: maintenance.tone,
      value: maintenance.value,
    },
    github?.fullName
      ? {
          href: repositoryUrl ?? github.repositoryUrl,
          label: copy.toolRepositoryLabel,
          value: github.fullName,
        }
      : null,
    lastCommitLabel
      ? {
          href: github?.lastCommitUrl,
          label: copy.toolLastCommitLabel,
          value: lastCommitLabel,
        }
      : null,
    github?.defaultBranch
      ? {
          label: copy.toolDefaultBranchLabel,
          value: github.defaultBranch,
        }
      : null,
    github?.primaryLanguage
      ? {
          label: copy.toolLanguageLabel,
          value: github.primaryLanguage,
        }
      : null,
    numberLabel(github?.stars)
      ? {
          label: copy.toolStarsLabel,
          value: numberLabel(github?.stars),
        }
      : null,
    numberLabel(github?.forks)
      ? {
          label: copy.toolForksLabel,
          value: numberLabel(github?.forks),
        }
      : null,
    numberLabel(github?.openIssues)
      ? {
          label: copy.toolOpenIssuesLabel,
          value: numberLabel(github?.openIssues),
        }
      : null,
  ];
  const activityItems = activityItemCandidates.filter(
    (item): item is ToolSignalItem => Boolean(item),
  );
  const trustItems = [
    license
      ? {
          label: copy.toolLicenseLabel,
          value: license,
        }
      : null,
    privacyNote
      ? {
          label: copy.toolPrivacyLabel,
          value: privacyNote,
        }
      : null,
    technicalMaturity
      ? {
          label: copy.toolTechnicalMaturityLabel,
          value: technicalMaturity,
        }
      : null,
    editorialConfidence
      ? {
          label: copy.toolEditorialConfidenceLabel,
          value: editorialConfidence,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const relatedPostIds = new Set(relatedRecordIds(tool.related_articles));
  const relatedPosts = posts
    .filter((post) => post.id && relatedPostIds.has(post.id))
    .map((post) => ({
      description: entryDescription(post),
      href: blogHref(post),
      label: entryTitle(post),
    }));
  const bylineById = new Map(bylines.map((byline) => [byline.id, byline]));
  const bylineBySlug = new Map(
    bylines.map((byline) => [entryBylineSlug(byline), byline]),
  );
  const personReferences = relatedPeopleReferences(tool.related_people);
  const peopleByKey = new Map<
    string,
    { detail?: string; href?: string; label: string }
  >();
  const primaryByline = tool.primary_byline_id
    ? bylineById.get(tool.primary_byline_id)
    : null;

  if (primaryByline) {
    peopleByKey.set(entryBylineSlug(primaryByline), {
      detail: "Primary maintainer",
      href: entryBylineHref(primaryByline),
      label: entryBylineName(primaryByline),
    });
  }

  for (const person of personReferences) {
    const slug = slugify(person.label);
    const byline = bylineBySlug.get(slug);
    peopleByKey.set(slug || person.label, {
      detail: person.detail,
      href: byline ? entryBylineHref(byline) : undefined,
      label: byline ? entryBylineName(byline) : person.label,
    });
  }

  const peopleLinks = [...peopleByKey.values()];

  return {
    activityItems,
    importantLinks,
    peopleLinks,
    relatedPosts,
    screenshotAlt,
    screenshotCaption,
    screenshotLicense,
    screenshotUrl,
    trustItems,
  };
}

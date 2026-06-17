export interface GitHubRepositoryRef {
  owner: string;
  repo: string;
}

export interface ToolGithubData {
  defaultBranch?: string;
  description?: string;
  forks?: number;
  fullName: string;
  homepageUrl?: string;
  lastCommitAt?: string;
  lastCommitSha?: string;
  lastCommitUrl?: string;
  licenseName?: string;
  licenseSpdxId?: string;
  openIssues?: number;
  primaryLanguage?: string;
  pushedAt?: string;
  repositoryUrl: string;
  stars?: number;
  updatedAt?: string;
}

export interface ToolGithubDataOptions {
  disabled?: boolean;
  failOnError?: boolean;
  fetch?: typeof fetch;
  token?: string;
  userAgent?: string;
}

export interface GithubBackedTool {
  repository_url?: string | null;
}

export type GithubEnrichedTool<T extends GithubBackedTool> = T & {
  github?: ToolGithubData | null;
};

interface GitHubRepositoryResponse {
  default_branch?: unknown;
  description?: unknown;
  forks_count?: unknown;
  full_name?: unknown;
  homepage?: unknown;
  html_url?: unknown;
  language?: unknown;
  license?: {
    name?: unknown;
    spdx_id?: unknown;
  } | null;
  open_issues_count?: unknown;
  pushed_at?: unknown;
  stargazers_count?: unknown;
  updated_at?: unknown;
}

interface GitHubCommitResponse {
  commit?: {
    author?: {
      date?: unknown;
    };
    committer?: {
      date?: unknown;
    };
  };
  html_url?: unknown;
  sha?: unknown;
}

const repositoryCache = new Map<string, Promise<ToolGithubData | null>>();

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function cleanNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function parseGitHubRepositoryUrl(
  value: string | null | undefined,
): GitHubRepositoryRef | null {
  const rawValue = value?.trim();
  if (!rawValue) return null;

  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    return null;
  }

  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return null;
  }

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (!owner || !repo) return null;

  return { owner, repo };
}

function githubHeaders(token: string | undefined, userAgent: string) {
  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "User-Agent": userAgent,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchJson<T>(
  fetcher: typeof fetch,
  url: string,
  token: string | undefined,
  userAgent: string,
) {
  const response = await fetcher(url, {
    headers: githubHeaders(token, userAgent),
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${url}`);
  }
  return (await response.json()) as T;
}

async function fetchRepositoryData(
  repository: GitHubRepositoryRef,
  options: ToolGithubDataOptions,
) {
  const fetcher = options.fetch ?? fetch;
  const userAgent = options.userAgent ?? "temis-static-build";
  const encodedOwner = encodeURIComponent(repository.owner);
  const encodedRepo = encodeURIComponent(repository.repo);
  const apiBase = `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`;

  const repo = await fetchJson<GitHubRepositoryResponse>(
    fetcher,
    apiBase,
    options.token,
    userAgent,
  );
  const commits = await fetchJson<GitHubCommitResponse[]>(
    fetcher,
    `${apiBase}/commits?per_page=1`,
    options.token,
    userAgent,
  );
  const lastCommit = commits[0];

  return {
    defaultBranch: cleanString(repo.default_branch),
    description: cleanString(repo.description),
    forks: cleanNumber(repo.forks_count),
    fullName:
      cleanString(repo.full_name) ?? `${repository.owner}/${repository.repo}`,
    homepageUrl: cleanString(repo.homepage),
    lastCommitAt:
      cleanString(lastCommit?.commit?.committer?.date) ??
      cleanString(lastCommit?.commit?.author?.date),
    lastCommitSha: cleanString(lastCommit?.sha),
    lastCommitUrl: cleanString(lastCommit?.html_url),
    licenseName: cleanString(repo.license?.name),
    licenseSpdxId: cleanString(repo.license?.spdx_id),
    openIssues: cleanNumber(repo.open_issues_count),
    primaryLanguage: cleanString(repo.language),
    pushedAt: cleanString(repo.pushed_at),
    repositoryUrl:
      cleanString(repo.html_url) ??
      `https://github.com/${repository.owner}/${repository.repo}`,
    stars: cleanNumber(repo.stargazers_count),
    updatedAt: cleanString(repo.updated_at),
  } satisfies ToolGithubData;
}

export async function fetchToolGithubData(
  repositoryUrl: string | null | undefined,
  options: ToolGithubDataOptions = {},
) {
  if (options.disabled) return null;

  const repository = parseGitHubRepositoryUrl(repositoryUrl);
  if (!repository) return null;

  if (options.failOnError) {
    return fetchRepositoryData(repository, options);
  }

  const cacheKey = `${repository.owner}/${repository.repo}`.toLowerCase();
  if (!repositoryCache.has(cacheKey)) {
    repositoryCache.set(
      cacheKey,
      fetchRepositoryData(repository, options).catch(() => null),
    );
  }

  return repositoryCache.get(cacheKey)!;
}

export async function enrichToolsWithGithubData<T extends GithubBackedTool>(
  tools: T[],
  options: ToolGithubDataOptions = {},
): Promise<GithubEnrichedTool<T>[]> {
  return Promise.all(
    tools.map(async (tool) => ({
      ...tool,
      github: await fetchToolGithubData(tool.repository_url, options),
    })),
  );
}

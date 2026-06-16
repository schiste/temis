export type ContentQualitySeverity = "error" | "warning";

export interface ContentQualityIssue {
  code: string;
  field?: string;
  message: string;
  severity: ContentQualitySeverity;
}

export interface ContentQualityRelationshipState {
  authorLinked?: boolean;
  topicOrTagAssigned?: boolean;
}

export interface ContentQualityOptions {
  contentId?: string;
  collection: string;
  content: Record<string, unknown>;
  mode?: "draft" | "publish";
  relationships?: ContentQualityRelationshipState;
}

export interface ContentQualityResult {
  collection: string;
  contentId: string;
  contentType: string;
  errors: ContentQualityIssue[];
  issues: ContentQualityIssue[];
  warnings: ContentQualityIssue[];
}

export declare function assertContentQuality(
  options: ContentQualityOptions,
): ContentQualityResult;

export declare function formatContentQualityIssues(
  result: ContentQualityResult,
): string;

export declare function normalizeContentRecord(
  content: Record<string, unknown>,
): Record<string, unknown>;

export declare function validateContentQuality(
  options: ContentQualityOptions,
): ContentQualityResult;

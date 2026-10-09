export type RepoRef = { owner: string; repo: string; installationId: number };

export type Actor = { login: string; isBot: boolean };

export type Issue = {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  author: Actor;
  labels: string[];
};

export type Comment = { id: number; nodeId: string; body: string; author: Actor };

export type IssueSummary = { number: number; title: string; bodyExcerpt: string };

export type RepoContext = { description: string; readmeExcerpt: string };

export type RepoLabel = { name: string; description: string };

export type Permission = "admin" | "maintain" | "write" | "triage" | "read" | "none";

// LLM は該当する観点をすべて返し、優先順位の解決は core が行う
export type IssueAssessment = {
  suspicious: boolean;
  offTopic: boolean;
  duplicateOf: number | null;
  missing: string[];
  reason: string;
};

export type CommentAssessment = { suspicious: boolean; reason: string };

export type TriageResult = { labels: string[]; priority: string; reason: string };

export type Job =
  | { type: "issue"; action: "opened" | "edited"; repo: RepoRef; issueNumber: number }
  | { type: "comment"; repo: RepoRef; issueNumber: number; commentId: number };

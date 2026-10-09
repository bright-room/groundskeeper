import type { AppConfig } from "./config";
import type {
  Comment,
  CommentAssessment,
  Issue,
  IssueAssessment,
  IssueSummary,
  Job,
  Permission,
  RepoContext,
  RepoLabel,
  RepoRef,
  TriageResult,
} from "./model";

// 対象が存在しない場合、getIssue / getComment は NotFoundError を投げる
export interface GitHubPort {
  getIssue(repo: RepoRef, issueNumber: number): Promise<Issue>;
  getComment(repo: RepoRef, commentId: number): Promise<Comment>;
  listOpenIssues(repo: RepoRef): Promise<IssueSummary[]>;
  getRepoContext(repo: RepoRef): Promise<RepoContext>;
  listLabels(repo: RepoRef): Promise<RepoLabel[]>;
  createLabel(repo: RepoRef, label: { name: string; color: string; description: string }): Promise<void>;
  addLabels(repo: RepoRef, issueNumber: number, labels: string[]): Promise<void>;
  removeLabel(repo: RepoRef, issueNumber: number, label: string): Promise<void>;
  createComment(repo: RepoRef, issueNumber: number, body: string): Promise<void>;
  minimizeComment(repo: RepoRef, commentNodeId: string): Promise<void>;
  getPermission(repo: RepoRef, login: string): Promise<Permission>;
}

export interface LLMPort {
  assessIssue(input: {
    model: string;
    issue: Issue;
    openIssues: IssueSummary[];
    repoContext: RepoContext;
  }): Promise<IssueAssessment>;
  assessComment(input: { model: string; issue: Issue; comment: Comment }): Promise<CommentAssessment>;
  triageIssue(input: {
    model: string;
    issue: Issue;
    labels: RepoLabel[];
    priorities: string[];
  }): Promise<TriageResult>;
}

export interface ConfigPort {
  load(repo: RepoRef): Promise<AppConfig>;
}

export interface JobQueue {
  enqueue(job: Job): Promise<void>;
}

export type Deps = { github: GitHubPort; llm: LLMPort; config: ConfigPort };

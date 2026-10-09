import {
  type Actor,
  type Comment,
  type GitHubPort,
  type Issue,
  type IssueSummary,
  NotFoundError,
  type Permission,
  type RepoContext,
  type RepoLabel,
  type RepoRef,
} from "@groundskeeper/core";
import { type InstallationClients, isStatus } from "./installation-clients";

const ISSUE_EXCERPT_LENGTH = 300;
const README_EXCERPT_LENGTH = 2000;
const PERMISSIONS: Permission[] = ["admin", "maintain", "write", "triage", "read", "none"];

export class GitHubAdapter implements GitHubPort {
  constructor(private readonly clients: InstallationClients) {}

  async getIssue(r: RepoRef, issueNumber: number): Promise<Issue> {
    const { octokit, owner, repo } = this.ctx(r);
    const { data } = await orNotFound(`issue #${issueNumber}`, () =>
      octokit.rest.issues.get({ owner, repo, issue_number: issueNumber }),
    );
    return {
      number: data.number,
      title: data.title,
      body: data.body ?? "",
      state: data.state === "closed" ? "closed" : "open",
      author: toActor(data.user),
      labels: data.labels
        .map((l) => (typeof l === "string" ? l : (l.name ?? "")))
        .filter((l) => l !== ""),
    };
  }

  async getComment(r: RepoRef, commentId: number): Promise<Comment> {
    const { octokit, owner, repo } = this.ctx(r);
    const { data } = await orNotFound(`comment ${commentId}`, () =>
      octokit.rest.issues.getComment({ owner, repo, comment_id: commentId }),
    );
    return { id: data.id, nodeId: data.node_id, body: data.body ?? "", author: toActor(data.user) };
  }

  async listOpenIssues(r: RepoRef): Promise<IssueSummary[]> {
    const { octokit, owner, repo } = this.ctx(r);
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    return data
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        bodyExcerpt: (i.body ?? "").slice(0, ISSUE_EXCERPT_LENGTH),
      }));
  }

  async getRepoContext(r: RepoRef): Promise<RepoContext> {
    const { octokit, owner, repo } = this.ctx(r);
    const { data } = await octokit.rest.repos.get({ owner, repo });
    let readme = "";
    try {
      const res = await octokit.rest.repos.getReadme({ owner, repo, mediaType: { format: "raw" } });
      readme = String(res.data);
    } catch (e) {
      if (!isStatus(e, 404)) throw e;
    }
    return {
      description: data.description ?? "",
      readmeExcerpt: readme.slice(0, README_EXCERPT_LENGTH),
    };
  }

  async listLabels(r: RepoRef): Promise<RepoLabel[]> {
    const { octokit, owner, repo } = this.ctx(r);
    const labels = await octokit.paginate(octokit.rest.issues.listLabelsForRepo, {
      owner,
      repo,
      per_page: 100,
    });
    return labels.map((l) => ({ name: l.name, description: l.description ?? "" }));
  }

  async createLabel(
    r: RepoRef,
    label: { name: string; color: string; description: string },
  ): Promise<void> {
    const { octokit, owner, repo } = this.ctx(r);
    await octokit.rest.issues.createLabel({ owner, repo, ...label });
  }

  async addLabels(r: RepoRef, issueNumber: number, labels: string[]): Promise<void> {
    const { octokit, owner, repo } = this.ctx(r);
    await octokit.rest.issues.addLabels({ owner, repo, issue_number: issueNumber, labels });
  }

  async removeLabel(r: RepoRef, issueNumber: number, name: string): Promise<void> {
    const { octokit, owner, repo } = this.ctx(r);
    try {
      await octokit.rest.issues.removeLabel({ owner, repo, issue_number: issueNumber, name });
    } catch (e) {
      // 既に外れている
      if (!isStatus(e, 404)) throw e;
    }
  }

  async createComment(r: RepoRef, issueNumber: number, body: string): Promise<void> {
    const { octokit, owner, repo } = this.ctx(r);
    await octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
  }

  async minimizeComment(r: RepoRef, commentNodeId: string): Promise<void> {
    const { octokit } = this.ctx(r);
    await octokit.graphql(
      `mutation($id: ID!) {
        minimizeComment(input: { subjectId: $id, classifier: SPAM }) { minimizedComment { isMinimized } }
      }`,
      { id: commentNodeId },
    );
  }

  async getPermission(r: RepoRef, login: string): Promise<Permission> {
    const { octokit, owner, repo } = this.ctx(r);
    try {
      const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
        owner,
        repo,
        username: login,
      });
      return toPermission(data.role_name);
    } catch (e) {
      if (isStatus(e, 404)) return "none";
      throw e;
    }
  }

  private ctx(r: RepoRef) {
    return { octokit: this.clients.for(r.installationId), owner: r.owner, repo: r.repo };
  }
}

async function orNotFound<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isStatus(e, 404) || isStatus(e, 410)) throw new NotFoundError(what);
    throw e;
  }
}

function toActor(user: { login: string; type: string } | null | undefined): Actor {
  return { login: user?.login ?? "ghost", isBot: user?.type === "Bot" };
}

// カスタムロール名など未知の値は権限なしとして扱う
function toPermission(role: string): Permission {
  return PERMISSIONS.find((p) => p === role) ?? "none";
}

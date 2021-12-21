import { Octokit } from '@octokit/action';

export interface GithubApi {
  getWorkflowId(
    runId: number,
    owner: string,
    repo: string,
    branch: string
  ): Promise<string>;

  getWorkflowRunCommitShas(
    workflowId: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<readonly string[]>;
}

export class GithubApiImpl implements GithubApi {
  private readonly octokit: Octokit;

  constructor() {
    this.octokit = new Octokit();
  }

  async getWorkflowId(
    runId: number,
    owner: string,
    repo: string,
    branch: string
  ): Promise<string> {
    const runResult = await this.octokit.request(
      `GET /repos/${owner}/${repo}/actions/runs/${runId}`,
      {
        owner,
        repo,
        branch,
        run_id: runId,
      }
    );

    return runResult.data.workflow_id;
  }

  async getWorkflowRunCommitShas(
    workflowId: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<readonly string[]> {
    // fetch all workflow runs on a given repo/branch/workflow with push and success
    const runsResult = await this.octokit.request(
      `GET /repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`,
      {
        owner,
        repo,
        branch,
        workflow_id: workflowId,
        event: 'push',
        status: 'success',
      }
    );

    const runs = runsResult.data.workflow_runs;
    return runs.map((r: { head_sha: string }) => r.head_sha);
  }
}

import * as core from '@actions/core';
import {
  executeCommandAndReturnSimpleValue,
  getCurrentBranchName,
  getGithubContext,
} from './utils';
import { Octokit } from '@octokit/action';
import type { ResultOrErrorMessage } from './types';
import { execSync } from 'child_process';
import { getProperBaseCommit } from './get-version-bump-commit-if-next';

// eslint-disable-next-line github/no-then
run().then();

async function run(): Promise<void> {
  const { runId, repo, owner } = getGithubContext();
  const mainBranchName: string = core.getInput('main-branch-name');
  const versionBumpCommitMessageSummaryMatcher: string = core.getInput(
    'version-bump-commit-message-summary-matcher'
  );

  const currentBranchNameResult = getCurrentBranchName(process.env.GITHUB_REF);

  if (currentBranchNameResult.errorMessage !== undefined) {
    core.setFailed(currentBranchNameResult.errorMessage);
    return;
  }

  const currentBranchName = currentBranchNameResult.value;

  const headSha = executeCommandAndReturnSimpleValue('git rev-parse HEAD');

  const baseShaResult = await findBaseSha(
    runId,
    owner,
    repo,
    mainBranchName,
    currentBranchName,
    versionBumpCommitMessageSummaryMatcher
  );

  if (baseShaResult.errorMessage !== undefined) {
    core.setFailed(baseShaResult.errorMessage);
    return;
  }

  const baseSha = baseShaResult.value;

  core.setOutput('base', baseSha);
  core.setOutput('head', headSha);
}

async function findBaseSha(
  runId: number,
  owner: string,
  repo: string,
  mainBranchName: string,
  currentBranchName: string,
  versionBumpCommitMessageSummaryMatcher: string
): Promise<ResultOrErrorMessage<string>> {
  const isCurrentBranchMain = currentBranchName === mainBranchName;
  if (isCurrentBranchMain) {
    return findBaseShaForMainBranch(runId, owner, repo, mainBranchName);
  } else {
    const sha = executeCommandAndReturnSimpleValue(
      `git merge-base origin/${mainBranchName} HEAD`
    );
    const properSha = await getProperBaseCommit(
      sha,
      versionBumpCommitMessageSummaryMatcher
    );
    return {
      value: properSha,
    };
  }
}

async function findBaseShaForMainBranch(
  runId: number,
  owner: string,
  repo: string,
  mainBranchName: string
): Promise<ResultOrErrorMessage<string>> {
  const lastSuccessfulCommitResult = await findLastSuccessfulCommitSha(
    runId,
    owner,
    repo,
    mainBranchName
  );

  if (lastSuccessfulCommitResult.errorMessage !== undefined) {
    return lastSuccessfulCommitResult;
  }

  const sha = lastSuccessfulCommitResult.value;
  if (sha) {
    return { value: sha };
  } else {
    core.warning(
      `WARNING: Unable to find a successful workflow run on 'origin/${mainBranchName}'`
    );
    core.warning(
      `We are therefore defaulting to use HEAD~1 on 'origin/${mainBranchName}'`
    );

    const previousCommit = executeCommandAndReturnSimpleValue(
      'git rev-parse HEAD~1'
    );
    return { value: previousCommit };
  }
}

async function findLastSuccessfulCommitSha(
  runId: number,
  owner: string,
  repo: string,
  branch: string
): Promise<ResultOrErrorMessage<string | undefined>> {
  try {
    const sha = await findSuccessfulCommit(
      undefined,
      runId,
      owner,
      repo,
      branch
    );

    return { value: sha };
  } catch (error) {
    core.error(error as Error);
    const errorMessage: string =
      error instanceof Error ? error.message : `Unknown error`;
    return {
      errorMessage,
    };
  }
}

async function findSuccessfulCommit(
  workflowId: string | undefined,
  runId: number,
  owner: string,
  repo: string,
  branch: string
): Promise<string | undefined> {
  const octokit = new Octokit();
  const finalWorkflowId = await getWorkflowId(
    octokit,
    workflowId,
    runId,
    owner,
    repo,
    branch
  );

  core.debug(`Workflow Id: ${finalWorkflowId}`);

  // fetch all workflow runs on a given repo/branch/workflow with push and success
  const runsResult = await octokit.request(
    `GET /repos/${owner}/${repo}/actions/workflows/${finalWorkflowId}/runs`,
    {
      owner,
      repo,
      branch,
      workflow_id: finalWorkflowId,
      event: 'push',
      status: 'success',
    }
  );

  core.debug('Runs result:');
  core.debug(JSON.stringify(runsResult));

  const runs = runsResult.data.workflow_runs;
  const shas = runs.map((r: { head_sha: string }) => r.head_sha);

  return await findExistingCommit(shas);
}

async function getWorkflowId(
  octokit: Octokit,
  workflowId: string | undefined,
  runId: number,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  if (workflowId) {
    return workflowId;
  }

  const runResult = await octokit.request(
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

async function findExistingCommit(
  shas: readonly string[]
): Promise<string | undefined> {
  for (const commitSha of shas) {
    if (await commitExists(commitSha)) {
      return commitSha;
    }
  }
  return undefined;
}

async function commitExists(commitSha: string): Promise<boolean> {
  try {
    execSync(`git cat-file -e ${commitSha} 2> /dev/null`);
    return true;
  } catch {
    return false;
  }
}

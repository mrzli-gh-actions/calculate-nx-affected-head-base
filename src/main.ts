import { GitApiImpl } from './infrastructure/git-api';
import { GithubActionsApiImpl } from './infrastructure/github-actions-api';
import { GithubApiImpl } from './infrastructure/github-api';
import type { Infrastructure } from './infrastructure/infrastructure';
import { LoggerImpl } from './infrastructure/logger';
import type { ResultOrErrorMessage } from './types/types';
import { getCurrentBranchName } from './utils/get-current-branch-name';
import { getProperBaseCommit } from './utils/get-proper-base-commit';

const INFRASTRUCTURE: Infrastructure = {
  logger: new LoggerImpl(),
  githubActionsApi: new GithubActionsApiImpl(),
  githubApi: new GithubApiImpl(),
  gitApi: new GitApiImpl(),
};

// eslint-disable-next-line github/no-then
run(INFRASTRUCTURE).then();

async function run(infrastructure: Infrastructure): Promise<void> {
  const { runId, repo, owner } =
    infrastructure.githubActionsApi.getGithubContext();
  const { mainBranchName, versionBumpCommitMessageSummaryMatcher } =
    infrastructure.githubActionsApi.getInputs();

  infrastructure.logger.debug('Input parameters:');
  infrastructure.logger.debug(
    JSON.stringify({
      'main-branch-name': mainBranchName,
      'version-bump-commit-message-summary-matcher':
        versionBumpCommitMessageSummaryMatcher,
    })
  );

  const currentBranchRef = process.env.GITHUB_REF;
  infrastructure.logger.debug(`Current branch ref: ${currentBranchRef}`);
  const currentBranchNameResult = getCurrentBranchName(currentBranchRef);

  if (currentBranchNameResult.errorMessage !== undefined) {
    infrastructure.githubActionsApi.setFailed(
      currentBranchNameResult.errorMessage
    );
    return;
  }

  const currentBranchName = currentBranchNameResult.value;

  const headSha = await infrastructure.gitApi.getHeadCommitSha();

  const baseShaResult = await findBaseSha(
    infrastructure,
    runId,
    owner,
    repo,
    mainBranchName,
    currentBranchName,
    versionBumpCommitMessageSummaryMatcher
  );

  if (baseShaResult.errorMessage !== undefined) {
    infrastructure.githubActionsApi.setFailed(baseShaResult.errorMessage);
    return;
  }

  const baseSha = baseShaResult.value;

  infrastructure.logger.debug('Output parameters:');
  infrastructure.logger.debug(JSON.stringify({ base: baseSha, head: headSha }));

  infrastructure.githubActionsApi.setOutputs({
    base: baseSha,
    head: headSha,
  });
}

async function findBaseSha(
  infrastructure: Infrastructure,
  runId: number,
  owner: string,
  repo: string,
  mainBranchName: string,
  currentBranchName: string,
  versionBumpCommitMessageSummaryMatcher: string
): Promise<ResultOrErrorMessage<string>> {
  const isCurrentBranchMain = currentBranchName === mainBranchName;
  if (isCurrentBranchMain) {
    return findBaseShaForMainBranch(
      infrastructure,
      runId,
      owner,
      repo,
      mainBranchName,
      versionBumpCommitMessageSummaryMatcher
    );
  } else {
    const sha =
      await infrastructure.gitApi.getHeadToMainBranchCommonAncestorSha(
        mainBranchName
      );
    infrastructure.logger.debug(`Currently not on ${mainBranchName} branch.`);
    infrastructure.logger.debug(
      `Base sha set to sha where this feature branch was branched from ${mainBranchName}. SHA: ${sha}`
    );
    return {
      value: sha,
    };
  }
}

async function findBaseShaForMainBranch(
  infrastructure: Infrastructure,
  runId: number,
  owner: string,
  repo: string,
  mainBranchName: string,
  versionBumpCommitMessageSummaryMatcher: string
): Promise<ResultOrErrorMessage<string>> {
  infrastructure.logger.debug(`Currently on ${mainBranchName} branch.`);

  const lastSuccessfulCommitResult = await findLastSuccessfulCommitSha(
    infrastructure,
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
    infrastructure.logger.debug(
      `Last commit for which this workflow was successfully run found with SHA: ${sha}`
    );
    const properSha = await getProperBaseCommit(
      infrastructure,
      sha,
      versionBumpCommitMessageSummaryMatcher
    );
    infrastructure.logger.debug(
      `Actual base commit to be used for 'nx affected' will be: ${properSha}`
    );

    return { value: properSha };
  } else {
    infrastructure.logger.warning(
      `WARNING: Unable to find a successful workflow run on 'origin/${mainBranchName}'`
    );
    infrastructure.logger.warning(
      `We are therefore defaulting to use HEAD~1 on 'origin/${mainBranchName}'`
    );

    const previousCommit =
      await infrastructure.gitApi.getHeadPreviousCommitSha();
    return { value: previousCommit };
  }
}

async function findLastSuccessfulCommitSha(
  infrastructure: Infrastructure,
  runId: number,
  owner: string,
  repo: string,
  branch: string
): Promise<ResultOrErrorMessage<string | undefined>> {
  try {
    const sha = await findSuccessfulCommit(
      infrastructure,
      runId,
      owner,
      repo,
      branch
    );

    return { value: sha };
  } catch (error) {
    infrastructure.logger.error(error as Error);
    const errorMessage: string =
      error instanceof Error ? error.message : `Unknown error`;
    return {
      errorMessage,
    };
  }
}

async function findSuccessfulCommit(
  infrastructure: Infrastructure,
  runId: number,
  owner: string,
  repo: string,
  branch: string
): Promise<string | undefined> {
  const finalWorkflowId = await infrastructure.githubApi.getWorkflowId(
    runId,
    owner,
    repo,
    branch
  );

  infrastructure.logger.debug(`Workflow Id: ${finalWorkflowId}`);

  const workflowRunShas =
    await infrastructure.githubApi.getWorkflowRunCommitShas(
      finalWorkflowId,
      owner,
      repo,
      branch
    );

  return await findExistingCommit(infrastructure, workflowRunShas);
}

async function findExistingCommit(
  infrastructure: Infrastructure,
  shas: readonly string[]
): Promise<string | undefined> {
  for (const commitSha of shas) {
    if (await infrastructure.gitApi.commitExists(commitSha)) {
      return commitSha;
    }
  }
  return undefined;
}

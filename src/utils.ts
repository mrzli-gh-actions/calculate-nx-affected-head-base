import * as github from '@actions/github';
import type { GithubContext, ResultOrErrorMessage } from './types';
import { execSync } from 'child_process';

export function getGithubContext(): GithubContext {
  const {
    runId,
    repo: { repo, owner },
  } = github.context;

  return {
    runId,
    repo,
    owner,
  };
}

const REF_TO_BRANCH_NAME_REGEX = /^refs\/heads\/(.+)$/;

export function getCurrentBranchName(
  currentBranchRef: string | undefined
): ResultOrErrorMessage<string> {
  if (!currentBranchRef) {
    return {
      errorMessage:
        "Missing current branch ref (should be present in 'env.GITHUB_REF')",
    };
  }

  const match = currentBranchRef.match(REF_TO_BRANCH_NAME_REGEX);
  if (!match || !Array.isArray(match) || !match[1]) {
    return {
      errorMessage: `Invalid current branch ref format: ${currentBranchRef}`,
    };
  }

  return {
    value: match[1],
  };
}

export function executeCommandAndReturnSimpleValue(command: string): string {
  return execSync(command, { encoding: 'utf-8' }).trim();
}

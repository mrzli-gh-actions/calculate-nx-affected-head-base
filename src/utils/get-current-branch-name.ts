import type { ResultOrErrorMessage } from '../types/types';

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

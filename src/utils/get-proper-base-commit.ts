import type { Infrastructure } from '../infrastructure/infrastructure';

export async function getProperBaseCommit(
  infrastructure: Infrastructure,
  sha: string,
  versionBumpSummaryMatcher: string
): Promise<string> {
  const earliestChildSha =
    await infrastructure.gitApi.getEarliestChildShaOfCommit(sha);
  if (!earliestChildSha) {
    infrastructure.logger.debug(
      `Failed to find a child for commit ${sha}, for which this workflow was last successfully run.`
    );
    return sha;
  }

  infrastructure.logger.debug(
    `Found a child for commit ${sha}, for which this workflow was last successfully run. Child commit SHA: ${earliestChildSha}`
  );

  const isCommitVersionBump = await infrastructure.gitApi.isCommitSummaryMatch(
    earliestChildSha,
    versionBumpSummaryMatcher
  );

  if (isCommitVersionBump) {
    infrastructure.logger.debug(
      `Commit ${earliestChildSha} is a version bump commit. It will therefore be set as a base commit for 'nx affected' comparison.`
    );
    return earliestChildSha;
  } else {
    infrastructure.logger.debug(
      `Commit ${earliestChildSha} is a not version bump commit. It will therefore not be set as a base commit for 'nx affected' comparison. RegExp used for matching version bump commit is '${versionBumpSummaryMatcher}'`
    );
    return sha;
  }
}

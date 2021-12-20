import { executeCommandAndReturnSimpleValue } from './utils';

export async function getProperBaseCommit(
  sha: string,
  versionBumpSummaryMatcher: string
): Promise<string> {
  const earliestChildSha = await getEarliestChildOfCommit(sha);
  if (!earliestChildSha) {
    return sha;
  }

  const isCommitVersionBump = await isVersionBumpCommit(
    earliestChildSha,
    versionBumpSummaryMatcher
  );

  return isCommitVersionBump ? earliestChildSha : sha;
}

export async function getEarliestChildOfCommit(
  sha: string
): Promise<string | undefined> {
  // rev-list
  // - --reverse - list from oldest to the newest
  // - HEAD      - list commits reachable from HEAD
  // - ^${sha}   - exclude all commits reachable from 'baseSha' (baseSha is also excluded)
  // --------------------
  // the above will list all the commits between HEAD (inclusive) and 'baseSha' (exclusive)
  // since the order is reverse
  const revParseResult = executeCommandAndReturnSimpleValue(
    `git rev-list --reverse --parents HEAD ^${sha}`
  );
  const lines = revParseResult.split('\n');
  for (const line of lines) {
    const [child, ...parents] = line.split(' ');
    if (parents.some((p) => p === sha)) {
      return child;
    }
  }
  return undefined;
}

export async function isVersionBumpCommit(
  sha: string,
  versionBumpSummaryMatcher: string
): Promise<boolean> {
  // get first line (subject) of the commit message for specified sha
  const summary = executeCommandAndReturnSimpleValue(
    `git log --format=%s --max-count=1 ${sha} | cat`
  );

  return !!summary.match(versionBumpSummaryMatcher);
}

import { execSync } from 'child_process';

export interface GitApi {
  getHeadCommitSha(): Promise<string>;

  getHeadPreviousCommitSha(): Promise<string>;

  getHeadToMainBranchCommonAncestorSha(mainBranchName: string): Promise<string>;

  getEarliestChildShaOfCommit(parentSha: string): Promise<string | undefined>;

  isCommitSummaryMatch(sha: string, summaryMatcher: string): Promise<boolean>;

  commitExists(sha: string): Promise<boolean>;
}

export class GitApiImpl implements GitApi {
  async getHeadCommitSha(): Promise<string> {
    return executeCommandAndReturnSimpleValue('git rev-parse HEAD');
  }

  async getHeadPreviousCommitSha(): Promise<string> {
    return executeCommandAndReturnSimpleValue('git rev-parse HEAD~1');
  }

  async getHeadToMainBranchCommonAncestorSha(
    mainBranchName: string
  ): Promise<string> {
    return executeCommandAndReturnSimpleValue(
      `git merge-base origin/${mainBranchName} HEAD`
    );
  }

  async getEarliestChildShaOfCommit(
    parentSha: string
  ): Promise<string | undefined> {
    // rev-list
    // - --reverse     - list from oldest to the newest
    // - HEAD          - list commits reachable from HEAD
    // - ^${parentSha} - exclude all commits reachable from 'baseSha' (baseSha is also excluded)
    // --------------------
    // the above will list all the commits between HEAD (inclusive) and 'baseSha' (exclusive)
    // since the order is reverse
    const revParseResult = executeCommandAndReturnSimpleValue(
      `git rev-list --reverse --parents HEAD ^${parentSha}`
    );
    const lines = revParseResult.split('\n');
    for (const line of lines) {
      const [child, ...parents] = line.split(' ');
      if (parents.some((p) => p === parentSha)) {
        return child;
      }
    }
    return undefined;
  }

  async isCommitSummaryMatch(
    sha: string,
    summaryMatcher: string
  ): Promise<boolean> {
    // get first line (subject) of the commit message for specified sha
    const summary = executeCommandAndReturnSimpleValue(
      `git log --format=%s --max-count=1 ${sha} | cat`
    );

    return !!summary.match(summaryMatcher);
  }

  async commitExists(sha: string): Promise<boolean> {
    try {
      execSync(`git cat-file -e ${sha} 2> /dev/null`);
      return true;
    } catch {
      return false;
    }
  }
}

function executeCommandAndReturnSimpleValue(command: string): string {
  return execSync(command, { encoding: 'utf-8' }).trim();
}

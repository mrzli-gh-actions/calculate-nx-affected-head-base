import * as core from '@actions/core';
import * as github from '@actions/github';

export interface GithubActionsApi {
  getGithubContext(): GithubActionContext;

  getInputs(): GithubActionInputs;

  setOutputs(outputs: GithubActionOutputs): void;

  setFailed(message: string): void;
}

export interface GithubActionContext {
  readonly runId: number;
  readonly repo: string;
  readonly owner: string;
}

export interface GithubActionInputs {
  readonly mainBranchName: string;
  readonly versionBumpCommitMessageSummaryMatcher: string;
}

export interface GithubActionOutputs {
  readonly base: string;
  readonly head: string;
}

export class GithubActionsApiImpl implements GithubActionsApi {
  getGithubContext(): GithubActionContext {
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

  getInputs(): GithubActionInputs {
    const mainBranchName: string = core.getInput('main-branch-name');
    const versionBumpCommitMessageSummaryMatcher: string = core.getInput(
      'version-bump-commit-message-summary-matcher'
    );

    return {
      mainBranchName,
      versionBumpCommitMessageSummaryMatcher,
    };
  }

  setOutputs(outputs: GithubActionOutputs): void {
    const keys = Object.keys(outputs) as readonly (keyof GithubActionOutputs)[];
    for (const key of keys) {
      core.setOutput(key, outputs[key]);
    }
  }

  setFailed(message: string): void {
    core.setFailed(message);
  }
}

import type { GitApi } from './git-api';
import type { GithubActionsApi } from './github-actions-api';
import type { GithubApi } from './github-api';
import type { Logger } from './logger';

export interface Infrastructure {
  readonly logger: Logger;
  readonly githubActionsApi: GithubActionsApi;
  readonly githubApi: GithubApi;
  readonly gitApi: GitApi;
}

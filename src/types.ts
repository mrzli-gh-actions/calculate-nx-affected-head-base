import type { RequireExactlyOne } from 'type-fest';

export interface GithubContext {
  readonly runId: number;
  readonly repo: string;
  readonly owner: string;
}

export type ResultOrErrorMessage<T> = RequireExactlyOne<{
  readonly value: T;
  readonly errorMessage: string;
}>;

import type { RequireExactlyOne } from 'type-fest';

export type ResultOrErrorMessage<T> = RequireExactlyOne<{
  readonly value: T;
  readonly errorMessage: string;
}>;

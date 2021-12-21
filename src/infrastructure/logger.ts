import * as core from '@actions/core';

export interface Logger {
  debug(message: string): void;

  warning(message: string | Error): void;

  error(message: string | Error): void;
}

export class LoggerImpl implements Logger {
  debug(message: string): void {
    core.debug(message);
  }

  warning(message: string | Error): void {
    core.warning(message);
  }

  error(message: string | Error): void {
    core.error(message);
  }
}

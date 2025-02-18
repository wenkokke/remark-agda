import type { SyncOptions } from "execa";

export interface AgdaParameters {
  htmlDir?: string;
  flags?: string[];
  execaOptions?: SyncOptions;
}

declare module "remark-agda" {
  import type { SyncOptions } from "execa";
  import type { Root } from "mdast";
  import type { Processor, Transformer } from "unified";

  export type AgdaParameters = {
    htmlDir?: string;
    flags?: string[];
    execaOptions?: SyncOptions;
  };

  export default function remarkAgda(
    this: Processor<Root, undefined, undefined, Root, string>,
    parameters: AgdaParameters
  ): Transformer<Root, Root>;
}

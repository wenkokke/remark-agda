declare module "remark-agda" {
  import type { SyncOptions } from "execa";
  import type { Root } from "mdast";
  import type { Plugin } from "unified";

  export type AgdaParameters = {
    htmlDir?: string;
    args?: string[];
    options?: SyncOptions;
  };

  const remarkAgda: Plugin<[AgdaParameters], Root>;
  export default remarkAgda;
}

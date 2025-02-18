/**
 * @import { SyncOptions } from 'execa'
 * @import { Root } from 'mdast'
 * @import { Processor , Transformer} from 'unified'
 * @import { VFile } from 'vfile'
 * @typedef { {htmlDir?: string; args?: string[]; options?: SyncOptions} } AgdaParameters
 */

import { execa } from "execa";
import * as fs from "fs/promises";
import { map } from "unist-util-map";
import * as assert from "assert";
import { selectAll } from "unist-util-select";
import rehypeParse from "rehype-parse";
import * as path from "path";
import { unified } from "unified";

/**
 * @this {Processor<Root, undefined, undefined, Root, string>}
 * @param {AgdaParameters} parameters
 * @returns {Transformer<Root, Root>}
 */
export default function remarkAgda(parameters) {
  const _remark = this;
  const _rehype = unified().use(rehypeParse, { fragment: true });

  /**
   * @param {Root} tree
   * @param {VFile} vfile
   * @return {Root}
   */
  return async function (tree, vfile) {
    // Find the number of code blocks:
    const codeBlocks = selectAll("code[lang=agda]", tree);
    // Find the source file:
    const sourceFile = vfile.path;
    // Assert that the source file contains the same code blocks:
    const sourceData = await fs.readFile(sourceFile, "utf-8");
    const sourceTree = _remark.parse(sourceData);
    const sourceCodeBlocks = selectAll("code[lang=agda]", sourceTree);
    assert.deepStrictEqual(
      codeBlocks.map((node) => node?.value),
      sourceCodeBlocks.map((node) => node?.value)
    );
    // If the source file is a .lagda.md file...
    if (sourceFile.endsWith(".lagda.md")) {
      // ...compile the source file with Agda:
      const defaultHtmlDir = "html";
      const { htmlDir, args, options } = parameters ?? {};
      await execa(
        "agda",
        [
          "--html",
          `--html-dir=${htmlDir ?? defaultHtmlDir}`,
          "--html-highlight=code",
          ...(args ?? []),
          sourceFile,
        ],
        options
      );
      // ...parse the highlighted Agda file:
      const sourceFileName = path.basename(sourceFile, ".lagda.md") + ".md";
      const highlightedSourceFile = path.join(
        htmlDir ?? defaultHtmlDir,
        sourceFileName
      );
      const highlightedSourceData = await fs.readFile(
        highlightedSourceFile,
        "utf-8"
      );
      const highlightedSourceTree = _remark.parse(highlightedSourceData);
      // ...extract the highlighted Agda code blocks from the highlighted file:
      const highlightedCodeBlocks = selectAll(
        "html",
        highlightedSourceTree
      ).filter(
        // TODO: modify 'href' attributes to (1) redirect references to local
        //       files to the appropriate route, and (2) redirect references
        //       to the standard library to the appropriate online reference
        (htmlNode) => {
          const root = _rehype.parse(htmlNode.value);
          const pre = root?.children?.at(0);
          const preProperties = pre?.properties?.className;
          return (
            pre?.type === "element" &&
            pre?.tagName === "pre" &&
            Array.isArray(preProperties) &&
            preProperties?.includes("Agda")
          );
        }
      );
      // Assert there are the expected number of highlighted code blocks:
      assert.deepStrictEqual(codeBlocks.length, highlightedCodeBlocks.length);
      // Replace the code blocks in the tree with the highlighted code blocks:
      const highlightedTree = map(tree, (node) => {
        if (node.type === "code" && node.lang === "agda") {
          const nodeIndex = codeBlocks.findIndex((codeBlock) =>
            Object.is(codeBlock, node)
          );
          assert.notEqual(nodeIndex, -1);
          return highlightedCodeBlocks[nodeIndex];
        } else {
          return node;
        }
      });
      // Update the basename to drop the 'lagda' extension:
      vfile.basename = path.basename(vfile.basename, ".lagda.md") + ".md";
      return highlightedTree;
    }
    return;
  };
}

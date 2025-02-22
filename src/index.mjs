/**
 * @import { SyncOptions } from 'execa'
 * @import { Root } from 'mdast'
 * @import { Processor , Transformer} from 'unified'
 * @import { VFile } from 'vfile'
 * @typedef { {agdaStdlibBaseUrl?: string; agdaClassesToTextMateScopes?: Partial<Record<string, string[]>>; htmlDir?: string; args?: string[]; options?: SyncOptions} } AgdaParameters
 */

import { execa } from "execa";
import * as fs from "fs/promises";
import { map } from "unist-util-map";
import * as assert from "assert";
import { selectAll } from "unist-util-select";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import * as path from "path";
import { unified } from "unified";
import shikify from "./shiki/shikify.mjs";
import findShikiConfig from "./shiki/findShikiConfig.mjs";
import loadShikiThemes from "./shiki/loadShikiThemes.mjs";

/**
 * @this {Processor<Root, undefined, undefined, Root, string>}
 * @param {AgdaParameters} parameters
 * @returns {Transformer<Root, Root>}
 */
export default function remarkAgda(parameters) {
  const _remark = this;
  const _rehypeParse = unified().use(rehypeParse, { fragment: true });
  const _rehypeStringify = unified().use(rehypeStringify, { fragment: true });
  const _agdaPrimModuleUrlPathRegExp = createAgdaPrimModuleUrlPathRegExp();
  const _shikiThemes = loadShikiThemes(findShikiConfig.bind(this)());

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
      // ...find the Agda module name:
      const moduleName = findAgdaModuleName(sourceCodeBlocks);
      // ...parse the highlighted Agda file:
      const highlightedSourceFile = path.join(
        htmlDir ?? defaultHtmlDir,
        moduleName + ".md"
      );
      const highlightedSourceData = await fs.readFile(
        highlightedSourceFile,
        "utf-8"
      );
      const highlightedSourceTree = _remark.parse(highlightedSourceData);
      // ...await the loading Shiki themes:
      const shikiThemes = await _shikiThemes;
      // ...find the regular expression that matches all links to primitive modules:
      const agdaPrimModuleUrlPathRegExp = await _agdaPrimModuleUrlPathRegExp;
      const agdaThisModuleUrlPathRegExp = new RegExp(`^${moduleName}\\.html`);
      // ...extract all HTML blocks from the highlighted file:
      const highlightedCodeBlocks = selectAll("html", highlightedSourceTree)
        .map(
          // ...parse the HTML content of the HTML blocks:
          (root) => _rehypeParse.parse(root.value)
        )
        .filter(
          // ...filter the HTML nodes by those that correspond to the highlighted Agda code blocks:
          (root) => {
            const preNode = root?.children?.at(0);
            const preNodeProperties = preNode?.properties?.className;
            return (
              preNode?.type === "element" &&
              preNode?.tagName === "pre" &&
              Array.isArray(preNodeProperties) &&
              preNodeProperties?.includes("Agda")
            );
          }
        )
        .map((root) =>
          // ...redirect links to Agda modules:
          map(root, (node) => {
            const nodeHref = node?.properties?.href;
            if (
              node?.type === "element" &&
              node?.tagName === "a" &&
              typeof nodeHref === "string"
            ) {
              try {
                // ...redirect links to the Agda primitive modules:
                if (nodeHref.match(agdaPrimModuleUrlPathRegExp)) {
                  node.properties.href = new URL(
                    nodeHref,
                    parameters.agdaStdlibBaseUrl
                  ).href;
                }
                // ...redirect links to THIS module:
                if (nodeHref.match(agdaThisModuleUrlPathRegExp)) {
                  node.properties.href = nodeHref.replace(
                    agdaThisModuleUrlPathRegExp,
                    ""
                  );
                }
              } catch (e) {}
            }
            return node;
          })
        )
        .map((root) =>
          // ...change highlighting classes to match Shiki:
          shikify(root, shikiThemes, parameters.agdaClassesToTextMateScopes)
        )
        .map(
          // ...stringify the highlighted Agda code blocks:
          (root) => ({ type: "html", value: _rehypeStringify.stringify(root) })
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
      return highlightedTree;
    }
    return;
  };
}

/**
 * Find the name of an Agda module from its code blocks.
 *
 * @param {Node[]} codeBlocks
 * @returns {string | null}
 */
function findAgdaModuleName(codeBlocks) {
  for (const codeBlock of codeBlocks) {
    if (
      codeBlock?.type === "code" &&
      codeBlock?.lang === "agda" &&
      typeof codeBlock?.value === "string"
    ) {
      const match = codeBlock.value.match(
        /^module\s+(?<moduleName>\S+)\s+(\S+\s+)*where/
      );
      const moduleName = match?.groups?.moduleName;
      if (typeof moduleName === "string") {
        return moduleName;
      }
    }
  }
  return null;
}

/**
 * Create a regular expression that matches links to Agda primitive modules.
 *
 * @returns {RegExp}
 */
async function createAgdaPrimModuleUrlPathRegExp() {
  // Find the directory that contains the primitive modules:
  const result = await execa("agda", ["--print-agda-data-dir"]);
  const dataDir = result.stdout.trim();
  const primDir = path.join(dataDir, "lib", "prim");
  const primFiles = await fs.readdir(primDir, { recursive: true });
  const primModuleNames = primFiles.flatMap((primFile) => {
    if (typeof primFile === "string" && primFile.endsWith(".agda")) {
      return [
        primFile
          .replace(/\.agda$/, "")
          .split("/")
          .join("\\."),
      ];
    }
    return [];
  });
  return new RegExp("^(" + primModuleNames.join("|") + ")\\.html");
}

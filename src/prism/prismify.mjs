/**
 * @import {Root} from "mdast";
 * @import {StandardTokenName} from "prismjs/prism"
 */
import { h } from "hastscript";
import { visit } from "unist-util-visit";

/**
 * Prism Token Names
 *
 * @typedef {'atrule' | 'attr-name' | 'attr-value' | 'bold' | 'boolean' | 'builtin' | 'cdata' | 'char' | 'class-name' | 'comment' | 'constant' | 'deleted' | 'doctype' | 'entity' | 'function' | 'important' | 'inserted' | 'italic' | 'keyword' | 'namespace' | 'number' | 'operator' | 'prolog' | 'property' | 'punctuation' | 'regex' | 'selector' | 'string' | 'symbol' | 'tag' | 'url'} PrismToken;
 */

/**
 * Agda Token Names
 *
 * @typedef {'Background' | 'Bound' | 'CoinductiveConstructor' | 'Comment' | 'Datatype' | 'Deadcode' | 'DottedPattern' | 'Error' | 'Field' | 'Function' | 'Generalizable' | 'Hole' | 'IncompletePattern' | 'InductiveConstructor' | 'Keyword' | 'Macro' | 'Markup' | 'Module' | 'Number' | 'Operator' | 'Postulate' | 'Pragma' | 'Primitive' | 'PrimitiveType' | 'Record' | 'ShadowingInTelescope' | 'String' | 'Symbol' | 'TerminationProblem' | 'TypeChecks' | 'UnsolvedConstraint' | 'UnsolvedMeta'} AgdaToken;
 */

////////////////////////////////////////////////////////////////////////////////
// Agda Token Classes
////////////////////////////////////////////////////////////////////////////////

/**
 * @type {AgdaToken[]}
 */
const agdaTokens = [
  "Background",
  "Bound",
  "CoinductiveConstructor",
  "Comment",
  "Datatype",
  "Deadcode",
  "DottedPattern",
  "Error",
  "Field",
  "Function",
  "Generalizable",
  "Hole",
  "IncompletePattern",
  "InductiveConstructor",
  "Keyword",
  "Macro",
  "Markup",
  "Module",
  "Number",
  "Operator",
  "Postulate",
  "Pragma",
  "Primitive",
  "PrimitiveType",
  "Record",
  "ShadowingInTelescope",
  "String",
  "Symbol",
  "TerminationProblem",
  "TypeChecks",
  "UnsolvedConstraint",
  "UnsolvedMeta",
];

/**
 * @type {Partial<Record<AgdaToken, PrismToken>>}
 */
const defaultAgdaTokenToPrismToken = {
  Bound: "italic",
  CoinductiveConstructor: "constant",
  Comment: "comment",
  Datatype: "class-name",
  DottedPattern: "punctuation",
  Error: "deleted",
  Field: "property",
  Function: "function",
  Generalizable: "italic",
  InductiveConstructor: "constant",
  Keyword: "keyword",
  Macro: "symbol",
  Module: "namespace",
  Number: "number",
  Operator: "operator",
  Postulate: "important",
  Pragma: "atrule",
  Primitive: "builtin",
  PrimitiveType: "builtin",
  Record: "selector",
  String: "string",
  Symbol: "symbol",
};

/**
 * @param {Root} root
 * @param {Partial<Record<AgdaToken, PrismToken>> | undefined} agdaTokenToPrismToken
 * @returns {Root}
 */
export default function prismify(root, agdaTokenToPrismToken) {
  // Set default agdaTokenToPrismToken mapping:
  if (agdaTokenToPrismToken === undefined) {
    agdaTokenToPrismToken = defaultAgdaTokenToPrismToken;
  }
  visit(root, { type: "element", tagName: "pre" }, (pre) => {
    // If the pre element has the "Agda" class...
    if (Array.isArray(pre.properties?.className)) {
      const agdaIndex = pre.properties.className.indexOf("Agda");
      if (agdaIndex !== -1) {
        // ...remove the "Agda" class
        pre.properties.className.splice(agdaIndex, 1);
        // ...add the "language-agda" class
        pre.properties.className.push("language-agda");
        // ...add the data-language attribute
        pre.properties["data-language"] = "agda";
        // ...move all the children to a code element
        const code = h(
          "code",
          {
            "is:raw": "",
            class: "language-agda",
          },
          ...pre.children
        );
        pre.children = [code];
        // ...visit all anchor elements in the children
        visit(code, { type: "element", tagName: "a" }, (a) => {
          // If the anchor element has any classes...
          if (Array.isArray(a.properties?.className)) {
            // ...construct a new list of classes
            const newClassName = [];
            // ...tracking whether or not any prism tokens were inserted
            let hasPrismToken = false;
            // For each old class...
            for (const className of a.properties.className) {
              // If the old class is an Agda token...
              if (agdaTokens.includes(className)) {
                // ...and there is a corresponding prism token...
                const prismToken = agdaTokenToPrismToken[className];
                if (typeof prismToken === "string") {
                  // ...add the prism token into the new class list
                  newClassName.push(prismToken);
                  hasPrismToken = true;
                }
              } else {
                // ...otherwise, copy the old class into the new class list
                newClassName.push(className);
              }
            }
            // If any prism tokens were inserted...
            if (hasPrismToken) {
              // ...prepend the new class list with the "token" class
              newClassName.unshift("token");
            }
            a.properties.className = newClassName;
          }
        });
      }
    }
  });
  return root;
}

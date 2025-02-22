import ScopeStack from "./ScopeStack.mjs";

import { map } from "unist-util-map";
import { visit } from "unist-util-visit";
import { is } from "unist-util-is";

/**
 * @param {Root} root
 * @param {Themes} themes
 * @param {Partial<Record<string, string[]>> | undefined} agdaClassesToTextMateScopes
 * @param {boolean | undefined} addAstroCodeThemeClasses
 * @returns {Element}
 */
export default function shikify(root, themes, agdaClassesToTextMateScopes) {
  // Highlight the individual <a> elements:
  root = map(root, (node) =>
    shikifyNode(node, themes, agdaClassesToTextMateScopes)
  );
  // Group each line of <a> elements into a <span class="line">
  visit(root, { type: "element", tagName: "code" }, (code, index, parent) => {
    const lines = [];
    let line = [];
    const pushLine = () => {
      lines.push({
        type: "element",
        tagName: "span",
        properties: { className: ["line"] },
        children: line,
      });
      line = [];
    };
    for (const child of code.children) {
      line.push(child);
      if (is(child, { type: "text", value: "\n" })) pushLine();
    }
    if (line.length !== 0) pushLine();
    code.children = lines;
  });
  return root;
}

/**
 * @param {Element} node
 * @param {Themes} themes
 * @param {Partial<Record<string, string[]>> | undefined} agdaClassesToTextMateScopes
 * @param {boolean | undefined} addAstroCodeThemeClasses
 * @returns {Element}
 */
function shikifyNode(node, themes, agdaClassesToTextMateScopes) {
  // Ensure the node is an element:
  if (node?.type !== "element") return node;
  // Ensure the mapping from Agda classes to TextMate scopes is set:
  agdaClassesToTextMateScopes =
    agdaClassesToTextMateScopes ?? defaultAgdaClassesToTextMateScopes;
  // Split the themes into the main theme and the alternative themes:
  const [mainTheme, altThemes] = splitThemes(themes);
  // Remove the Agda classes from the node:
  const nodeAndAgdaClasses = popAgdaClasses(node, agdaClassesToTextMateScopes);
  const [, agdaClasses] = nodeAndAgdaClasses;
  // Ensure there are some Agda classes:
  if (agdaClasses.length === 0) return node;
  [node] = nodeAndAgdaClasses;
  // Determine the scope stack for the node:
  const scopeStack = agdaClassesToScopeStack(
    agdaClasses,
    agdaClassesToTextMateScopes
  );
  // If the node is a <pre class="Agda"> tag...
  if (node?.tagName === "pre" && agdaClasses.includes("Agda")) {
    // ...create a nested <code> tag:
    const code = {
      type: "element",
      tagName: "code",
      properties: {},
      children: node.children,
    };
    node.children = [code];
    // ...add the data-language property
    node.properties["data-language"] = "agda";
    // ...add the astro-code classes to the node:
    if (!Array.isArray(node.properties?.className)) {
      node.properties.className = [];
    }
    if (altThemes.length === 0) {
      node.properties.className.push("astro-code", mainTheme.name);
    } else {
      node.properties.className.push(
        "astro-code",
        "astro-code-themes",
        mainTheme.name,
        ...altThemes.map((altTheme) => altTheme[1].name)
      );
    }
    // ...highlight the node:
    node = highlightNodeWithThemes(node, scopeStack, mainTheme, altThemes);
  }
  // If the node is an <a> tag:
  if (node?.tagName === "a") {
    // ...highlight the node:
    node = highlightNodeWithThemes(node, scopeStack, mainTheme, altThemes);
  }
  return node;
}

/**
 * @param {Element} node
 * @param {ScopeStack} scopeStack
 * @param {Theme} mainTheme
 * @param {[string, Theme][]} altThemes
 * @returns {Element}
 */
function highlightNodeWithThemes(node, scopeStack, mainTheme, altThemes) {
  // ...ensure the element is an element:
  if (node?.type !== "element") return node;
  // ...highlight the node:
  const mainStyle = mainTheme.match(scopeStack);
  node = applyStyleAttributes(node, mainStyle, mainTheme);
  for (const [themeAlt, theme] of altThemes) {
    const altStyle = theme.match(scopeStack);
    node = applyStyleAttributes(node, altStyle, theme, themeAlt);
  }
  return node;
}

/**
 * @param {Element} element
 * @param {styleAttributes} styleAttributes
 * @param {Theme} theme
 * @param {string | undefined} themeAlt
 * @returns {Element}
 */
function applyStyleAttributes(element, styleAttributes, theme, themeAlt) {
  // Ensure the style attributes are all set:
  styleAttributes.fontStyle ||= theme?._defaults?.fontStyle;
  styleAttributes.foregroundId ||= theme?._defaults?.foregroundId;
  styleAttributes.backgroundId ||= theme?._defaults?.backgroundId;
  // Ensure the element style property exists:
  if (element?.properties === undefined) {
    element.properties = {};
  }
  if (element.properties?.style === undefined) {
    element.properties.style = "";
  }
  // Set the foreground color:
  const colorMap = theme.getColorMap();
  const fg = colorMap[styleAttributes?.foregroundId ?? 0];
  if (typeof fg === "string") {
    if (themeAlt === undefined) {
      element.properties.style += `color:${fg};`;
    } else {
      element.properties.style += `--shiki-${themeAlt}:${fg};`;
    }
  }
  const bg = colorMap[styleAttributes?.backgroundId ?? 0];
  if (typeof bg === "string") {
    if (themeAlt === undefined) {
      element.properties.style += `background-color:${bg};`;
    } else {
      element.properties.style += `--shiki-${themeAlt}-bg:${bg};`;
    }
  }
  // Set the font style:
  const fontStyle = styleAttributes?.fontStyle;
  if (typeof fontStyle === "number") {
    if (fontStyle > 0 && (fontStyle & 1) === 1) {
      // Italic
      if (themeAlt === undefined) {
        element.properties.style += "font-style:italic;";
      } else {
        element.properties.style += `--shiki-${themeAlt}-font-style:italic;`;
      }
    }
    if (fontStyle > 0 && (fontStyle & 2) === 2) {
      // Bold
      if (themeAlt === undefined) {
        element.properties.style += "font-weight:bold;";
      } else {
        element.properties.style += `--shiki-${themeAlt}-font-weight:bold;`;
      }
    }
    if (fontStyle > 0 && (fontStyle & 4) === 4) {
      // Underline
      if (themeAlt === undefined) {
        element.properties.style += "text-decoration:underline;";
      } else {
        element.properties.style += `--shiki-${themeAlt}-text-decoration:underline;`;
      }
    }
    if (fontStyle > 0 && (fontStyle & 8) === 8) {
      // Strikethrough
      if (themeAlt === undefined) {
        element.properties.style += "text-decoration:line-through;";
      } else {
        element.properties.style += `--shiki-${themeAlt}-text-decoration:line-through;`;
      }
    }
    if (fontStyle < 0 || ((fontStyle & 4) !== 4 && (fontStyle & 8) !== 8)) {
      // No text decoration
      if (themeAlt === undefined) {
        element.properties.style += "text-decoration:none;";
      } else {
        element.properties.style += `--shiki-${themeAlt}-text-decoration:none;`;
      }
    }
  }
  // Remove any empty style property:
  if (element.properties.style === "") {
    delete element.properties.style;
  }
  // Return the element
  return element;
}

/**
 * @param {Element} node
 * @param {Partial<Record<string, string[]>> | undefined} agdaClassesToTextMateScopes
 * @returns {[Element, string[]]}
 */
function popAgdaClasses(node, agdaClassesToTextMateScopes) {
  const classNamesAgda = [];
  if (Array.isArray(node?.properties?.className)) {
    agdaClassesToTextMateScopes =
      agdaClassesToTextMateScopes ?? defaultAgdaClassesToTextMateScopes;
    const classNames = node?.properties?.className ?? [];
    const classNamesRest = [];
    for (const className of classNames) {
      const maybeScopeNames = agdaClassesToTextMateScopes[className];
      if (maybeScopeNames === undefined) {
        classNamesRest.push(className);
      } else {
        classNamesAgda.push(className);
      }
    }
    if (classNamesRest.length > 0) {
      node.properties.className = classNamesRest;
    } else {
      delete node.properties.className;
    }
  }
  return [node, classNamesAgda];
}

/**
 * @param {string[]} agdaClasses
 * @param {Partial<Record<string, string[]>> | undefined} agdaClassesToTextMateScopes
 * @returns {ScopeStack}
 */
function agdaClassesToScopeStack(agdaClasses, agdaClassesToTextMateScopes) {
  return ScopeStack.from(
    ...agdaClasses.flatMap(
      (agdaClass) => agdaClassesToTextMateScopes[agdaClass] ?? []
    )
  );
}

/**
 *
 * @param {Themes} themes
 * @returns {[Theme, [string, Theme][]]}
 */
function splitThemes(themes) {
  const mainTheme = themes?.themes?.light ?? themes.theme;
  const altThemes = Object.entries(themes?.themes).filter(
    (entry) => entry?.at(0) !== "light"
  );
  return [mainTheme, altThemes];
}

/**
 * @type {Partial<Record<String, String>>}
 */
const defaultAgdaClassesToTextMateScopes = {
  Agda: [],
  Comment: ["comment.agda"],
  Markup: ["markup.agda"],
  Keyword: ["keyword.agda"],
  String: ["string.quoted.double.agda"],
  Number: ["constant.numeric.agda"],
  Symbol: ["punctuation.agda"],
  PrimitiveType: [
    "entity.name.type.agda",
    "support.type.agda",
    "storage.type.agda",
  ],
  Pragma: ["comment.block.pragma.agda"],
  Operator: ["entity.name.operator.agda", "keyword.operator.agda"],
  Hole: ["invalid.unimplemented.agda"],
  Bound: ["variable.agda"],
  Generalizable: ["variable.generalizable.agda"],
  InductiveConstructor: ["entity.name.constructor.inductive.agda"],
  CoinductiveConstructor: ["entity.name.constructor.coinductive.agda"],
  Datatype: ["entity.name.type.datatype.agda", "storage.type.datatype.agda"],
  Field: ["entity.name.attribute.agda"],
  Function: ["entity.name.function.agda", "variable.function.agda"],
  Macro: [
    "entity.name.macro.agda",
    "entity.name.function.macro.agda",
    "variable.macro.agda",
    "variable.function.macro.agda",
  ],
  Module: ["entity.name.module.agda"],
  Postulate: ["entity.name.postulate.agda"],
  Primitive: ["support.function.primitive"],
  Record: ["storage.type.record.agda"],
  DottedPattern: ["keyword.operator.dotted_pattern.agda"],
  UnsolvedMeta: ["invalid.unsolved_meta.agda", "log.warning"],
  UnsolvedConstraint: ["invalid.unsolved_constraint.agda", "log.warning"],
  TerminationProblem: ["invalid.termination_problem.agda", "log.error"],
  IncompletePattern: ["invalid.incomplete_pattern.agda", "log.error"],
  Error: ["invalid.error.agda", "log.error"],
  TypeChecks: [],
  Deadcode: ["invalid.deadcode.agda", "log.warning"],
  ShadowingInTelescope: ["invalid.shadowing_in_telescope.agda", "log.warning"],
};

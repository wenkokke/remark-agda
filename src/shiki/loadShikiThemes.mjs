/**
 * @import {ShikiConfig} from './findShikiConfig.mjs'
 * @import { Themes } from 'shiki'
 * @typedef {{theme?: Theme; themes?: Partial<Record<string, Theme>>}} Themes;
 */

import normalizeTheme from "./normalizeTheme.mjs";

/**
 * Try and find the Shiki themes.
 *
 * @param {ShikiConfig | undefined | null} config
 *
 * @returns {Themes | undefined | null};
 */
export default async function loadShikiThemes(config) {
  const result = {};
  try {
    const { bundledThemes } = await import("shiki");
    const { Theme } = await import("shiki/textmate.mjs");
    const loadShikiTheme = async (theme) => {
      if (typeof theme === "string") {
        try {
          theme = (await bundledThemes[theme]())?.default;
        } catch (e) {
          console.warn(`Could not resolve theme ${themeName}`);
        }
      }
      if (typeof theme === "object") {
        theme = normalizeTheme(theme);
        return Theme.createFromRawTheme(theme);
      }
      return null;
    };
    // Load the themes:
    result.theme = await loadShikiTheme(config?.theme);
    result.themes = {};
    for (const [themeAlt, theme] of Object.entries(config?.themes ?? {})) {
      result.themes[themeAlt] = await loadShikiTheme(theme);
    }
  } catch (e) {
    console.warn(`Could not load Shiki themes: ${e}`);
  }
  return result;
}

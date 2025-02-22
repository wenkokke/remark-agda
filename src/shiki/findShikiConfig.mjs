/**
 * @import {Root} from 'mdast'
 * @import {Processor} from 'unified'
 * @typedef {{theme?: Themes | ThemeRegistrationAny | SpecialTheme; themes?: Partial<Record<string, Themes | ThemeRegistrationAny | SpecialTheme>>}} ShikiConfig
 */

/**
 * Try and find the Shiki configuration.
 *
 * @this {Processor<Root, undefined, undefined, Root, string>}
 * @returns {ShikiConfig | null}
 */
export default function findShikiConfig() {
  try {
    return (
      this?.attachers
        ?.find((attacher) => attacher?.at(0)?.name === "rehypeShiki")
        ?.at(1) ?? null
    );
  } catch (e) {
    return null;
  }
}

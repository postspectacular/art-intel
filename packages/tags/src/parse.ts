import type { Maybe, NumOrString } from "@thi.ng/api";
import { isNumeric } from "@thi.ng/checks";
import { assocObj, comp, keep, map, transduce } from "@thi.ng/transducers";

/**
 * Syntax sugar for parsing an array of tags via {@link parseTag}.
 *
 * @param tags
 */
export const parseTags = (tags: string[]) =>
	transduce(comp(map(parseTag), keep()), assocObj<NumOrString>(), tags);

/**
 * Attempts to parse a tag in `key:value` format and returns tuple of `[key,
 * value]`. Returns undefined if the tag does not match the format. If value is
 * numeric, it will be automatically coerced to number.
 *
 * @param tag
 */
export const parseTag = (tag: string): Maybe<[string, NumOrString]> => {
	const idx = tag.indexOf(":");
	if (idx < 0) return;
	const val = tag.substring(idx + 1);
	return [tag.substring(0, idx), isNumeric(val) ? +val : val];
};

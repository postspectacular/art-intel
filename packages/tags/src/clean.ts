/** @internal */
const SRC = "àáäâãåèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,;";
/** @internal */
const DEST = "aaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh-----";
/** @internal */
const RE = new RegExp(SRC.split("").join("|"), "g");

/**
 * Adapted version of `@thi.ng/string slugify()`, transforms a tag string to
 * only keep certain characters and replace various non-ASCII chars.
 *
 * @param x
 */
export const cleanTag = (x: string) =>
	x
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(RE, (c) => DEST[SRC.indexOf(c)])
		.replace(/[^a-z0-9\/.:\-]/g, "")
		.replace(/[^a-z0-9]{2,}/g, "-")
		.replace(/(^[^a-z0-9]+)|([^a-z0-9]+$)/g, "");

export const cleanTags = (tags: string[]) => tags.map(cleanTag);

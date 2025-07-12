import { expect, test } from "bun:test";
import { cleanTags } from "../src/index.js";

test("cleanTags", () => {
	expect(cleanTags(["Ab:--C", "--ab:c-d--", "ab.", "a(b)c", "ä:ç!"])).toEqual(
		["ab-c", "ab:c-d", "ab", "abc", "a:c"]
	);
});

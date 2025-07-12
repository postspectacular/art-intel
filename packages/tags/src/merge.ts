/**
 * Takes (optional) arrays of existing tags, tag additions and deletions. Merges
 * arrays with Set-like semantics and returns new array of results in
 * alphabetically sorted order.
 *
 * @param existing
 * @param additions
 * @param deletions
 */
export const mergeTags = (
	existing: string[] = [],
	additions: string[] = [],
	deletions?: string[]
) => {
	const tags = new Set(
		existing.concat(<string[]>additions.filter((x) => !!x))
	);
	if (deletions) {
		for (let t of deletions) tags.delete(t);
	}
	return [...tags].sort();
};

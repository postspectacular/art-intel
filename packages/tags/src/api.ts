export interface ScoreSpec {
	/**
	 * Score ID (as used in tags and elsewhere)
	 */
	name: string;
	/**
	 * Brief description.
	 */
	description: string;
	/**
	 * Only used for composite scores. An object of S-expressions to transform participating scores.
	 */
	parts?: Record<string, string>;
	finalize?: string;
}

/**
 * Base type for items stored in thi.ng/notes format.
 */
export interface Note {
	/**
	 * Item KSUID
	 */
	_id: string;
	/**
	 * SHA-256 hash (here usually of thumbnail)
	 */
	_hash: string;
	/**
	 * Mime type (of thumbnail)
	 */
	_mime: string;
	/**
	 * Associated tags (incl. scores, encoded as `key:value` strings).
	 */
	_tags: string[];
	/** Extensible */
	[id: string]: any;
}

export interface LayerDBSnapshotItem {
	artworkID: string;
	assetID: string;
	artistID: string;
	artistName: string;
	title: string;
	type: LayerDBArtworkType;
	status: LayerDBArtworkStatus;
	variations?: LayerDBArtworkVariation[];
}

export interface LayerDBArtworkVariation {
	id: string;
	parameters: Record<string, string>;
}

export type LayerDBArtworkType = "generative" | "video";

export type LayerDBArtworkStatus =
	| "draft"
	| "in_review"
	| "published"
	| "unpublished";

/**
 * A single specific artwork instance (variation).
 */
export interface Artwork {
	/**
	 * KSUID from thi.ng/notes DB
	 */
	notesID: string;
	/**
	 * SHA1 hash of thumbnail
	 */
	hash: string;
	/**
	 * UUID of this variation (or base asset ID). Also see {@link Artwork.parentID}.
	 */
	id: string;
	/**
	 * Parent artwork ID (for variations)
	 */
	parentID: string;
	/**
	 * Artist UUID
	 */
	artistID: string;
	/**
	 * Artist name
	 */
	artistName: string;
	/**
	 * Artwork title
	 */
	title: string;
	/**
	 * Raw tags (assigned via thi.ng/notes UI)
	 */
	tags: string[];
	/**
	 * Record of parsed score tags from {@link Artwork.tags}.
	 */
	scoreTags: Record<string, number>;
	/**
	 * Scores in order defined by {@link BASE_SCORES}.
	 */
	scores: number[];
	/**
	 * RGB data of 8x8 thumbnail as sequence of `[r,g,b,r,g,b...]`
	 */
	img8x8: number[];
	/**
	 * Computed or dynamically adjusted visual volume score. Also see
	 * {@link Artwork.baseVolume}.
	 */
	volume: number;
	/**
	 * User assigned volume score
	 */
	baseVolume: number;
}

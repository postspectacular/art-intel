export interface Artwork {
	artworkID: string;
	assetID: string;
	artistID: string;
	artistName: string;
	title: string;
	type: ArtworkType;
	status: ArtworkStatus;
	variations?: ArtworkVariation[];
}

export interface ArtworkVariation {
	id: string;
	parameters: Record<string, string>;
}

export type ArtworkType = "generative" | "video";

export type ArtworkStatus = "draft" | "in_review" | "published" | "unpublished";

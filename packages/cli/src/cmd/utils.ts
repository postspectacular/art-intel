import type { Artwork } from "@layerinc/core";
import { illegalArgs } from "@thi.ng/errors";
import { files, readJSON } from "@thi.ng/file-io";
import type { ILogger } from "@thi.ng/logger";
import { filter, takeNth } from "@thi.ng/transducers";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const readArtworks = (path?: string, logger?: ILogger) => {
	if (!path) path = process.env.LAYER_DB_PATH;
	if (!path) illegalArgs("missing path to artwork JSON DB");
	return readJSON<Artwork[]>(path, logger);
};

export function* iterateArtworks(db: Artwork[]) {
	for (let item of db) {
		yield {
			id: item.assetID,
			artworkID: item.artworkID,
		};
		if (item.variations) {
			for (let v of item.variations) {
				yield {
					id: v.id,
					artworkID: item.artworkID,
				};
			}
		}
	}
}

export const filteredArtworks = (db: Artwork[], ids?: string[]) =>
	ids?.length
		? filter((x) => ids.includes(x.id), iterateArtworks(db))
		: iterateArtworks(db);

export const imagePathsForID = (
	root: string,
	id: string,
	ext: string,
	skip = 1
) =>
	existsSync(root)
		? [...takeNth(skip, files(root, new RegExp(`${id}-\\d{4}.${ext}$`)))]
		: [];

export const assetDirForID = (root: string, id: string) =>
	join(root, id.substring(0, 2), id.substring(2, 4));

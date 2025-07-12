import type { Nullable } from "@thi.ng/api";
import { flag, int, string, type Args, type Command } from "@thi.ng/args";
import { BASE62 } from "@thi.ng/base-n";
import { FMT_yyyyMMdd_HHmmss } from "@thi.ng/date";
import { ensureDir, readJSON, writeFile, writeJSON } from "@thi.ng/file-io";
import { nest, output, processImage, resize } from "@thi.ng/imago";
import { dirname, resolve } from "node:path";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARGS_OUT_DIR } from "../args.js";
import { BLOCK_FS } from "./blockfs.js";

interface TSNEOpts extends CommonOpts {
	assetDir: string;
	ext: string;
	noBundle: boolean;
	outDir: string;
	size: number;
	thumbWidth: number;
}

export const CONVERT_TSNE: Command<TSNEOpts, CommonOpts, AppCtx<TSNEOpts>> = {
	desc: "Convert JSON database and thumbnails for t-SNE visualization",
	opts: <Args<TSNEOpts>>{
		...ARGS_OUT_DIR,
		assetDir: string({
			desc: "Asset directory containing thumbnails. If omitted assumes the same dir as input (JSON database)",
		}),
		noBundle: flag({
			desc: "Disable bundling thumbnails in virtual block file system",
		}),
		ext: string({
			desc: "Thumbnail file type/extension",
			default: "jpg",
		}),
		size: int({
			alias: "s",
			hint: "PIXELS",
			desc: "Image size used for t-SNE clustering",
			default: 8,
		}),
		thumbWidth: int({
			alias: "w",
			hint: "PIXELS",
			desc: "Thumbnail size for visualization",
			default: 64,
		}),
	},
	inputs: 1,
	fn: command,
};

async function command(ctx: AppCtx<TSNEOpts>) {
	const { opts, logger } = ctx;
	const outDir = resolve(ctx.opts.outDir);
	ensureDir(outDir);
	const sessionID = FMT_yyyyMMdd_HHmmss();
	const items = await processArtworks(ctx);
	writeJSON(`${outDir}/tsne-${sessionID}.json`, items, null, "", logger);
	if (!opts.noBundle) await bundleThumbnails(ctx, items, sessionID);
}

type ArtworkType = "video" | "generative";
type ArtworkStatus = "in_review";

interface Artwork {
	title: string;
	type: ArtworkType;
	status: ArtworkStatus;
	variations: Nullable<ArtworkVariation[]>;
	artworkID: string;
	artistID: string;
	artistName: string;
	assetID: string;
}

interface ArtworkVariation {
	id: string;
	parameters: Record<string, any>;
}

interface TSNEItem {
	id: string;
	altID: string;
	artworkID: string;
	tsne: number[];
}

const processArtworks = async (ctx: AppCtx<TSNEOpts>) => {
	const { inputs, opts, logger } = ctx;
	const db = readJSON(inputs[0], logger);
	const assetRoot = resolve(opts.assetDir ?? dirname(inputs[0]));
	const outDir = resolve(ctx.opts.outDir);
	const items: TSNEItem[] = [];
	for (let item of iterateArtworks(db)) {
		const path = `${assetRoot}/${item.id}.${opts.ext}`;
		const result = await processArtwork(path, opts.thumbWidth, opts.size);
		writeFile(
			// use altID (max. 22 chars) for BlockFS compat
			// (filename max length = 31 chars)
			`${outDir}/${item.altID}-t.avif`,
			result.thumb,
			undefined,
			logger
		);
		items.push(<TSNEItem>{ ...item, tsne: result.tsne });
	}
	return items;
};

const processArtwork = async (
	path: string,
	thumbWidth: number,
	tsneWidth: number
) => {
	const { outputs } = await processImage(path, [
		nest({
			procs: [
				[
					resize({ size: [thumbWidth, thumbWidth] }),
					output({ id: "thumb", avif: { quality: 50 } }),
				],
				[
					resize({ size: [tsneWidth, tsneWidth] }),
					output({ id: "tsne", raw: { alpha: false } }),
				],
			],
		}),
	]);
	return {
		tsne: [...(<Buffer>outputs.tsne)],
		thumb: <Buffer>outputs.thumb,
	};
};

function* iterateArtworks(db: Artwork[]): IterableIterator<Partial<TSNEItem>> {
	for (let item of db) {
		yield {
			id: item.assetID,
			altID: base62ID(item.assetID),
			artworkID: item.artworkID,
		};
		if (item.variations) {
			for (let v of item.variations) {
				yield {
					id: v.id,
					altID: base62ID(v.id),
					artworkID: item.artworkID,
				};
			}
		}
	}
}

const base62ID = (uuid: string) =>
	BASE62.encodeBigInt(BigInt("0x" + uuid.replace(/-/g, "")));

const bundleThumbnails = (
	ctx: AppCtx<TSNEOpts>,
	items: TSNEItem[],
	sessionID: string
) => {
	const outDir = resolve(ctx.opts.outDir);
	return BLOCK_FS.fn({
		...ctx,
		inputs: [outDir],
		opts: {
			blockSize: 512,
			outFile: `${outDir}/thumbnails-${sessionID}.dat`,
			include: items.map((x) => x.altID + "-t.avif"),
			verbose: ctx.opts.verbose,
			quiet: ctx.opts.quiet,
			list: false,
			tree: false,
		},
	});
};

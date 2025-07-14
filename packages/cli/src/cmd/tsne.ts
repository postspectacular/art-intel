import type { Artwork, TSNEItem } from "@layerinc/core";
import { flag, int, string, type Args, type Command } from "@thi.ng/args";
import { BASE62 } from "@thi.ng/base-n";
import { FMT_yyyyMMdd_HHmmss } from "@thi.ng/date";
import { readJSON, writeFile, writeJSON } from "@thi.ng/file-io";
import { nest, output, processImage, resize } from "@thi.ng/imago";
import { dirname, resolve } from "node:path";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_OUT_DIR } from "../args.js";
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
		...ARG_OUT_DIR,
		assetDir: string({
			desc: "Asset directory containing original thumbnails. If omitted will use $LAYER_ASSET_DIR env var or failing that assumes the same dir as input (JSON database)",
			default: process.env.LAYER_ASSET_DIR,
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
			hint: "PIX",
			desc: "Image size used for t-SNE clustering",
			default: 8,
		}),
		thumbWidth: int({
			alias: "w",
			hint: "PIX",
			desc: "Thumbnail size for visualization",
			default: 64,
		}),
	},
	inputs: 1,
	fn: command,
};

async function command(ctx: AppCtx<TSNEOpts>) {
	const { inputs, opts, logger } = ctx;
	if (!opts.assetDir) {
		opts.assetDir = process.env.LAYER_ASSET_DIR ?? dirname(inputs[0]);
	}
	const outDir = resolve(ctx.opts.outDir);
	const sessionID = FMT_yyyyMMdd_HHmmss();
	const items = await processArtworks(ctx);
	if (!opts.noBundle) await bundleThumbnails(ctx, items, sessionID);
	writeJSON(`${outDir}/tsne-${sessionID}.json`, items, null, "", logger);
}

const processArtworks = async (ctx: AppCtx<TSNEOpts>) => {
	const { inputs, opts, logger } = ctx;
	const db = readJSON(inputs[0], logger);
	const assetRoot = resolve(opts.assetDir);
	const outDir = resolve(ctx.opts.outDir);
	const items: TSNEItem[] = [];
	for (let item of iterateArtworks(db)) {
		const path = `${assetRoot}/${item.id}.${opts.ext}`;
		const result = await processArtwork(path, opts.thumbWidth, opts.size);
		const prefix =
			item.id!.substring(0, 2) + "/" + item.id!.substring(2, 4);
		writeFile(
			// use altID (base62, max. 22 chars) for BlockFS compat
			// (filename max length = 31 chars, here max. 27)
			// max UUID: ffffffff-ffff-ffff-ffff-ffffffffffff => 7n42DGM5Tflk9n8mt7Fhc7
			`${outDir}/${prefix}/${item.altID}.avif`,
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

/**
 * Converts UUID into base62 encoded ID
 *
 * @param uuid
 */
const base62ID = (uuid: string) =>
	BASE62.encodeBigInt(BigInt("0x" + uuid.replace(/-/g, "")));

/**
 *
 * @param ctx
 * @param items
 * @param sessionID
 * @returns
 */
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
			include: items.map((x) => x.altID + ".avif"),
			verbose: ctx.opts.verbose,
			quiet: ctx.opts.quiet,
			list: false,
			tree: false,
		},
	});
};

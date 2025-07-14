import type { Artwork } from "@layerinc/core";
import { flag, int, string, type Args, type Command } from "@thi.ng/args";
import { files, readJSON, writeJSON } from "@thi.ng/file-io";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_EXT, ARG_IDS, ARG_OUT_DIR } from "../args.js";
import { filter } from "@thi.ng/transducers";
import { illegalArgs } from "@thi.ng/errors";
import { analyzeMotion, imageSequenceIntARGB } from "@layerinc/analysis";

interface AnalyzeMotionOpts extends CommonOpts {
	assetDir: string;
	delete: boolean;
	ext: string;
	id: string[];
	outDir: string;
	size: number;
}

export const ANALYZE_MOTION: Command<
	AnalyzeMotionOpts,
	CommonOpts,
	AppCtx<AnalyzeMotionOpts>
> = {
	desc: "Perform optical flow analysis for all or selected artworks from JSON DB (given as input or via LAYER_DB_PATH)",
	opts: <Args<AnalyzeMotionOpts>>{
		...ARG_EXT,
		...ARG_IDS,
		...ARG_OUT_DIR(process.env.LAYER_ANALYSIS_DIR),
		assetDir: string({
			desc: "Asset directory containing extracted image sequences. If omitted will use LAYER_TMP_DIR env var",
			default: process.env.LAYER_TMP_DIR,
		}),
		delete: flag({
			alias: "d",
			desc: "Delete image sequences after use",
		}),
		size: int({
			alias: "s",
			desc: "Resize image to given size for analysis",
			default: 640,
		}),
	},
	inputs: process.env.LAYER_DB_PATH ? [0, 1] : 1,
	fn: command,
};

async function command({ inputs, opts, logger }: AppCtx<AnalyzeMotionOpts>) {
	if (!opts.assetDir) illegalArgs("require --asset-dir");
	const db = iterateArtworks(
		readJSON<Artwork[]>(inputs[0] ?? process.env.LAYER_DB_PATH, logger)
	);
	const items = opts.id.length
		? filter((x) => opts.id.includes(x.id), db)
		: db;
	for (let item of items) {
		const frames = [
			...files(
				opts.assetDir,
				new RegExp(`${item.id}-\\d{4}.${opts.ext}$`)
			),
		];
		logger.info(frames);
		const res = await analyzeMotion(
			imageSequenceIntARGB(frames, {
				size: opts.size,
				deleteFiles: opts.delete,
				logger,
			})
		);
		writeJSON(
			`${opts.outDir}/${item.id}-motion.json`,
			res,
			undefined,
			undefined,
			logger
		);
	}
}

function* iterateArtworks(db: Artwork[]) {
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

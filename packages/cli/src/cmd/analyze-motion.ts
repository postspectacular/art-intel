import { analyzeMotion, imageSequenceIntARGB } from "@layerinc/analysis";
import { flag, int, string, type Args, type Command } from "@thi.ng/args";
import { illegalArgs } from "@thi.ng/errors";
import { writeJSON } from "@thi.ng/file-io";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_EXT, ARG_IDS, ARG_OUT_DIR } from "../args.js";
import {
	assetDirForID,
	filteredArtworks,
	imagePathsForID,
	readArtworks,
} from "./utils.js";

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
	desc: "Perform optical flow analysis for all or selected artworks",
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

async function command(ctx: AppCtx<AnalyzeMotionOpts>) {
	if (!ctx.opts.assetDir) illegalArgs("require --asset-dir");
	await Promise.all(
		[
			...filteredArtworks(
				readArtworks(ctx.inputs[0], ctx.logger),
				ctx.opts.id
			),
		].map((item) => processItem(item.id, ctx))
	);
}

const processItem = async (
	id: string,
	{ opts, logger }: AppCtx<AnalyzeMotionOpts>
) => {
	const frames = imagePathsForID(
		assetDirForID(opts.assetDir, id),
		id,
		opts.ext,
		1
	);
	if (!frames.length) {
		logger.warn("no images available for ID:", id, "skipping...");
		return;
	}
	const res = await analyzeMotion(
		imageSequenceIntARGB(frames, {
			size: opts.size,
			deleteFiles: opts.delete,
			logger,
		})
	);
	writeJSON(
		`${opts.outDir}/${id}-motion.json`,
		res,
		undefined,
		undefined,
		logger
	);
};

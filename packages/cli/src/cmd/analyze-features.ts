import {
	analyzeFeaturesSequence,
	imageSequenceIntARGB,
	saveImage,
	type FeatureAnalysisResult,
} from "@layerinc/analysis";
import { int, string, type Args, type Command } from "@thi.ng/args";
import { illegalArgs } from "@thi.ng/errors";
import { writeJSON } from "@thi.ng/file-io";
import type { ILogger } from "@thi.ng/logger";
import { Z4 } from "@thi.ng/strings";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_EXT, ARG_IDS, ARG_OUT_DIR } from "../args.js";
import {
	assetDirForID,
	filteredArtworks,
	imagePathsForID,
	readArtworks,
} from "./utils.js";

interface AnalyzeFeaturesOpts extends CommonOpts {
	assetDir: string;
	ext: string;
	id: string[];
	outDir: string;
	exportDir: string;
	size: number;
	skip: number;
}

export const ANALYZE_FEATURES: Command<
	AnalyzeFeaturesOpts,
	CommonOpts,
	AppCtx<AnalyzeFeaturesOpts>
> = {
	desc: "Perform image feature analysis for all or selected artworks",
	opts: <Args<AnalyzeFeaturesOpts>>{
		...ARG_EXT,
		...ARG_IDS,
		...ARG_OUT_DIR(process.env.LAYER_ANALYSIS_DIR),
		assetDir: string({
			desc: "Asset directory containing extracted image sequences. If omitted will use LAYER_TMP_DIR env var",
			default: process.env.LAYER_TMP_DIR,
		}),
		exportDir: string({
			alias: "E",
			desc: "Export directory for generated debug images",
		}),
		size: int({
			alias: "s",
			desc: "Resize image to given size for analysis",
			default: 128,
		}),
		skip: int({
			desc: "Only process every Nth input frame from the image sequence.",
			default: 30,
		}),
	},
	inputs: process.env.LAYER_DB_PATH ? [0, 1] : 1,
	fn: command,
};

async function command(ctx: AppCtx<AnalyzeFeaturesOpts>) {
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
	{ opts, logger }: AppCtx<AnalyzeFeaturesOpts>
) => {
	const frames = imagePathsForID(
		assetDirForID(opts.assetDir, id),
		id,
		opts.ext,
		opts.skip
	);
	if (!frames.length) {
		logger.warn("no images available for ID:", id, "skipping...");
		return;
	}
	const results = await analyzeFeaturesSequence(
		imageSequenceIntARGB(frames, { size: opts.size, logger }),
		{ images: !!opts.exportDir }
	);
	if (opts.exportDir) {
		await saveResultImages([results[0]], `${opts.exportDir}/${id}`, logger);
		for (let r of results) {
			delete r.images;
		}
	}
	writeJSON(
		`${opts.outDir}/${id}-features.json`,
		results,
		undefined,
		undefined,
		logger
	);
};

const saveResultImages = async (
	results: FeatureAnalysisResult[],
	basePath: string,
	logger: ILogger
) => {
	for (let i = 0; i < results.length; i++) {
		const path = `${basePath}-${Z4(i)}`;
		await Promise.all(
			Object.entries(results[i].images!).map(([k, img]) =>
				saveImage(`${path}-${k.toLowerCase()}.png`, img, {}, logger)
			)
		);
	}
};

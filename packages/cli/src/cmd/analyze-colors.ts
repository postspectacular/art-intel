import {
	analyzeColorsSequence,
	imageSequenceIntARGB,
} from "@layerinc/analysis";
import type { Artwork } from "@layerinc/core";
import { int, string, type Args, type Command } from "@thi.ng/args";
import { illegalArgs } from "@thi.ng/errors";
import { files, readJSON, writeJSON } from "@thi.ng/file-io";
import { filter, takeNth } from "@thi.ng/transducers";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_EXT, ARG_IDS, ARG_OUT_DIR } from "../args.js";

interface AnalyzeColorOpts extends CommonOpts {
	assetDir: string;
	ext: string;
	id: string[];
	outDir: string;
	size: number;
	skip: number;
}

export const ANALYZE_COLORS: Command<
	AnalyzeColorOpts,
	CommonOpts,
	AppCtx<AnalyzeColorOpts>
> = {
	desc: "Perform color metadata analysis for all or selected artworks",
	opts: <Args<AnalyzeColorOpts>>{
		...ARG_EXT,
		...ARG_IDS,
		...ARG_OUT_DIR(process.env.LAYER_ANALYSIS_DIR),
		assetDir: string({
			desc: "Asset directory containing extracted image sequences. If omitted will use LAYER_TMP_DIR env var",
			default: process.env.LAYER_TMP_DIR,
		}),
		size: int({
			alias: "s",
			desc: "Resize image to given size for analysis",
			default: 256,
		}),
		skip: int({
			desc: "Only process every Nth input frame from the image sequence.",
			default: 30,
		}),
	},
	fn: command,
};

async function command({ inputs, opts, logger }: AppCtx<AnalyzeColorOpts>) {
	if (!opts.assetDir) illegalArgs("require --asset-dir");
	const db = iterateArtworks(
		readJSON<Artwork[]>(inputs[0] ?? process.env.LAYER_DB_PATH, logger)
	);
	const items = opts.id?.length
		? filter((x) => opts.id.includes(x.id), db)
		: db;
	for (let item of items) {
		const frames = [
			...takeNth(
				opts.skip,
				files(
					opts.assetDir,
					new RegExp(`${item.id}-\\d{4}.${opts.ext}$`)
				)
			),
		];
		if (!frames.length) {
			logger.warn("no images available for ID:", item.id, "skipping...");
			continue;
		}
		const result = await analyzeColorsSequence(
			imageSequenceIntARGB(frames, { size: opts.size, logger })
		);
		writeJSON(
			`${opts.outDir}/${item.id}-color.json`,
			result,
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

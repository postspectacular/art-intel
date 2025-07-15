import { extractVideoFrames } from "@layerinc/analysis";
import { flag, int, string, type Args, type Command } from "@thi.ng/args";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_IDS, ARG_OUT_DIR } from "../args.js";
import { assetDirForID, filteredArtworks, readArtworks } from "./utils.js";

interface ExtractFrameOpts extends CommonOpts {
	assetDir: string;
	ext: string;
	fps: number;
	from: number;
	id: string[];
	outDir: string;
	listFiles: boolean;
	size: number;
	to: number;
}

export const EXTRACT_FRAMES: Command<
	ExtractFrameOpts,
	CommonOpts,
	AppCtx<ExtractFrameOpts>
> = {
	desc: "Extract image sequence from given video asset",
	opts: <Args<ExtractFrameOpts>>{
		...ARG_IDS,
		...ARG_OUT_DIR(process.env.LAYER_TMP_DIR),
		assetDir: string({
			desc: "Asset directory containing extracted image sequences. If omitted will use LAYER_ASSET_DIR env var",
			default: process.env.LAYER_ASSET_DIR,
		}),
		ext: string({
			desc: "File type/extension for still frames",
			default: "png",
		}),
		fps: int({
			desc: "Frame rate",
			default: 15,
		}),
		from: int({
			desc: "Start time (in seconds)",
			default: 0,
		}),
		listFiles: flag({
			alias: "l",
			desc: "Print file paths of extracted frames to stdout",
			default: false,
		}),
		size: int({
			hint: "PIX",
			desc: "Image size",
			default: 640,
		}),
		to: int({
			desc: "End time (in seconds)",
			default: 10,
		}),
	},
	inputs: process.env.LAYER_DB_PATH ? [0, 1] : 1,
	fn: command,
};

async function command({ inputs, opts, logger }: AppCtx<ExtractFrameOpts>) {
	const items = filteredArtworks(readArtworks(inputs[0], logger), opts.id);
	for (let { id } of items) {
		const result = await extractVideoFrames(`${opts.assetDir}/${id}.mp4`, {
			dir: assetDirForID(opts.outDir, id),
			fps: opts.fps,
			from: opts.from,
			to: opts.to,
			ext: opts.ext,
			size: opts.size,
			logger,
		});
		logger.debug(
			`wrote ${result.frames.length} frames to ${result.outDir}`
		);
		if (opts.listFiles) {
			process.stdout.write(result.frames.join("\n") + "\n");
		}
	}
}

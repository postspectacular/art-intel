import { extractVideoFrames } from "@layerinc/analysis";
import {
	coerceInt,
	flag,
	int,
	string,
	tuple,
	type Args,
	type Command,
	type Tuple,
} from "@thi.ng/args";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARGS_OUT_DIR } from "../args.js";

interface ExtractFrameOpts extends CommonOpts {
	ext: string;
	fps: number;
	from: number;
	outDir: string;
	listFiles: boolean;
	size?: Tuple<number>;
	to: number;
}

export const EXTRACT_FRAMES: Command<
	ExtractFrameOpts,
	CommonOpts,
	AppCtx<ExtractFrameOpts>
> = {
	desc: "Extract image sequence from given video",
	opts: <Args<ExtractFrameOpts>>{
		...ARGS_OUT_DIR,
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
		size: tuple(coerceInt, 2, {
			hint: "W,H",
			desc: "Image dimensions",
		}),
		to: int({
			desc: "End time (in seconds)",
			default: 10,
		}),
	},
	inputs: 1,
	fn: command,
};

async function command({ opts, inputs, logger }: AppCtx<ExtractFrameOpts>) {
	try {
		const result = await extractVideoFrames(inputs[0], {
			fps: opts.fps,
			from: opts.from,
			to: opts.to,
			ext: opts.ext,
			dir: opts.outDir,
			size: <[number, number]>opts.size?.deref(),
			logger,
		});
		logger.debug(
			`wrote ${result.frames.length} frames to ${result.outDir}`
		);
		logger.debug(`file pattern: ${result.name}-0001.${opts.ext}`);
		if (opts.listFiles) {
			process.stdout.write(result.frames.join("\n") + "\n");
		}
	} catch (e) {
		console.log(e);
	}
}

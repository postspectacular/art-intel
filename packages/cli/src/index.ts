import { cliApp } from "@thi.ng/args";
import { LogLevel } from "@thi.ng/logger";
import { config } from "dotenv";
import { HEADER, type AppCtx, type CommonOpts } from "./api.js";
import { ARGS_COMMON } from "./args.js";
import { BLOCK_FS } from "./cmd/blockfs.js";
import { DOWNLOAD_THUMBS } from "./cmd/download-thumbs.js";
import { EXTRACT_FRAMES } from "./cmd/extract-frames.js";

config({ quiet: true });

cliApp<CommonOpts, AppCtx<any>>({
	opts: ARGS_COMMON,
	commands: {
		// "analyze-colors": ANALYZE_COLORS,
		// "analyze-motion": ANALYZE_MOTION,
		blockfs: BLOCK_FS,
		// "convert-db": CONVERT_DB,
		"download-thumbs": DOWNLOAD_THUMBS,
		// "encode-tags": ENCODE_TAGS,
		"extract-frames": EXTRACT_FRAMES,
		// "process-thumbs": PROCESS_THUMBS,
		// report: REPORT,
		// tsne: PREPARE_TSNE,
	},
	name: "layer",
	ctx: async (ctx) => {
		if (ctx.opts.quiet) ctx.logger.level = LogLevel.NONE;
		else if (ctx.opts.verbose) ctx.logger.level = LogLevel.DEBUG;
		return ctx;
	},
	start: 3,
	usage: {
		prefix: `${HEADER}

Usage: layer <cmd> [opts] input [...]
       layer <cmd> --help\n`,
		showGroupNames: true,
		paramWidth: 28,
		lineWidth: 96,
	},
});

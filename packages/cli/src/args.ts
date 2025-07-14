import { flag, string, strings, type Args } from "@thi.ng/args";
import type { CommonOpts } from "./api.js";

export const ARGS_COMMON: Args<CommonOpts> = {
	verbose: flag({
		alias: "v",
		desc: "Display extra information",
	}),
	quiet: flag({
		alias: "q",
		desc: "Disable logging",
	}),
};

export const ARG_OUT_FILE = {
	outFile: string({
		alias: "o",
		desc: "Output file",
		optional: false,
	}),
};

export const ARG_OUT_DIR = (
	defaultVal?: string
): { outDir: ReturnType<typeof string> } => ({
	outDir: string({
		alias: "O",
		desc: "Output directory",
		default: defaultVal,
		optional: !!defaultVal,
	}),
});

export const ARG_EXT = {
	ext: string({
		desc: "File type/extension for still frames",
		default: "png",
	}),
};

export const ARG_IDS = {
	id: strings({
		desc: "Asset or variation UUID. If given only these ID will be processed (otherwise all)",
	}),
};

import { flag, string, type Args } from "@thi.ng/args";
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

export const ARGS_OUT_FILE = {
	outFile: string({
		alias: "o",
		desc: "Output file",
		optional: false,
	}),
};

export const ARGS_OUT_DIR = {
	outDir: string({
		alias: "O",
		desc: "Output directory",
		optional: false,
	}),
};

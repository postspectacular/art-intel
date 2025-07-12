import {
	flag,
	int,
	string,
	strings,
	type Args,
	type Command,
} from "@thi.ng/args";
import { CONVERT } from "@thi.ng/block-fs/cli/convert";
import { LIST } from "@thi.ng/block-fs/cli/list";
import { illegalArgs } from "@thi.ng/errors";
import type { AppCtx, CommonOpts } from "../api.js";

interface BlockFSOpts extends CommonOpts {
	blockSize: number;
	exclude?: string[];
	include?: string[];
	list: boolean;
	outFile?: string;
	tree: boolean;
}

export const BLOCK_FS: Command<BlockFSOpts, CommonOpts, AppCtx<BlockFSOpts>> = {
	desc: "Bundle or list media assets in virtual block file system",
	opts: <Args<BlockFSOpts>>{
		blockSize: int({
			alias: "bs",
			hint: "BYTES",
			desc: "Block size",
			default: 512,
		}),
		exclude: strings({
			alias: "e",
			desc: "File exclusion regexp",
		}),
		include: strings({
			alias: "i",
			desc: "File inclusion regexp",
		}),
		list: flag({
			alias: "l",
			desc: "List files only (no conversion)",
		}),
		outFile: string({
			alias: "o",
			desc: "Output file",
		}),
		tree: flag({
			alias: "t",
			desc: "Tree output (list only)",
		}),
	},
	inputs: 1,
	fn: command,
};

async function command(ctx: AppCtx<BlockFSOpts>) {
	if (ctx.opts.list) {
		await LIST.fn({
			...ctx,
			opts: {
				blockSize: ctx.opts.blockSize,
				all: ctx.opts.verbose,
				tree: ctx.opts.tree,
				withMtime: false,
				withSize: false,
				quiet: false,
				verbose: false,
			},
		});
	} else {
		if (!ctx.opts.outFile) illegalArgs("missing --out-dir");
		await CONVERT.fn({
			...ctx,
			opts: {
				blockSize: ctx.opts.blockSize,
				exclude: ctx.opts.exclude,
				include: ctx.opts.include,
				out: ctx.opts.outFile,
				quiet: false,
				verbose: ctx.opts.verbose,
			},
		});
	}
}

import { always } from "@thi.ng/api";
import { flag, type Args, type Command } from "@thi.ng/args";
import { json, lower, parseCSV } from "@thi.ng/csv";
import { readText, writeJSON } from "@thi.ng/file-io";
import { split } from "@thi.ng/strings";
import {
	comp,
	count,
	filter,
	mapcat,
	push,
	transduce,
} from "@thi.ng/transducers";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_OUT_FILE } from "../args.js";

interface ConvertDBOpts extends CommonOpts {
	all: boolean;
	outFile: string;
}

export const CONVERT_DB: Command<
	ConvertDBOpts,
	CommonOpts,
	AppCtx<ConvertDBOpts>
> = {
	desc: "Convert & filter Supabase CSV database snapshot into JSON",
	opts: <Args<ConvertDBOpts>>{
		...ARG_OUT_FILE,
		all: flag({
			alias: "a",
			desc: "Include drafts & unpublished items",
		}),
	},
	inputs: 1,
	fn: command,
};

async function command({ inputs, opts, logger }: AppCtx<ConvertDBOpts>) {
	const artworks = transduce(
		comp(
			parseCSV({
				cols: {
					artwork_id: { alias: "artworkID" },
					artist_id: { alias: "artistID" },
					artist_name: { alias: "artistName" },
					asset_id: { alias: "assetID" },
					type: { tx: lower },
					status: { tx: lower },
					variations: { tx: json() },
				},
			}),
			filter(
				opts.all
					? always
					: (x) => x.status !== "unpublished" && x.status !== "draft"
			)
		),
		push(),
		split(readText(inputs[0], logger))
	);
	const numVar = transduce(
		mapcat((x: any) => x.variations),
		count(),
		artworks
	);
	logger.info(
		"parsed",
		artworks.length,
		"artworks,",
		numVar,
		"variations, total:",
		artworks.length + numVar
	);
	writeJSON(opts.outFile, artworks, null, 4, logger);
}

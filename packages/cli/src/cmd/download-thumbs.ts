import { flag, int, string, type Args, type Command } from "@thi.ng/args";
import { delayed } from "@thi.ng/compose";
import { writeFile } from "@thi.ng/file-io";
import { bytes, interpolate } from "@thi.ng/strings";
import { existsSync } from "node:fs";
import type { AppCtx, CommonOpts } from "../api.js";
import { ARG_OUT_DIR } from "../args.js";
import { readArtworks } from "./utils.js";

interface DownloadOpts extends CommonOpts {
	cdnUrl: string;
	force: boolean;
	outDir: string;
	throttle: number;
}

export const DOWNLOAD_THUMBS: Command<
	DownloadOpts,
	CommonOpts,
	AppCtx<DownloadOpts>
> = {
	desc: "Download artwork thumbnails (images & videos) from Layer CDN",
	opts: <Args<DownloadOpts>>{
		...ARG_OUT_DIR(process.env.LAYER_ASSET_DIR),
		cdnUrl: string({
			desc: "Layer CDN base URL",
			hint: "URL",
			default: "https://video-thumbnail-prod.layer.com",
		}),
		force: flag({
			alias: "f",
			desc: "Force re-download of existing assets",
		}),
		throttle: int({
			alias: "t",
			desc: "Delay (in ms) between asset downloads",
			default: 1000,
		}),
	},
	inputs: process.env.LAYER_DB_PATH ? [0, 1] : 1,
	fn: command,
};

async function command(ctx: AppCtx<DownloadOpts>) {
	const { inputs, opts, logger } = ctx;
	const JPG_URL = `${opts.cdnUrl}/{0}/thumbnail.jpg`;
	const MP4_URL = `${opts.cdnUrl}/{0}/thumbnail.mp4`;
	const VAR_JPG_URL = `${opts.cdnUrl}/variation/{0}/thumbnail.jpg`;
	const VAR_MP4_URL = `${opts.cdnUrl}/variation/{0}/thumbnail.mp4`;
	const OUT_PATH_JPG = `${opts.outDir}/{0}.jpg`;
	const OUT_PATH_MP4 = `${opts.outDir}/{0}.mp4`;
	for (let item of readArtworks(inputs[0], logger)) {
		logger.info("artwork ID:", item.artworkID, "type:", item.type);
		await downloadImage(ctx, JPG_URL, OUT_PATH_JPG, item.assetID);
		await downloadImage(ctx, MP4_URL, OUT_PATH_MP4, item.assetID);
		if (item.variations) {
			ctx.logger.info(`downloading ${item.variations.length} variations`);
			for (let variation of item.variations) {
				await downloadImage(
					ctx,
					VAR_JPG_URL,
					OUT_PATH_JPG,
					variation.id
				);
				await downloadImage(
					ctx,
					VAR_MP4_URL,
					OUT_PATH_MP4,
					variation.id
				);
			}
		}
	}
}

const downloadImage = async (
	{ logger, opts }: AppCtx<DownloadOpts>,
	baseURL: string,
	outPath: string,
	id: string
) => {
	try {
		const dest = interpolate(outPath, id);
		if (!opts.force && existsSync(dest)) {
			logger.debug(`file ${dest} exists, skipping download...`);
			return;
		}
		const url = interpolate(baseURL, id);
		logger.info("loading:", url);
		const res = await fetch(url, { redirect: "follow" });
		const buf = new Uint8Array(await res.arrayBuffer());
		logger.info("read", bytes(buf.length));
		writeFile(dest, buf, undefined, logger);
	} catch (e) {
		logger.warn(e);
	}
	await delayed(null, opts.throttle);
};

import { flag, int, string, type Args, type Command } from "@thi.ng/args";
import { delayed } from "@thi.ng/compose";
import { readJSON, writeFile } from "@thi.ng/file-io";
import { bytes, interpolate } from "@thi.ng/strings";
import { existsSync } from "node:fs";
import type { AppCtx, CommonOpts } from "../api.js";

const JPG_URL = "https://video-thumbnail-prod.layer.com/{0}/thumbnail.jpg";
const MP4_URL = "https://video-thumbnail-prod.layer.com/{0}/thumbnail.mp4";
const VAR_JPG_URL =
	"https://video-thumbnail-prod.layer.com/variation/{0}/thumbnail.jpg";
const VAR_MP4_URL =
	"https://video-thumbnail-prod.layer.com/variation/{0}/thumbnail.mp4";

interface DownloadOpts extends CommonOpts {
	db: string;
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
		db: string({
			desc: "Database JSON snapshot (created via `convert-db`)",
			hint: "PATH",
			optional: false,
		}),
		force: flag({
			alias: "f",
			desc: "Force re-download of existing assets",
		}),
		outDir: string({
			alias: "o",
			desc: "Output directory",
			hint: "PATH",
			optional: false,
		}),
		throttle: int({
			alias: "t",
			desc: "Delay (in ms) between asset downloads",
			default: 1000,
		}),
	},
	fn: command,
};

async function command(ctx: AppCtx<DownloadOpts>) {
	const OUT_PATH_JPG = `${ctx.opts.outDir}/{0}.jpg`;
	const OUT_PATH_MP4 = `${ctx.opts.outDir}/{0}.mp4`;
	const DB = readJSON(ctx.opts.db, ctx.logger);
	for (let item of DB) {
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

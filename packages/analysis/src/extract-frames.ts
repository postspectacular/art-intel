import { FMT_HHmmss } from "@thi.ng/date";
import { ensureDir, files } from "@thi.ng/file-io";
import type { ILogger } from "@thi.ng/logger";
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve, sep } from "node:path";

export interface ExtractVideoFrameOpts {
	/**
	 * Start timestamp (in seconds)
	 *
	 * @defaultValue 0
	 */
	from: number;
	/**
	 * End timestamp (in seconds)
	 *
	 * @defaultValue 10
	 */
	to: number;
	/**
	 * Frame rate at which to extract frames
	 *
	 * @defaultValue 15
	 */
	fps: number;
	/**
	 * Target dimensions for extracted frames, given (as `[width,height]`
	 * tuple). By default no resizing.
	 */
	size: [number, number];
	/**
	 * Output directory. By default a OS-specific temp dir.
	 */
	dir: string;
	/**
	 * File extension for extract frames
	 *
	 * @defaultValue `png`
	 */
	ext: string;
	/**
	 * Logger instance.
	 */
	logger: ILogger;
}

/**
 * Result type of {@link extractVideoFrames}.
 */
export interface ExtractedFrames {
	/**
	 * Resolved output directory path
	 */
	outDir: string;
	/**
	 * Base file name (without counter & extension) of image sequence.
	 */
	name: string;
	/**
	 * Array of absolute paths of the extracted still images.
	 */
	frames: string[];
}

/**
 * Async function. Invokes `ffmpeg` to extract still frames from video at given
 * file `path`. The extraction can be configured via given options. Returns a
 * {@link ExtractedFrames} object with paths to extracted images and other
 * metadata.
 *
 * @param path
 * @param opts
 */
export const extractVideoFrames = async (
	path: string,
	{
		fps = 15,
		from = 0,
		to = 10,
		ext = "png",
		dir = realpathSync(tmpdir()),
		size,
		logger,
	}: Partial<ExtractVideoFrameOpts> = {}
): Promise<ExtractedFrames> => {
	path = resolve(path);
	dir = resolve(dir);
	ensureDir(dir);
	const name = basename(path).replace(/\.\w+$/, "");
	const args = [
		"-i",
		path,
		"-ss",
		FMT_HHmmss(from * 1000, true),
		"-to",
		FMT_HHmmss(to * 1000, true),
		"-r",
		String(fps),
	];
	if (size) {
		args.push(`-vf`, `size=${size[0]},${size[1]}`);
	}
	args.push(`${dir}${sep}${name}-%04d.${ext}`);
	logger?.debug(`executing: ffmpeg ${args.join(" ")}`);
	await new Promise<void>((resolve, reject) => {
		const cmd = spawn("ffmpeg", args);
		cmd.on("error", (e) => {
			logger?.warn(e.message);
			reject();
		});
		cmd.on("close", (code) => {
			if (!code) {
				resolve();
				return;
			}
			logger?.warn(
				`ffmpeg returned with exit code ${code}, terminating...`
			);
			reject();
		});
	});
	return {
		outDir: dir,
		name,
		frames: [...files(dir, new RegExp(`${name}-\\d{4}\\.${ext}$`))],
	};
};

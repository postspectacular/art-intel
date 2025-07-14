import type { Fn3, Maybe } from "@thi.ng/api";
import { ensureArray } from "@thi.ng/arrays";
import { deleteFileAsync } from "@thi.ng/file-io";
import type { ILogger } from "@thi.ng/logger";
import type { IPixelBuffer } from "@thi.ng/pixel";
import {
	floatBufferFromFileGray,
	floatBufferFromFileRGB,
	intBufferFromFileARGB,
	intBufferFromFileGray,
} from "./pixel-buffer.js";

export interface ImageSequenceOpts {
	/**
	 * If given, images will be first resized to given size (longest side).
	 */
	size: number;
	/**
	 * Logger to use for image loading.
	 */
	logger: ILogger;
	/**
	 * If true (default: false), deletes each image file after emitting it.
	 * Useful when iterating /tmp files.
	 */
	deleteFiles: boolean;
}

/** @internal */
const __iter = <T extends IPixelBuffer>(
	fn: Fn3<string, Maybe<number>, Maybe<ILogger>, Promise<T>>
) =>
	async function* (
		paths: Iterable<string>,
		{ size, logger, deleteFiles = false }: Partial<ImageSequenceOpts> = {}
	) {
		for (let path of ensureArray(paths).sort()) {
			yield await fn(path, size, logger);
			if (deleteFiles) await deleteFileAsync(path, logger);
		}
	};

export const imageSequenceIntARGB = __iter(intBufferFromFileARGB);

export const imageSequenceIntGray = __iter(intBufferFromFileGray);

export const imageSequenceFloatRGB = __iter(floatBufferFromFileRGB);

export const imageSequenceFloatGray = __iter(floatBufferFromFileGray);

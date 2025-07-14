import { output, processImage, resize, type ProcSpec } from "@thi.ng/imago";
import type { ILogger } from "@thi.ng/logger";
import {
	ARGB8888,
	FLOAT_GRAY,
	FLOAT_RGB,
	GRAY8,
	intBuffer,
} from "@thi.ng/pixel";

export const intBufferFromFileARGB = async (
	path: string,
	size?: number,
	logger?: ILogger
) => {
	logger?.debug("loading image:", path);
	const proc: ProcSpec[] = [
		output({ id: "img", raw: { alpha: true, meta: true } }),
	];
	if (size != null) proc.unshift(resize({ size: [size, size], bg: "#000" }));
	const {
		outputs: { img },
		outputMeta: { img: meta },
	} = await processImage(path, proc);
	const buf = <Buffer>img;
	const res = intBuffer(
		(<any>meta).width,
		(<any>meta).height,
		ARGB8888,
		new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength >> 2)
	);
	return res;
};

export const intBufferFromFileGray = async (
	path: string,
	size?: number,
	logger?: ILogger
) => (await intBufferFromFileARGB(path, size, logger)).as(GRAY8);

export const floatBufferFromFileRGB = async (
	path: string,
	size?: number,
	logger?: ILogger
) => (await intBufferFromFileARGB(path, size, logger)).as(FLOAT_RGB);

export const floatBufferFromFileGray = async (
	path: string,
	size?: number,
	logger?: ILogger
) => (await intBufferFromFileARGB(path, size, logger)).as(FLOAT_GRAY);

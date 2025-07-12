import { output, processImage, resize } from "@thi.ng/imago";
import { ARGB8888, FLOAT_RGB, intBuffer } from "@thi.ng/pixel";

export const intBufferFromFile = async (path: string, width: number) => {
	const {
		outputs: { img },
	} = await processImage(path, [
		resize({ size: [width, width] }),
		output({ id: "img", raw: { alpha: true } }),
	]);
	const buf = <Buffer>img;
	return intBuffer(
		width,
		width,
		ARGB8888,
		new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength >> 2)
	);
};

export const floatBufferFromFile = async (path: string, width: number) =>
	(await intBufferFromFile(path, width)).as(FLOAT_RGB);

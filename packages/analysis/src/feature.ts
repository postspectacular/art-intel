import { FLOAT_GRAY, IntBuffer } from "@thi.ng/pixel";
import {
	BOX_BLUR2,
	convolve,
	EDGE2,
	fromFloatBuffer,
	magSq,
	mulN,
	SOBEL2,
	sub,
	subN,
	sum,
	tanh,
	type Tensor2,
} from "@thi.ng/tensors";
import { intBufferGrayFromTensor } from "./buffer";

const { sqrt } = Math;

export interface FeatureAnalysisOpts {
	amp: number;
	images: boolean;
}

export interface FeatureAnalysisResult {
	lp: number;
	lpc: number;
	hp: number;
	hpc: number;
	edge3: number;
	edge5: number;
	sobel: number;
	edge3Tanh: number;
	edge5Tanh: number;
	sobelTanh: number;
	images?: Record<string, IntBuffer>;
}

export const analyzeFeatures = (
	int: IntBuffer,
	{ amp = 1, images }: Partial<FeatureAnalysisOpts> = {}
) => {
	const img = <Tensor2>fromFloatBuffer(int.as(FLOAT_GRAY));
	const num = img.length;
	const edge3 = convolve(null, img, EDGE2(1));
	const edge5 = convolve(null, img, EDGE2(2));
	const soby = convolve(null, img, SOBEL2);
	const sobx = convolve(null, img, SOBEL2.transpose([1, 0]));
	const edge3Tanh = tanh(null, mulN(img.empty(), edge3, amp));
	const edge5Tanh = tanh(null, mulN(img.empty(), edge5, amp));
	const sobxTanh = tanh(null, mulN(img.empty(), sobx, amp));
	const sobyTanh = tanh(null, mulN(img.empty(), soby, amp));

	const lowpass = convolve(null, img, BOX_BLUR2(9));
	const lpcenter = subN(img.empty(), lowpass, sum(lowpass) / num);
	const highpass = sub(img.empty(), img, lowpass);
	const hpcenter = subN(img.empty(), highpass, sum(highpass) / num);

	const scoreEdge3 = sqrt(magSq(edge3)) / num;
	const scoreEdge5 = sqrt(magSq(edge5)) / num;
	const scoreSobel = sqrt(magSq(sobx) + magSq(soby)) / num;
	const scoreLP = sqrt(magSq(lowpass)) / num;
	const scoreLPC = sqrt(magSq(lpcenter)) / num;
	const scoreHP = sqrt(magSq(highpass)) / num;
	const scoreHPC = sqrt(magSq(hpcenter)) / num;

	const scoreEdge3Tanh = sqrt(magSq(edge3Tanh)) / num;
	const scoreEdge5Tanh = sqrt(magSq(edge5Tanh)) / num;
	const scoreSobelTanh = sqrt(magSq(sobxTanh) + magSq(sobyTanh)) / num;

	const result: FeatureAnalysisResult = {
		lp: scoreLP,
		lpc: scoreLPC,
		hp: scoreHP,
		hpc: scoreHPC,
		edge3: scoreEdge3,
		edge5: scoreEdge5,
		sobel: scoreSobel,
		edge3Tanh: scoreEdge3Tanh,
		edge5Tanh: scoreEdge5Tanh,
		sobelTanh: scoreSobelTanh,
	};
	if (images) {
		result.images = {
			edge3: intBufferGrayFromTensor(edge3, 8),
			edge5: intBufferGrayFromTensor(edge5, 24),
			sobx: intBufferGrayFromTensor(sobx, 4),
			soby: intBufferGrayFromTensor(soby, 4),
			edge3Tanh: intBufferGrayFromTensor(edge3Tanh),
			edge5Tanh: intBufferGrayFromTensor(edge5Tanh),
			sobxTanh: intBufferGrayFromTensor(sobxTanh),
			sobyTanh: intBufferGrayFromTensor(sobyTanh),
			lowpass: intBufferGrayFromTensor(lowpass),
			lpcenter: intBufferGrayFromTensor(lpcenter, 0.5),
			highpass: intBufferGrayFromTensor(highpass, 0.5),
			hpcenter: intBufferGrayFromTensor(hpcenter, 0.5),
		};
	}
	return result;
};

export const analyzeFeaturesSequence = async (
	frames: AsyncIterable<IntBuffer>,
	opts?: Partial<FeatureAnalysisOpts>
) => {
	const results: FeatureAnalysisResult[] = [];
	for await (const img of frames) {
		results.push(analyzeFeatures(img, opts));
	}
	return results;
};

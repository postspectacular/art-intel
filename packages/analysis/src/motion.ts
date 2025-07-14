import { absDiff, clamp } from "@thi.ng/math";
import type { IntBuffer } from "@thi.ng/pixel";
import { OpticalFlow, type OpticalFlowOpts } from "@thi.ng/pixel-flow";
import { asTensor, integrate, Tensor3 } from "@thi.ng/tensors";
import {
	minMax,
	range2d,
	reduce,
	repeatedly,
	scan,
	step,
} from "@thi.ng/transducers";
import {
	divN2,
	divNI2,
	heading,
	mag2,
	mean,
	vmean,
	type Vec,
} from "@thi.ng/vectors";

export interface MotionAnalysisOpts {
	/**
	 * Custom optical flow options.
	 * See: https://docs.thi.ng/umbrella/pixel-flow/interfaces/OpticalFlowOpts.html
	 */
	flow: Partial<OpticalFlowOpts>;
	/**
	 * Number of sub-regions to compute (per axis)
	 *
	 * @default 6
	 */
	regions: number;
}

/**
 * Return type of {@link analyzeMotion}.
 */
export interface MotionAnalysisResult {
	/**
	 * Array of mean flow angles (in radians) for entire frames. Values are
	 * smoothed/interpolated using {@link OpticalFlowOpts.smooth}.
	 */
	angle: number[];
	/**
	 * Array of mean flow vectors for entire frames. Values are
	 * smoothed/interpolated using {@link OpticalFlowOpts.smooth}.
	 */
	dir: Vec[];
	/**
	 * Array of frame deltas, i.e. noramlized mean difference between
	 * consecutive frames.
	 */
	delta: number[];

	/**
	 * Array of mean flow vector magnitudes, i.e. the lengths of vectors stored
	 * in {@link MotionAnalysisResult.dir}.
	 */
	flow: number[];
	/**
	 * Per-region analysis results. Number of regions can be configured via
	 * {@link MotionAnalysisOpts.regions}.
	 */
	regions: {
		dir: Vec[][];
		flow: number[][];
		minMaxFlow: [number, number][];
	};
	/**
	 * Aggregated metrics for the entire analyzed image sequence (rather than
	 * per frame).
	 */
	temporal: {
		/**
		 * Aggregated mean flow angle
		 */
		angle: number;
		/**
		 * Aggregated mean flow vector.
		 */
		dir: Vec;
		/**
		 * Aggregated mean flow magnitude
		 */
		flow: number;
		/**
		 * Aggregated mean frame delta
		 */
		delta: number;
		/**
		 * Tuple of `[min,max]` frame deltas (i.e. lower/upper bounds of
		 * {@link MotionAnalysisResult.delta})
		 */
		minMaxDelta: [number, number];
		/**
		 * Tuple of `[min,max]` flow magnitudes (i.e. lower/upper bounds of
		 * {@link MotionAnalysisResult.flow})
		 */
		minMaxFlow: [number, number];
	};
}

/**
 * Performs optical flow analysis on given image sequence (grayscale int pixel
 * buffers), using provided options.
 *
 * @remarks
 * The image sequence can be obtained via {@link imageSequenceIntGray}. Using
 * async iterables for obtaining images/frames, the implementation ensures only
 * two consecutive frames need to be kept in memory.
 *
 * @param frames
 * @param opts
 */
export const analyzeMotion = async (
	frames: AsyncIterableIterator<IntBuffer>,
	opts?: Partial<MotionAnalysisOpts>
): Promise<MotionAnalysisResult> => {
	const iter = frames[Symbol.asyncIterator]();
	const first: IntBuffer = (await iter.next()).value;
	const flow = new OpticalFlow(first, {
		smooth: 0.25,
		windowSize: 3,
		windowStep: 1,
		...opts?.flow,
	});
	const meanDir: Vec[] = [];
	const meanAngle: number[] = [];
	const meanFlow: number[] = [];
	const meanDelta: number[] = [];
	const regionRes = opts?.regions ?? 6;
	const regionDirs: Vec[][] = [];
	const regionFlow: number[][] = [];
	// step-wise transducers to compute min/max flow per region
	const minMaxRegionFlow = [
		...repeatedly(() => step(scan(minMax())), regionRes * regionRes),
	];
	for await (const frame of iter) {
		const deltaImg = deltaFrame(flow.prev, frame);
		const result = flow.update(frame);
		meanFlow.push(mag2(result.dir));
		meanDir.push(result.dir);
		meanAngle.push(heading(result.dir));
		meanDelta.push(vmean(deltaImg.data) / 255);
		const regions = computeRegionFlow(asTensor(result), regionRes);
		regionDirs.push(regions.directions);
		regionFlow.push(regions.energy);
		for (let i = 0; i < minMaxRegionFlow.length; i++) {
			minMaxRegionFlow[i](regions.energy[i]);
		}
	}
	return {
		angle: meanAngle,
		dir: meanDir,
		delta: meanDelta,
		flow: meanFlow,
		regions: {
			dir: regionDirs,
			flow: regionFlow,
			minMaxFlow: minMaxRegionFlow.map(
				(region) => <[number, number]>region.deref()
			),
		},
		temporal: {
			angle: vmean(meanAngle),
			dir: mean([], meanDir),
			flow: vmean(meanFlow),
			delta: vmean(meanDelta),
			minMaxDelta: reduce(minMax(), meanDelta),
			minMaxFlow: reduce(minMax(), meanFlow),
		},
	};
};

/**
 * Computes absolute difference between `prev` and `curr` frames, amplified by
 * `amp` (default: 1). Returns new pixel buffer with result.
 *
 * @remarks
 * The function expects pixel buffers in GRAY8 pixel format.
 *
 * @param prev
 * @param curr
 * @param amp
 */
export const deltaFrame = (
	{ data: adata }: IntBuffer,
	curr: IntBuffer,
	amp = 1
) => {
	const diff = curr.empty();
	const { data: bdata } = curr;
	const { data: dest } = diff;
	for (let i = 0, n = bdata.length; i < n; i++) {
		dest[i] = clamp(absDiff(adata[i], bdata[i]) * amp, 0, 255);
	}
	return diff;
};

/**
 * Computes mean flow vectors and their magnitudes for `res x res` sub-regions
 * of the given flow tensor (obtained from {@link OpticalFlow}).
 *
 * @param flowTensor
 * @param res
 */
export const computeRegionFlow = (flowTensor: Tensor3, res: number) => {
	const [regionH, regionW] = divNI2([], flowTensor.shape, res);
	const regionSize = regionW * regionH;
	const directions: Vec[] = [];
	const energy: number[] = [];
	for (let [x, y] of range2d(res, res)) {
		const region = flowTensor.crop(
			[y * regionH, x * regionW, 0],
			[regionH, regionW, 2]
		);
		const dir = divN2([], <Vec>integrate(null, region).data, regionSize);
		directions.push(dir);
		energy.push(mag2(dir));
	}
	return { directions, energy };
};

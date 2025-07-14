import { withoutKeysObj } from "@thi.ng/object-utils";
import type { FloatBuffer, IntBuffer } from "@thi.ng/pixel";
import {
	analyzeColors as $analyze,
	type AnalyzedImage,
} from "@thi.ng/pixel-analysis";
import {
	dominantColorsKmeans,
	dominantColorsMeanCut,
	dominantColorsMedianCut,
} from "@thi.ng/pixel-dominant-colors";
import { SFC32, type IRandom } from "@thi.ng/random";

export interface ColorAnalysisOpts {
	/**
	 * Max. number of dominant colors.
	 *
	 * @defaultValue 4
	 */
	numColors: number;
	/**
	 * Dominant color extraction mode
	 *
	 * @defaultValue "kmeans"
	 */
	mode: "kmeans" | "mean" | "median";
	/**
	 * Max. image size (longest side) in pixels
	 *
	 * @defaultValue 128
	 */
	size: number;
	/**
	 * Min. saturation to consider for computing {@link warmIntensity}.
	 *
	 * @defaultValue 0.25
	 */
	minSat: number;
	/**
	 * Only used if `mode = kmeans`. PRNG used for initial centroid computation.
	 * By default uses a fixed seeded instance for reproducible results.
	 */
	rnd: IRandom;
	/**
	 * Only used if `mode = kmeans`. The `exponent` is applied to scale the
	 * distances to nearest centroid, which will be used to control the weight
	 * distribution for choosing next centroid. A higher exponent means that
	 * points with larger distances will be more prioritized in the random
	 * selection.
	 *
	 * @defaultValue 2
	 */
	exponent: number;
}

export type ColorAnalysisResult = Omit<
	AnalyzedImage,
	"img" | "imgGray" | "imgHsv"
>;

const MODES = {
	kmeans: dominantColorsKmeans,
	mean: dominantColorsMeanCut,
	median: dominantColorsMedianCut,
};

/**
 * Performs comprehensive color analysis on given image and using provided
 * options.
 *
 * @param img
 * @param opts
 */
export const analyzeColors = (
	img: IntBuffer | FloatBuffer,
	opts?: Partial<ColorAnalysisOpts>
) => {
	const result = $analyze(img, {
		dominantFn: MODES[opts?.mode ?? "kmeans"],
		numColors: 4,
		minSat: 0.25,
		rnd: new SFC32([0xdecafbad, 0x2fa9d75b, 0xe41f67e3, 0x5c83ec1a]),
		exponent: 4,
		size: 128,
		...opts,
	});
	return <ColorAnalysisResult>(
		withoutKeysObj(result, ["img", "imgGray", "imgHsv"])
	);
};

export const analyzeColorsSequence = async (
	frames: AsyncIterable<IntBuffer | FloatBuffer>,
	opts: Partial<ColorAnalysisOpts>
) => {
	const results: ColorAnalysisResult[] = [];
	for await (const img of frames) {
		results.push(analyzeColors(img, opts));
	}
	// TODO migrate result aggregation
	return results;
};

import { atan2Abs } from "@thi.ng/math";
import type { FloatBuffer, IntBuffer } from "@thi.ng/pixel";
import { OpticalFlow } from "@thi.ng/pixel-flow";
import { mag2, max2, MAX2, mean, min2, MIN2, type Vec } from "@thi.ng/vectors";

export const analyzeMotion = (frames: (IntBuffer | FloatBuffer)[]) => {
	const flow = new OpticalFlow(frames[0], { smooth: 0.25 });
	const numFrames = frames.length;
	const vectors: Vec[] = [];
	const min: Vec = [...MAX2];
	const max: Vec = [...MIN2];
	let maxEnergy = 0;
	let totalEnergy = 0;
	for (let i = 1; i < numFrames; i++) {
		const { dir } = flow.update(frames[i]);
		vectors.push(dir);
		const energy = mag2(dir);
		totalEnergy += energy;
		maxEnergy = Math.max(maxEnergy, energy);
		min2(null, min, dir);
		max2(null, max, dir);
	}
	const avg = mean([], vectors);
	return {
		vectors,
		totalEnergy,
		maxEnergy,
		meanEnergy: totalEnergy / vectors.length,
		min,
		max,
		mean: avg,
		minAngle: atan2Abs(min[1], min[0]),
		maxAngle: atan2Abs(max[1], max[0]),
		meanAngle: atan2Abs(avg[1], avg[0]),
	};
};

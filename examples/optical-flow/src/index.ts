// SPDX-License-Identifier: Apache-2.0
import { timedResult } from "@thi.ng/bench";
import {
	adaptDPI,
	adaptiveCanvas2d,
	pixelCanvas2d,
	type CanvasContext,
} from "@thi.ng/canvas";
import { compareByKey } from "@thi.ng/compare";
import { div, inputFile, main } from "@thi.ng/hiccup-html";
import { GRAY8, imageFromFile, IntBuffer, intBuffer } from "@thi.ng/pixel";
import { OpticalFlow } from "@thi.ng/pixel-flow";
import { $compile, $wrapEl } from "@thi.ng/rdom";
import { asTensor, integrate } from "@thi.ng/tensors";
import { range2d, step, type StepFn } from "@thi.ng/transducers";
import { donchian } from "@thi.ng/transducers-stats";
import {
	headingXY,
	mag2,
	magSq2,
	normalize2,
	perpendicularCCW,
	setC2,
} from "@thi.ng/vectors";

const W = 640;
const H = W;
const DPR = window.devicePixelRatio || 1;

const FPS = 15;

class OpticalFlowViz {
	video!: HTMLVideoElement | HTMLImageElement;
	flow!: OpticalFlow<IntBuffer>;
	flowCanvas: CanvasContext;
	diffCanvas: CanvasContext;
	frameCanvas!: CanvasContext;
	frameBuffer!: IntBuffer;
	prevFrame!: IntBuffer;
	diffFrame!: IntBuffer;
	scale!: number;
	movement: StepFn<number, [number, number]>;
	diff: StepFn<number, [number, number]>;

	movSamples: number[] = [];
	diffSamples: number[] = [];

	constructor() {
		this.flowCanvas = adaptiveCanvas2d(1, 1);
		this.diffCanvas = pixelCanvas2d(1, 1);
		// step-wise transducer to record min/max movement in a sliding time window
		this.movement = step(donchian(30));
		this.diff = step(donchian(30));
	}

	start(width: number, height: number, scale = 1) {
		const vw = (this.video.width = (width / scale) | 0);
		const vh = (this.video.height = (height / scale) | 0);
		this.scale = scale;
		this.frameBuffer = intBuffer(vw, vh, GRAY8);
		this.prevFrame = intBuffer(vw, vh, GRAY8);
		this.diffFrame = intBuffer(vw, vh, GRAY8);
		this.frameCanvas = pixelCanvas2d(vw, vh, null, {
			ctx: { willReadFrequently: true },
		});
		this.flow = new OpticalFlow(this.grabFrame(), {
			smooth: 0.25,
			threshold: 0.001,
			windowSize: 3,
			windowStep: 1,
			mode: "max",
		});
		adaptDPI(this.flowCanvas.canvas, vw, vh);
		adaptDPI(this.diffCanvas.canvas, vw, vh, 1);
		this.flowCanvas.ctx.scale(DPR, DPR);
		this.updateFlow();
	}

	updateFlow() {
		const t0 = performance.now();
		const currFrame = this.grabFrame();
		// const currFrame = convolveImage(this.grabFrame().as(FLOAT_GRAY), {
		// 	kernel: BOX_BLUR3,
		// }).as(GRAY8);
		const currData = currFrame.data;
		const prevData = this.flow.prev.data;
		const diffData = this.diffFrame.data;
		let totalDiff = 0;
		for (let i = 0; i < currData.length; i++) {
			const d = Math.abs(currData[i] - prevData[i]);
			totalDiff += d / 255;
			diffData[i] = Math.min(d << 2, 255);
		}
		const minmaxDiff = this.diff(totalDiff / currData.length);
		this.diffFrame.blitCanvas(this.diffCanvas.canvas);
		// this.diffFrame.scale(DPR).blitCanvas(this.flowCanvas.canvas);
		const [result, t] = timedResult(() => this.flow.update(currFrame));
		currFrame.scale(DPR).blitCanvas(this.flowCanvas.canvas);
		const ctx = this.flowCanvas.ctx;
		ctx.lineWidth = 1 / this.scale;
		ctx.font = `12px Menlo`;
		const {
			data,
			shape: [fh, fw],
			dir,
		} = result;
		const { step, margin } = this.flow;
		const cell = [0, 0];
		for (let y = 0, i = 0; y < fh; y++) {
			for (let x = 0; x < fw; x++, i += 2) {
				setC2(cell, data[i], data[i + 1]);
				if (magSq2(cell) < 0.001) continue;
				ctx.strokeStyle = `hsl(${headingXY(cell).toFixed(
					2
				)}rad, 100%, 50%)`;
				this.drawTriangle(
					ctx,
					cell,
					x,
					y,
					this.flow.step,
					this.flow.margin,
					48,
					2
				);
				ctx.stroke();
			}
		}

		ctx.strokeStyle = "#000";

		const flowTensor = asTensor(result);
		for (let RES of [6]) {
			for (let [x, y] of range2d(RES, RES)) {
				const rw = ~~(fw / RES);
				const rh = ~~(fh / RES);
				const region = flowTensor
					.lo([y * rh, x * rw, 0])
					.hi([rh, rw, 2]);
				const delta = <number[]>integrate(null, region).data;
				this.drawTriangle(
					ctx,
					delta,
					(x + 0.5) * rw,
					(y + 0.5) * rh,
					step,
					margin,
					1,
					4
				);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
				ctx.strokeRect(
					x * rw * step + margin,
					y * rh * step + margin,
					rw * step,
					rh * step
				);
			}
		}

		// compute overall movement
		const delta = mag2(dir);
		// update min/max
		const minmaxMovement = this.movement(delta);
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, 192, 48);
		ctx.fillStyle = "#fff";
		// ctx.fillText(`movement: ${delta.toFixed(2)} t: ${~~t}`, 8, 16);
		ctx.fillText(`movement: ${delta.toFixed(2)}`, 8, 16);
		if (minmaxMovement) {
			const [min, max] = <number[]>minmaxMovement;
			ctx.fillText(
				`min: ${min.toFixed(2)} max: ${max.toFixed(2)}`,
				8,
				28
			);
		}
		if (minmaxDiff) {
			const [min, max] = <number[]>minmaxDiff;
			ctx.fillText(
				`min: ${min.toFixed(2)} max: ${max.toFixed(2)}`,
				8,
				40
			);
		}
		// draw mean movment vector
		this.drawTriangle(
			ctx,
			dir,
			fw / 2,
			fh / 2,
			this.flow.step,
			this.flow.margin,
			600,
			8
		);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		setTimeout(
			() => this.updateFlow(),
			Math.max(1000 / FPS - (performance.now() - t0), 0)
		);
	}

	createVideo() {
		this.video = document.createElement("video");
		this.video.muted = true;
		this.video.loop = true;
		this.video.controls = true;
		return this.video;
	}

	grabFrame() {
		const { width, height } = this.video;
		this.frameCanvas.ctx.drawImage(this.video, 0, 0, width, height);
		return this.frameBuffer.setImageData(
			this.frameCanvas.ctx.getImageData(0, 0, width, height)
		);
	}

	drawTriangle(
		ctx: CanvasRenderingContext2D,
		dir: number[],
		x: number,
		y: number,
		step: number,
		margin: number,
		amp: number,
		nscale: number
	) {
		const sx = x * step + margin;
		const sy = y * step + margin;
		const [dx, dy] = dir;
		const [nx, ny] = normalize2(null, perpendicularCCW([], dir), nscale);
		ctx.beginPath();
		ctx.moveTo(sx + nx, sy + ny);
		ctx.lineTo(sx + dx * amp, sy + dy * amp);
		ctx.lineTo(sx - nx, sy - ny);
	}
}

const startVideoFile = (e: InputEvent) => {
	const file = (<HTMLInputElement>e.target).files![0];
	console.log(file.name);
	const source = document.createElement("source");
	source.src = URL.createObjectURL(file);
	const video = APP.createVideo();
	video.appendChild(source);
	video.load();
	video.play();
	video.addEventListener("loadedmetadata", () => {
		const width = video.videoWidth;
		const height = video.videoHeight;
		APP.start(width, height, calcImageScale(width, height));
		document.getElementById("panels")!.appendChild(video);
	});
	document.getElementById("inputs")?.remove();
};

const startImageSequence = async (e: InputEvent) => {
	const files = [...(<HTMLInputElement>e.target).files!].sort(
		compareByKey("name")
	);
	const frames = await Promise.all(files.map((x) => imageFromFile(x)));
	let i = -1;
	setInterval(() => {
		if (i != -1) document.getElementById("panels")!.removeChild(frames[i]);
		i = (i + 1) % frames.length;
		document.getElementById("panels")!.appendChild(frames[i]);
		APP.video = frames[i];
	}, 1000 / FPS);
	const width = frames[0].width;
	const height = frames[0].height;
	const scale = calcImageScale(width, height);
	APP.video = frames[0];
	APP.start(width, height, scale);
	document.getElementById("inputs")?.remove();
};

const calcImageScale = (width: number, height: number) => {
	let scale = 1;
	while (width / scale > W || height / scale > H) scale *= 2;
	return scale;
};

const APP = new OpticalFlowViz();

$compile(
	div(
		{},
		div(
			"#inputs",
			{},
			inputFile({ onchange: startVideoFile, accept: "video/*" }),
			inputFile({
				onchange: startImageSequence,
				accept: "image/png",
				multiple: true,
			})
		),
		main(
			"#panels",
			{},
			$wrapEl(APP.flowCanvas.canvas),
			$wrapEl(APP.diffCanvas.canvas)
		)
	)
).mount(document.getElementById("app")!);
